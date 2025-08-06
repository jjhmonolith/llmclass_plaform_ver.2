"""
공용 가드 함수들 - 비즈니스 로직 검증
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import SessionRun, RunStatus


def assert_run_live(db: Session, run_id: int) -> None:
    """
    세션이 LIVE 상태인지 확인하는 가드 함수
    
    Args:
        db: 데이터베이스 세션
        run_id: 세션 ID
        
    Raises:
        HTTPException: 세션이 존재하지 않거나 LIVE 상태가 아닌 경우
    """
    session_run = db.query(SessionRun).filter(SessionRun.id == run_id).first()
    
    if not session_run:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    
    if session_run.status == RunStatus.ENDED:
        raise HTTPException(
            status_code=410, 
            detail={
                "error": {
                    "type": "run_ended",
                    "message": "세션이 종료되었습니다."
                }
            },
            headers={
                "Cache-Control": "no-store",
                "Pragma": "no-cache"
            }
        )
    
    if session_run.status == RunStatus.READY:
        raise HTTPException(
            status_code=400,
            detail="세션이 아직 시작되지 않았습니다."
        )