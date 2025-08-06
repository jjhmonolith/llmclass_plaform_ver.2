"""
FastAPI 의존성 함수들
"""
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from .database import get_db
from .session import SessionManager
from ..models.teacher import Teacher


def get_current_teacher(request: Request, db: Session = Depends(get_db)) -> Optional[Teacher]:
    """현재 로그인된 교사 정보 반환 (선택적)"""
    session_token = request.cookies.get("SESSION")
    
    if not session_token:
        return None
    
    teacher_id = SessionManager.get_teacher_id_from_token(session_token)
    if not teacher_id:
        return None
    
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    return teacher


def require_auth(request: Request, db: Session = Depends(get_db)) -> Teacher:
    """인증이 필요한 엔드포인트용 의존성"""
    teacher = get_current_teacher(request, db)
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "authentication_required",
                "message": "로그인이 필요합니다."
            }
        )
    
    return teacher


def get_client_ip(request: Request) -> str:
    """클라이언트 IP 주소 추출"""
    # X-Forwarded-For 헤더 확인 (프록시/로드밸런서 고려)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # X-Real-IP 헤더 확인
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # 기본 클라이언트 IP
    return request.client.host