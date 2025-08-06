"""
인증 관련 API 라우터
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..core.security import verify_password, validate_password_strength
from ..core.session import SessionManager
from ..core.rate_limit import check_auth_rate_limit
from ..core.deps import get_current_teacher, require_auth, get_client_ip
from ..models.teacher import Teacher
from ..schemas.auth import (
    LoginRequest, LoginResponse, LogoutResponse, 
    TeacherInfo, AuthErrorResponse
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """교사 로그인"""
    client_ip = get_client_ip(request)
    
    # 레이트 리밋 확인
    check_auth_rate_limit(request)
    
    try:
        # 교사 계정 조회
        teacher = db.query(Teacher).filter(Teacher.email == login_data.email).first()
        
        if not teacher or not verify_password(login_data.password, teacher.password_hash):
            logger.warning(f"로그인 실패 - IP: {client_ip}, Email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "invalid_credentials",
                    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
                }
            )
        
        # 세션 토큰 생성
        session_token = SessionManager.create_session_token(teacher.id)
        
        # 쿠키 설정
        response.set_cookie(
            key="SESSION",
            value=session_token,
            httponly=True,
            secure=settings.cookie_secure,  # APP_ENV=prod일 때 True
            samesite="lax",
            max_age=86400 * 7  # 7일
        )
        
        logger.info(f"로그인 성공 - Teacher ID: {teacher.id}, IP: {client_ip}")
        
        return LoginResponse(
            message="로그인되었습니다.",
            teacher=TeacherInfo.from_orm(teacher)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"로그인 처리 중 오류 - IP: {client_ip}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "internal_error", 
                "message": "서버 오류가 발생했습니다."
            }
        )


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response, request: Request):
    """교사 로그아웃"""
    client_ip = get_client_ip(request)
    
    # 쿠키 제거
    response.delete_cookie(
        key="SESSION",
        httponly=True,
        secure=settings.cookie_secure,  # APP_ENV=prod일 때 True
        samesite="lax"
    )
    
    logger.info(f"로그아웃 완료 - IP: {client_ip}")
    
    return LogoutResponse(
        ok=True,
        message="로그아웃되었습니다."
    )


@router.get("/me", response_model=TeacherInfo)
async def get_current_user_info(
    request: Request,
    response: Response,
    current_teacher: Teacher = Depends(require_auth)
):
    """현재 로그인된 교사 정보 조회"""
    client_ip = get_client_ip(request)
    
    # 토큰 갱신 필요 여부 확인 및 자동 갱신
    session_token = request.cookies.get("SESSION")
    if session_token and SessionManager.should_refresh_token(session_token):
        logger.info(f"세션 토큰 자동 갱신 - Teacher ID: {current_teacher.id}")
        
        # 새로운 세션 토큰 생성
        new_token = SessionManager.create_session_token(current_teacher.id)
        
        # 새 쿠키 설정
        response.set_cookie(
            key="SESSION",
            value=new_token,
            httponly=True,
            secure=settings.cookie_secure,  # APP_ENV=prod일 때 True
            samesite="lax",
            max_age=86400 * 7  # 7일
        )
    
    logger.info(f"사용자 정보 조회 - Teacher ID: {current_teacher.id}, IP: {client_ip}")
    
    return TeacherInfo.from_orm(current_teacher)