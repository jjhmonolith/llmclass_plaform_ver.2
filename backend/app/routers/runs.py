"""
Session Runs API Router - 세션 실행 관리
"""
import random
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.config import settings
from app.models import SessionRun, RunStatus, JoinCode, Teacher, SessionTemplate, ActivityLog, Enrollment
from app.routers.auth import get_current_teacher
from pydantic import BaseModel

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter(tags=["runs"])


# Request/Response Models
class RunCreateRequest(BaseModel):
    template_id: int
    name: str


class RunResponse(BaseModel):
    id: int
    template_id: int
    name: str
    status: str
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    created_at: str
    template_title: str


class CodeResponse(BaseModel):
    code: str


class RunListResponse(BaseModel):
    runs: List[RunResponse]
    total: int
    page: int
    size: int


# 유틸리티 함수들
def generate_join_code() -> str:
    """6자리 참여 코드 생성"""
    alphabet = settings.join_code_alphabet
    return ''.join(random.choices(alphabet, k=settings.code_length))


def create_unique_join_code(db: Session, run_id: int, max_retries: int = 10) -> str:
    """유일한 참여 코드 생성 (충돌 시 재시도)"""
    for attempt in range(max_retries):
        code = generate_join_code()
        
        # 현재 활성 상태인 코드 중에서 중복 검사
        existing = db.query(JoinCode).filter(
            JoinCode.code == code,
            JoinCode.is_active == True
        ).first()
        
        if not existing:
            # 유일한 코드 생성됨
            join_code = JoinCode(
                run_id=run_id,
                code=code,
                is_active=True
            )
            db.add(join_code)
            db.commit()
            db.refresh(join_code)
            
            logger.info(f"Generated unique join code: {code} for run {run_id}")
            return code
        
        logger.warning(f"Code collision detected: {code}, retrying... (attempt {attempt + 1}/{max_retries})")
    
    # 최대 재시도 횟수 초과
    logger.error(f"Failed to generate unique code after {max_retries} attempts for run {run_id}")
    raise HTTPException(
        status_code=500, 
        detail="코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
    )


# API 엔드포인트들
@router.post("/", response_model=RunResponse)
def create_run(
    request: RunCreateRequest,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """새 세션 실행 생성 (READY 상태)"""
    
    # 템플릿 존재 및 소유권 확인
    template = db.query(SessionTemplate).filter(
        SessionTemplate.id == request.template_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    
    # 세션 실행 생성
    session_run = SessionRun(
        template_id=template.id,
        name=request.name,
        status=RunStatus.READY,
        settings_snapshot_json=template.settings_json  # 템플릿 설정 스냅샷 저장
    )
    
    db.add(session_run)
    db.commit()
    db.refresh(session_run)
    
    logger.info(f"Created new session run {session_run.id} from template {template.id}")
    
    return RunResponse(
        id=session_run.id,
        template_id=session_run.template_id,
        name=session_run.name,
        status=session_run.status.value,
        started_at=session_run.started_at.isoformat() if session_run.started_at else None,
        ended_at=session_run.ended_at.isoformat() if session_run.ended_at else None,
        created_at=session_run.created_at.isoformat(),
        template_title=template.title
    )


@router.post("/{run_id}/start")
def start_run(
    run_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션 시작 (READY → LIVE, 코드 발급)"""
    
    # 세션 실행 조회 및 소유권 확인
    session_run = db.query(SessionRun).join(SessionTemplate).filter(
        SessionRun.id == run_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 상태 확인 (READY만 시작 가능)
    if session_run.status != RunStatus.READY:
        if session_run.status == RunStatus.LIVE:
            raise HTTPException(status_code=409, detail="이미 진행 중인 세션입니다.")
        else:  # ENDED
            raise HTTPException(status_code=409, detail="종료된 세션은 다시 시작할 수 없습니다.")
    
    # 상태를 LIVE로 변경
    session_run.status = RunStatus.LIVE
    session_run.started_at = func.now()
    
    db.commit()
    db.refresh(session_run)
    
    # 참여 코드 생성
    code = create_unique_join_code(db, run_id)
    
    logger.info(f"Started session run {run_id}, assigned code: {code}")
    
    return {"ok": True, "message": "세션이 시작되었습니다.", "code": code}


@router.get("/{run_id}/code", response_model=CodeResponse)
def get_run_code(
    run_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션 참여 코드 조회 (교사용)"""
    
    # 세션 실행 조회 및 소유권 확인
    session_run = db.query(SessionRun).join(SessionTemplate).filter(
        SessionRun.id == run_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # LIVE 상태인지 확인
    if session_run.status != RunStatus.LIVE:
        raise HTTPException(status_code=400, detail="진행 중인 세션만 코드를 조회할 수 있습니다.")
    
    # 활성 코드 조회
    join_code = db.query(JoinCode).filter(
        JoinCode.run_id == run_id,
        JoinCode.is_active == True
    ).first()
    
    if not join_code:
        raise HTTPException(status_code=404, detail="활성 코드를 찾을 수 없습니다.")
    
    return CodeResponse(code=join_code.code)


class RunEndResponse(BaseModel):
    run_id: int
    status: str
    ended_at: str


@router.post("/{run_id}/end", response_model=RunEndResponse)
def end_run(
    run_id: int,
    response: Response,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션 종료 (LIVE → ENDED, 코드 비활성화) - 멱등성 보장"""
    
    # Cache-Control 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # 세션 실행 조회 및 소유권 확인
    session_run = db.query(SessionRun).join(SessionTemplate).filter(
        SessionRun.id == run_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 멱등성 보장: 이미 ENDED 상태면 그대로 200 반환
    if session_run.status == RunStatus.ENDED:
        logger.info(f"Session run {run_id} already ended - idempotent response")
        return RunEndResponse(
            run_id=run_id,
            status=session_run.status.value,
            ended_at=session_run.ended_at.isoformat()
        )
    
    # READY 상태는 종료할 수 없음
    if session_run.status == RunStatus.READY:
        raise HTTPException(status_code=400, detail="시작되지 않은 세션은 종료할 수 없습니다.")
    
    # LIVE → ENDED 전환
    session_run.status = RunStatus.ENDED
    session_run.ended_at = func.now()
    
    # 해당 세션의 모든 코드 비활성화
    db.query(JoinCode).filter(
        JoinCode.run_id == run_id,
        JoinCode.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    db.refresh(session_run)
    
    # 이벤트 로그
    logger.info({
        "event": "run_end",
        "run_id": run_id,
        "teacher_id": current_teacher.id,
        "ended_at": session_run.ended_at.isoformat()
    })
    
    return RunEndResponse(
        run_id=run_id,
        status=session_run.status.value,
        ended_at=session_run.ended_at.isoformat()
    )


@router.get("/", response_model=RunListResponse)
def list_runs(
    template_id: Optional[int] = Query(None, description="특정 템플릿의 세션만 필터링"),
    status: Optional[str] = Query(None, description="필터링할 상태 (READY, LIVE, ENDED)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션 실행 목록 조회 (페이지네이션)"""
    
    # 기본 쿼리 (소유한 세션만)
    query = db.query(SessionRun).join(SessionTemplate).filter(
        SessionTemplate.teacher_id == current_teacher.id
    )
    
    # 템플릿 필터링
    if template_id is not None:
        query = query.filter(SessionRun.template_id == template_id)
    
    # 상태 필터링
    if status:
        try:
            status_enum = RunStatus(status.upper())
            query = query.filter(SessionRun.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="유효하지 않은 상태값입니다.")
    
    # 전체 개수
    total = query.count()
    
    # 페이지네이션
    offset = (page - 1) * size
    runs = query.order_by(SessionRun.created_at.desc()).offset(offset).limit(size).all()
    
    # 응답 변환
    run_responses = []
    for run in runs:
        run_responses.append(RunResponse(
            id=run.id,
            template_id=run.template_id,
            name=run.name,
            status=run.status.value,
            started_at=run.started_at.isoformat() if run.started_at else None,
            ended_at=run.ended_at.isoformat() if run.ended_at else None,
            created_at=run.created_at.isoformat(),
            template_title=run.template.title
        ))
    
    return RunListResponse(
        runs=run_responses,
        total=total,
        page=page,
        size=size,
        has_next=total > page * size
    )


@router.get("/{run_id}/statistics")
def get_run_statistics(
    run_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션 통계 정보 조회"""
    
    # 세션 소유권 확인
    session_run = db.query(SessionRun).join(SessionTemplate).filter(
        SessionRun.id == run_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 참여 학생 수
    student_count = db.query(Enrollment).filter(Enrollment.run_id == run_id).count()
    
    # 총 대화 턴 수 (학생 응답 기준)
    total_turns = db.query(ActivityLog).filter(
        ActivityLog.run_id == run_id,
        ActivityLog.student_input.isnot(None),
        ActivityLog.student_input != ''
    ).count()
    
    # 학생별 턴 수
    student_turns = db.query(
        ActivityLog.student_name,
        func.count(ActivityLog.id).label('turn_count')
    ).filter(
        ActivityLog.run_id == run_id,
        ActivityLog.student_input.isnot(None),
        ActivityLog.student_input != ''
    ).group_by(ActivityLog.student_name).all()
    
    # 최신 활동 시간
    latest_activity = db.query(ActivityLog.created_at).filter(
        ActivityLog.run_id == run_id
    ).order_by(ActivityLog.created_at.desc()).first()
    
    return {
        "run_id": run_id,
        "student_count": student_count,
        "total_turns": total_turns,
        "student_turns": [
            {
                "student_name": name,
                "turn_count": count
            } for name, count in student_turns
        ],
        "latest_activity": latest_activity[0].isoformat() if latest_activity else None
    }


@router.get("/{run_id}/activity-logs")
def get_run_activity_logs(
    run_id: int,
    student_name: Optional[str] = Query(None, description="특정 학생의 로그만 필터링"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """세션의 활동 로그 조회"""
    
    # 세션 소유권 확인
    session_run = db.query(SessionRun).join(SessionTemplate).filter(
        SessionRun.id == run_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 쿼리 구성
    query = db.query(ActivityLog).filter(ActivityLog.run_id == run_id)
    
    if student_name:
        query = query.filter(ActivityLog.student_name == student_name)
    
    # 전체 개수
    total = query.count()
    
    # 페이지네이션
    offset = (page - 1) * size
    logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(size).all()
    
    # 응답 변환
    log_responses = []
    for log in logs:
        log_responses.append({
            "id": log.id,
            "student_name": log.student_name,
            "activity_key": log.activity_key,
            "turn_index": log.turn_index,
            "student_input": log.student_input,
            "ai_output": log.ai_output,
            "third_eval_json": log.third_eval_json,
            "created_at": log.created_at.isoformat()
        })
    
    return {
        "logs": log_responses,
        "total": total,
        "page": page,
        "size": size,
        "has_next": total > page * size
    }