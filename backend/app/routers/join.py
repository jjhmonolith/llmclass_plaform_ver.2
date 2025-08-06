"""
Student Join API Router - 학생 세션 참여
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from app.core.database import get_db
from app.core.config import settings
from app.core.guards import assert_run_live
from app.models import SessionRun, RunStatus, JoinCode, Enrollment
from app.utils.pin_utils import (
    generate_rejoin_pin, 
    hash_pin, 
    verify_pin, 
    create_pin_hint,
    normalize_student_name,
    validate_student_name
)
from app.utils.activity_token import generate_activity_token
from pydantic import BaseModel

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter(tags=["join"])


# Request/Response Models
class JoinRequest(BaseModel):
    code: str
    student_name: str
    rejoin_pin: Optional[str] = None  # 재참여시에만 제공


class JoinResponse(BaseModel):
    ok: bool
    run_id: int
    student_name: str
    rejoin_pin: Optional[str] = None  # 최초 입장시에만 제공
    activity_token: str  # 페이지 메모리용 활동 로그 토큰


# 유틸리티 함수들
def get_active_run_by_code(db: Session, code: str) -> Optional[SessionRun]:
    """활성 코드로 LIVE 상태의 Run 조회"""
    join_code = db.query(JoinCode).filter(
        JoinCode.code == code,
        JoinCode.is_active == True
    ).first()
    
    if not join_code:
        return None
    
    session_run = db.query(SessionRun).filter(
        SessionRun.id == join_code.run_id,
        SessionRun.status == RunStatus.LIVE
    ).first()
    
    return session_run


def check_run_capacity(db: Session, run_id: int) -> bool:
    """세션 수용 인원 확인"""
    current_count = db.query(Enrollment).filter(
        Enrollment.run_id == run_id
    ).count()
    
    logger.info(f"Run {run_id} capacity check: {current_count}/{settings.max_students_per_run}")
    return current_count < settings.max_students_per_run


# API 엔드포인트들
def get_client_ip(request: Request) -> str:
    """클라이언트 실제 IP 추출 (Cloudflare 고려)"""
    # Cloudflare 및 프록시 헤더 순서대로 확인
    for header in ["CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"]:
        ip = request.headers.get(header)
        if ip:
            return ip.split(',')[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/join", response_model=JoinResponse)
def join_session(
    request_data: JoinRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """학생 세션 참여 (통합 API - 최초 입장 및 재참여)"""
    
    # Cache-Control 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    client_ip = get_client_ip(request)
    
    # 입력 검증
    if not request_data.code or len(request_data.code) != settings.code_length:
        logger.warning(f"Invalid code format from IP {client_ip}: {len(request_data.code) if request_data.code else 0} chars")
        raise HTTPException(status_code=400, detail="올바른 코드를 입력해주세요.")
    
    is_valid, error_msg = validate_student_name(request_data.student_name)
    if not is_valid:
        logger.warning(f"Invalid student name from IP {client_ip}: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # 활성 세션 조회
    session_run = get_active_run_by_code(db, request_data.code)
    if not session_run:
        logger.warning(f"Invalid code from IP {client_ip}: {request_data.code}")
        raise HTTPException(status_code=404, detail="코드가 유효하지 않습니다.")
    
    # 세션 상태 검증 (가드 함수 사용)
    assert_run_live(db, session_run.id)
    
    # 정규화된 이름으로 기존 참여 확인
    normalized_name = normalize_student_name(request_data.student_name)
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.run_id == session_run.id,
        Enrollment.normalized_student_name == normalized_name
    ).first()
    
    if existing_enrollment:
        # 기존 사용자 - PIN 필요
        if not request_data.rejoin_pin:
            # PIN이 제공되지 않은 경우 - PIN 입력 요구
            raise HTTPException(
                status_code=409, 
                detail={
                    "error": "requires_pin",
                    "message": "재참여 PIN을 입력해주세요.",
                    "pin_format": f"숫자 {settings.rejoin_pin_length}자리"
                }
            )
        
        # PIN 검증
        if len(request_data.rejoin_pin) != settings.rejoin_pin_length:
            logger.warning(f"Invalid PIN length from IP {client_ip}: {len(request_data.rejoin_pin)} chars")
            raise HTTPException(status_code=400, detail="올바른 재참여 PIN을 입력해주세요.")
        
        if not verify_pin(request_data.rejoin_pin, existing_enrollment.rejoin_pin_hash):
            logger.warning(f"Failed PIN verification from IP {client_ip}: run_id={session_run.id}, name={normalized_name}")
            raise HTTPException(status_code=401, detail="재참여 PIN이 올바르지 않습니다.")
        
        # 재참여 성공 - last_seen_at 업데이트
        existing_enrollment.last_seen_at = func.now()
        db.commit()
        
        # 재참여용 activity_token 생성
        activity_token = generate_activity_token(
            run_id=session_run.id,
            enrollment_id=existing_enrollment.id,
            student_name=normalized_name
        )
        
        logger.info(f"Student rejoined: run_id={session_run.id}, name={normalized_name}, ip={client_ip}")
        
        return JoinResponse(
            ok=True,
            run_id=session_run.id,
            student_name=request_data.student_name,
            activity_token=activity_token
        )
    
    else:
        # 신규 사용자 - 수용 인원 확인
        if not check_run_capacity(db, session_run.id):
            logger.warning(f"Capacity exceeded from IP {client_ip}: run_id={session_run.id}")
            raise HTTPException(status_code=403, detail="세션 참여 인원이 가득찼습니다.")
        
        # 재참여 PIN 생성
        rejoin_pin = generate_rejoin_pin()
        pin_hash = hash_pin(rejoin_pin)
        
        # 새 참여 정보 생성
        try:
            enrollment = Enrollment(
                run_id=session_run.id,
                normalized_student_name=normalized_name,
                rejoin_pin_hash=pin_hash
            )
            db.add(enrollment)
            db.commit()
            db.refresh(enrollment)
            
            # 신규 가입용 activity_token 생성
            activity_token = generate_activity_token(
                run_id=session_run.id,
                enrollment_id=enrollment.id,
                student_name=normalized_name
            )
            
            logger.info(f"Student joined: run_id={session_run.id}, name={normalized_name}, pin_hint=**, ip={client_ip}")
            
            return JoinResponse(
                ok=True,
                run_id=session_run.id,
                student_name=request_data.student_name,  # 원본 이름 반환
                rejoin_pin=rejoin_pin,  # 최초 1회만 제공
                activity_token=activity_token
            )
            
        except IntegrityError:
            db.rollback()
            # 동시성 이슈로 인한 중복 이름 - PIN 입력 요구로 처리
            raise HTTPException(
                status_code=409, 
                detail={
                    "error": "requires_pin",
                    "message": "재참여 PIN을 입력해주세요.",
                    "pin_format": f"숫자 {settings.rejoin_pin_length}자리"
                }
            )