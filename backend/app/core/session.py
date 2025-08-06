"""
세션 관리 시스템
"""
import json
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import jwt, JWTError
from .config import settings


class SessionManager:
    """세션 토큰 관리 클래스"""
    
    @staticmethod
    def create_session_token(teacher_id: int) -> str:
        """세션 토큰 생성"""
        now = datetime.utcnow()
        expire = now + timedelta(hours=settings.session_exp_hours)
        
        payload = {
            "teacher_id": teacher_id,
            "iat": now.timestamp(),
            "exp": expire.timestamp(),
            "type": "session"
        }
        
        return jwt.encode(payload, settings.session_secret, algorithm="HS256")
    
    @staticmethod
    def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
        """세션 토큰 검증 및 페이로드 반환"""
        try:
            payload = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
            
            # 토큰 타입 확인
            if payload.get("type") != "session":
                return None
            
            # 만료 시간 확인
            exp = payload.get("exp")
            if not exp or datetime.utcnow().timestamp() > exp:
                return None
            
            return payload
            
        except JWTError:
            return None
    
    @staticmethod
    def should_refresh_token(token: str) -> bool:
        """토큰 갱신 필요 여부 확인"""
        try:
            payload = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
            exp = payload.get("exp", 0)
            now = datetime.utcnow().timestamp()
            
            # 남은 시간이 임계값보다 적으면 갱신
            threshold = settings.session_refresh_threshold_h * 3600  # 시간을 초로 변환
            return (exp - now) < threshold
            
        except JWTError:
            return False
    
    @staticmethod
    def get_teacher_id_from_token(token: str) -> Optional[int]:
        """토큰에서 교사 ID 추출"""
        payload = SessionManager.verify_session_token(token)
        return payload.get("teacher_id") if payload else None