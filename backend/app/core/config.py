"""
애플리케이션 설정 관리
"""
import os
from typing import Optional, List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수 기반 설정 클래스"""
    
    # 환경 설정
    app_env: str = "dev"  # dev | prod
    app_name: str = "LLM Class Platform"
    debug: bool = False
    
    # 데이터베이스
    database_url: str = "sqlite:///./data/app.db"
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_echo: bool = False
    
    # 인증 관련
    min_teacher_password_len: int = 6
    auth_login_rate_per_min: int = 5
    session_exp_hours: int = 12
    session_refresh_threshold_h: int = 3
    session_secret: str = "your-secret-key-change-in-production"
    
    # CORS 설정
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    
    # 보안 설정
    secure_cookies: bool = False
    
    # 세션 코드 설정
    code_length: int = 6
    join_code_alphabet: str = "0123456789"  # 6자리 숫자만 사용
    max_students_per_run: int = 60
    
    # 학생 입장 관련
    join_attempt_rate_per_min: int = 30
    rejoin_pin_length: int = 4  # 숫자 4자리
    session_temp_cache_minutes: int = 30  # localStorage 임시 캐시 유지 시간 (분)
    
    # 활동 로그 관련
    activity_write_rate_per_min: int = 120  # 활동 로그 저장 레이트리밋
    activity_token_secret: str = "activity-token-secret-change-in-production"  # JWT 서명용
    
    # 기능 플래그
    enable_test_routes: bool = True
    enable_debug_routes: bool = True
    log_level: str = "INFO"
    
    
    @property
    def is_production(self) -> bool:
        """프로덕션 환경 여부"""
        return self.app_env == "prod"
    
    @property
    def cookie_secure(self) -> bool:
        """쿠키 Secure 플래그 설정"""
        return self.is_production
    
    @property
    def cors_origins_list(self) -> List[str]:
        """CORS 허용 오리진 리스트"""
        if self.is_production:
            # 프로덕션에서는 특정 도메인만 허용
            return ["https://your-domain.com", "https://www.your-domain.com"]
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def should_enable_debug_routes(self) -> bool:
        """디버그 라우트 활성화 여부"""
        return self.enable_debug_routes and not self.is_production
    
    @property
    def should_enable_test_routes(self) -> bool:
        """테스트 라우트 활성화 여부"""
        return self.enable_test_routes and not self.is_production
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # 추가 환경변수 무시


# 전역 설정 인스턴스
settings = Settings()