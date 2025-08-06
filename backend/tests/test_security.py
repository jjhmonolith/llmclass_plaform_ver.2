"""
보안 관련 테스트
"""
import pytest
from app.core.security import hash_password, verify_password, validate_password_strength
from app.core.session import SessionManager


class TestPasswordSecurity:
    """비밀번호 보안 테스트"""

    def test_hash_password(self):
        """비밀번호 해싱 테스트"""
        password = "test123"
        hashed = hash_password(password)
        
        # 해시된 비밀번호는 원본과 다름
        assert hashed != password
        # 해시 길이 확인 (bcrypt 해시는 60자)
        assert len(hashed) == 60
        # bcrypt 형식 확인
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """올바른 비밀번호 검증 테스트"""
        password = "test123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """잘못된 비밀번호 검증 테스트"""
        password = "test123"
        wrong_password = "wrong123"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_validate_password_strength_valid(self):
        """유효한 비밀번호 강도 테스트"""
        assert validate_password_strength("123456") is True
        assert validate_password_strength("demo123") is True
        assert validate_password_strength("verylongpassword") is True

    def test_validate_password_strength_invalid(self):
        """유효하지 않은 비밀번호 강도 테스트"""
        assert validate_password_strength("12345") is False
        assert validate_password_strength("") is False
        assert validate_password_strength("a") is False


class TestSessionManager:
    """세션 관리자 테스트"""

    def test_create_session_token(self):
        """세션 토큰 생성 테스트"""
        teacher_id = 1
        token = SessionManager.create_session_token(teacher_id)
        
        # JWT 형식 확인
        parts = token.split(".")
        assert len(parts) == 3
        assert len(token) > 0

    def test_verify_session_token_valid(self):
        """유효한 세션 토큰 검증 테스트"""
        teacher_id = 1
        token = SessionManager.create_session_token(teacher_id)
        
        payload = SessionManager.verify_session_token(token)
        assert payload is not None
        assert payload["teacher_id"] == teacher_id
        assert payload["type"] == "session"
        assert "iat" in payload
        assert "exp" in payload

    def test_verify_session_token_invalid(self):
        """유효하지 않은 세션 토큰 검증 테스트"""
        invalid_token = "invalid.token.here"
        payload = SessionManager.verify_session_token(invalid_token)
        assert payload is None

    def test_get_teacher_id_from_token(self):
        """토큰에서 교사 ID 추출 테스트"""
        teacher_id = 123
        token = SessionManager.create_session_token(teacher_id)
        
        extracted_id = SessionManager.get_teacher_id_from_token(token)
        assert extracted_id == teacher_id

    def test_get_teacher_id_from_invalid_token(self):
        """유효하지 않은 토큰에서 교사 ID 추출 테스트"""
        invalid_token = "invalid.token.here"
        extracted_id = SessionManager.get_teacher_id_from_token(invalid_token)
        assert extracted_id is None

    def test_should_refresh_token(self):
        """토큰 갱신 필요 여부 테스트"""
        teacher_id = 1
        token = SessionManager.create_session_token(teacher_id)
        
        # 새로 생성된 토큰은 갱신이 필요하지 않음
        should_refresh = SessionManager.should_refresh_token(token)
        assert should_refresh is False

    def test_should_refresh_invalid_token(self):
        """유효하지 않은 토큰의 갱신 필요 여부 테스트"""
        invalid_token = "invalid.token.here"
        should_refresh = SessionManager.should_refresh_token(invalid_token)
        assert should_refresh is False


class TestRateLimiter:
    """레이트 리미터 테스트"""

    def test_rate_limiter_import(self):
        """레이트 리미터 임포트 테스트"""
        from app.core.rate_limit import RateLimiter, rate_limiter
        
        assert RateLimiter is not None
        assert rate_limiter is not None

    def test_rate_limiter_basic_functionality(self):
        """레이트 리미터 기본 기능 테스트"""
        from app.core.rate_limit import RateLimiter
        
        limiter = RateLimiter()
        test_ip = "192.168.1.100"
        limit = 3
        window = 60
        
        # 제한 내에서는 True 반환
        for i in range(limit):
            result = limiter.check_rate_limit(test_ip, limit, window)
            assert result is True
        
        # 제한 초과시 False 반환
        result = limiter.check_rate_limit(test_ip, limit, window)
        assert result is False

    def test_rate_limiter_remaining_requests(self):
        """레이트 리미터 남은 요청 수 테스트"""
        from app.core.rate_limit import RateLimiter
        
        limiter = RateLimiter()
        test_ip = "192.168.1.101"
        limit = 5
        window = 60
        
        # 처음에는 전체 제한 수가 남아있음
        remaining = limiter.get_remaining_requests(test_ip, limit, window)
        assert remaining == limit
        
        # 한 번 사용 후
        limiter.check_rate_limit(test_ip, limit, window)
        remaining = limiter.get_remaining_requests(test_ip, limit, window)
        assert remaining == limit - 1