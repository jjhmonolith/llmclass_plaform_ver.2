"""
Activity Log API Router - 학생 활동 로그 저장
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.core.guards import assert_run_live
from app.models import SessionRun, RunStatus, Enrollment, ActivityLog, SessionTemplate
from app.utils.activity_token import verify_activity_token, extract_token_from_header

# 로깅 설정 - 민감값 제외
logger = logging.getLogger(__name__)

router = APIRouter(tags=["activity-log"])


# Request/Response Models
class ActivityLogRequest(BaseModel):
    activity_key: str  # e.g., "writing.step1"
    turn_index: int    # 해당 활동 내 턴 번호
    student_input: Optional[str] = None     # 학생 입력
    ai_output: Optional[str] = None         # AI 응답  
    third_eval_json: Optional[Dict[str, Any]] = None  # 제3 AI 평가


class ActivityLogResponse(BaseModel):
    ok: bool
    saved: Dict[str, Any]  # activity_key, turn_index 등


# 의존성: 토큰 인증
def get_current_student(request: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Bearer token으로 학생 인증 및 세션 상태 확인
    
    Returns:
        Dict with run_id, enrollment_id, student_name, enrollment object
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    token = extract_token_from_header(auth_header)
    
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    
    # Verify token
    payload = verify_activity_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 인증 토큰입니다.")
    
    run_id = payload["run_id"]
    enrollment_id = payload["enrollment_id"] 
    student_name = payload["student_name"]
    
    # 세션 상태 검증 (가드 함수 사용)
    assert_run_live(db, run_id)
    
    # Check if enrollment exists
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.run_id == run_id,
        Enrollment.normalized_student_name == student_name
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="참여 정보가 일치하지 않습니다.")
    
    return {
        "run_id": run_id,
        "enrollment_id": enrollment_id,
        "student_name": student_name,
        "enrollment": enrollment
    }


def get_client_ip(request: Request) -> str:
    """클라이언트 실제 IP 추출 (Cloudflare 고려)"""
    for header in ["CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"]:
        ip = request.headers.get(header)
        if ip:
            return ip.split(',')[0].strip()
    return request.client.host if request.client else "unknown"


# API 엔드포인트
@router.post("/activity-log", response_model=ActivityLogResponse)
def save_activity_log(
    log_data: ActivityLogRequest,
    request: Request,
    response: Response,
    current_student: Dict[str, Any] = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """학생 활동 로그 자동 저장 (인증: Bearer activity_token)"""
    
    # Cache-Control 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    client_ip = get_client_ip(request)
    run_id = current_student["run_id"]
    student_name = current_student["student_name"]
    
    # 입력 검증
    if not log_data.activity_key or not log_data.activity_key.strip():
        raise HTTPException(status_code=400, detail="활동 키가 필요합니다.")
    
    if log_data.turn_index < 0:
        raise HTTPException(status_code=400, detail="턴 인덱스는 0 이상이어야 합니다.")
    
    # 로그에는 민감값 길이만 기록
    input_len = len(log_data.student_input) if log_data.student_input else 0
    output_len = len(log_data.ai_output) if log_data.ai_output else 0
    eval_len = len(str(log_data.third_eval_json)) if log_data.third_eval_json else 0
    
    logger.info(f"Activity log save attempt: run_id={run_id}, student={student_name}, "
               f"activity={log_data.activity_key}, turn={log_data.turn_index}, "
               f"input_len={input_len}, output_len={output_len}, eval_len={eval_len}, ip={client_ip}")
    
    try:
        # 활동 로그 생성
        activity_log = ActivityLog(
            run_id=run_id,
            student_name=student_name,
            activity_key=log_data.activity_key.strip(),  
            turn_index=log_data.turn_index,
            student_input=log_data.student_input,
            ai_output=log_data.ai_output,
            third_eval_json=log_data.third_eval_json
        )
        
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        
        logger.info(f"Activity log saved: id={activity_log.id}, run_id={run_id}, "
                   f"student={student_name}, activity={log_data.activity_key}, turn={log_data.turn_index}")
        
        return ActivityLogResponse(
            ok=True,
            saved={
                "activity_key": log_data.activity_key,
                "turn_index": log_data.turn_index,
                "log_id": activity_log.id
            }
        )
        
    except IntegrityError as e:
        db.rollback()
        # 중복 키 위반 (같은 run_id, student_name, activity_key, turn_index)
        logger.warning(f"Duplicate activity log: run_id={run_id}, student={student_name}, "
                      f"activity={log_data.activity_key}, turn={log_data.turn_index}, ip={client_ip}")
        raise HTTPException(
            status_code=409, 
            detail="동일한 활동 턴이 이미 저장되어 있습니다."
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Activity log save error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="활동 로그 저장 중 오류가 발생했습니다.")


@router.get("/session/status")
def check_session_status(
    request: Request,
    response: Response,
    current_student: Dict[str, Any] = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """학생 세션 상태 확인 (가벼운 엔드포인트)"""
    
    # Cache-Control 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    run_id = current_student["run_id"]
    student_name = current_student["student_name"]
    
    return {
        "ok": True,
        "run_id": run_id,
        "student_name": student_name,
        "status": "active",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/session/info")
def get_session_info(
    request: Request,
    response: Response,
    current_student: Dict[str, Any] = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """학생 세션 및 템플릿 정보 조회"""
    
    # Cache-Control 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    run_id = current_student["run_id"]
    student_name = current_student["student_name"]
    
    # 세션 런 정보 조회
    session_run = db.query(SessionRun).filter(SessionRun.id == run_id).first()
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 템플릿 정보 조회
    template = db.query(SessionTemplate).filter(SessionTemplate.id == session_run.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    
    return {
        "ok": True,
        "run_id": run_id,
        "student_name": student_name,
        "session": {
            "id": session_run.id,
            "status": session_run.status.value,
            "started_at": session_run.started_at.isoformat() if session_run.started_at else None,
        },
        "template": {
            "id": template.id,
            "title": template.title,
            "mode_id": template.mode_id,
            "settings": template.settings_json
        },
        "timestamp": datetime.now().isoformat()
    }