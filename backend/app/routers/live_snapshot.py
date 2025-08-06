"""
라이브 세션 현황 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_auth
from app.models.teacher import Teacher
from app.models.session_run import SessionRun, RunStatus
from app.models.live_snapshot import LiveSnapshotResponse, RecentLogsResponse
from app.services.live_snapshot_service import LiveSnapshotService

router = APIRouter()


def verify_run_owner(run_id: int, teacher: Teacher, db: Session) -> SessionRun:
    """
    세션 소유권 확인
    
    Args:
        run_id: 세션 ID
        teacher: 현재 교사
        db: 데이터베이스 세션
        
    Returns:
        SessionRun 객체
        
    Raises:
        HTTPException: 세션이 없거나 권한이 없는 경우
    """
    # 세션 조회
    session_run = db.query(SessionRun).filter(SessionRun.id == run_id).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    # 세션 템플릿을 통한 소유권 확인
    if session_run.template.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="이 세션에 대한 권한이 없습니다.")
    
    return session_run


@router.get("/runs/{run_id}/live-snapshot", response_model=LiveSnapshotResponse)
async def get_live_snapshot(
    run_id: int,
    window_sec: int = Query(default=300, ge=60, le=3600, description="활성 기준 시간(초)"),
    response: Response = None,
    teacher: Teacher = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    세션의 라이브 현황 스냅샷을 조회합니다.
    
    - **run_id**: 세션 ID
    - **window_sec**: 활성 사용자 기준 시간 (60-3600초, 기본 300초)
    
    권한: 세션을 소유한 교사만 접근 가능
    """
    # 세션 소유권 확인
    session_run = verify_run_owner(run_id, teacher, db)
    
    # ENDED 상태 체크
    if session_run.status == RunStatus.ENDED:
        raise HTTPException(status_code=410, detail="종료된 세션입니다.")
    
    # 캐시 방지 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # 스냅샷 서비스 호출
    service = LiveSnapshotService(db)
    snapshot = service.get_run_live_snapshot(run_id, window_sec)
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="세션 현황을 조회할 수 없습니다.")
    
    return snapshot


@router.get("/runs/{run_id}/recent-logs", response_model=RecentLogsResponse)
async def get_recent_logs(
    run_id: int,
    limit: int = Query(default=50, ge=1, le=200, description="조회할 로그 수"),
    response: Response = None,
    teacher: Teacher = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    세션의 최근 활동 로그를 조회합니다.
    
    - **run_id**: 세션 ID
    - **limit**: 조회할 로그 수 (1-200, 기본 50)
    
    권한: 세션을 소유한 교사만 접근 가능
    """
    # 세션 소유권 확인
    session_run = verify_run_owner(run_id, teacher, db)
    
    # ENDED 상태 체크
    if session_run.status == RunStatus.ENDED:
        raise HTTPException(status_code=410, detail="종료된 세션입니다.")
    
    # 캐시 방지 헤더 설정
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # 최근 로그 서비스 호출
    service = LiveSnapshotService(db)
    logs = service.get_recent_logs(run_id, limit)
    
    if logs is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    return {
        "run_id": run_id,
        "logs": logs
    }