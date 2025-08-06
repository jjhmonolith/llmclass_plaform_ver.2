"""
인증 관련 Pydantic 스키마
"""
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class TeacherInfo(BaseModel):
    """교사 정보 스키마"""
    id: int = Field(..., description="교사 ID")
    email: str = Field(..., description="이메일 주소")
    created_at: datetime = Field(..., description="가입 일시")
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: str = Field(..., description="교사 이메일 주소")
    password: str = Field(..., min_length=1, description="비밀번호")


class LoginResponse(BaseModel):
    """로그인 응답 스키마"""
    message: str = Field(..., description="응답 메시지")
    teacher: TeacherInfo = Field(..., description="교사 정보")


class LogoutResponse(BaseModel):
    """로그아웃 응답 스키마"""
    ok: bool = Field(True, description="성공 여부")
    message: str = Field("로그아웃되었습니다", description="응답 메시지")


class AuthErrorResponse(BaseModel):
    """인증 오류 응답 스키마"""
    error: str = Field(..., description="오류 코드")
    message: str = Field(..., description="오류 메시지")
    details: Optional[dict] = Field(None, description="추가 정보")