"""
인증 관련 통합 테스트
"""
import pytest
import json
from fastapi.testclient import TestClient


class TestAuthFlow:
    """인증 플로우 테스트"""

    def test_root_endpoint(self, client):
        """루트 엔드포인트 테스트"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "LLM Class Platform API"
        assert data["status"] == "running"

    def test_login_success(self, client, test_teacher):
        """정상 로그인 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com", "password": "test123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "로그인되었습니다."
        assert data["teacher"]["email"] == "test@teacher.com"
        assert data["teacher"]["id"] == test_teacher.id
        
        # 세션 쿠키 확인
        assert "SESSION" in response.cookies
        session_cookie = response.cookies["SESSION"]
        assert session_cookie is not None
        assert len(session_cookie) > 0

    def test_login_invalid_email(self, client):
        """존재하지 않는 이메일로 로그인 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "notexist@teacher.com", "password": "test123"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["error"] == "invalid_credentials"
        assert "이메일 또는 비밀번호가 올바르지 않습니다" in data["detail"]["message"]

    def test_login_invalid_password(self, client, test_teacher):
        """잘못된 비밀번호로 로그인 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["error"] == "invalid_credentials"

    def test_me_authenticated(self, logged_in_client, test_teacher):
        """인증된 상태에서 사용자 정보 조회"""
        response = logged_in_client.get("/api/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@teacher.com"
        assert data["id"] == test_teacher.id
        assert "created_at" in data

    def test_me_unauthenticated(self, client):
        """미인증 상태에서 사용자 정보 조회"""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["error"] == "authentication_required"

    def test_logout(self, logged_in_client):
        """로그아웃 테스트"""
        response = logged_in_client.post("/api/auth/logout")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["message"] == "로그아웃되었습니다."
        
        # 쿠키가 제거되었는지 확인
        assert "SESSION" in response.cookies
        # 쿠키 값이 빈 문자열이거나 만료되었는지 확인
        session_cookie = response.cookies["SESSION"]
        assert session_cookie == "" or "expires" in str(response.headers.get("set-cookie", ""))

    def test_logout_then_access_protected(self, logged_in_client):
        """로그아웃 후 보호된 엔드포인트 접근 테스트"""
        # 로그아웃
        logout_response = logged_in_client.post("/api/auth/logout")
        assert logout_response.status_code == 200
        
        # 로그아웃 후 /me 접근 시도
        me_response = logged_in_client.get("/api/auth/me")
        assert me_response.status_code == 401

    def test_login_missing_fields(self, client):
        """필수 필드 누락 테스트"""
        # 이메일 누락
        response = client.post(
            "/api/auth/login",
            json={"password": "test123"}
        )
        assert response.status_code == 422
        
        # 비밀번호 누락
        response = client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com"}
        )
        assert response.status_code == 422

    def test_login_empty_fields(self, client):
        """빈 값 필드 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "", "password": ""}
        )
        assert response.status_code == 422


class TestRateLimit:
    """레이트 리밋 테스트"""

    def test_rate_limit_login_attempts(self, client, test_teacher):
        """로그인 시도 레이트 리밋 테스트"""
        # 5회까지는 정상적으로 401 응답
        for i in range(5):
            response = client.post(
                "/api/auth/login",
                json={"email": "test@teacher.com", "password": "wrongpassword"}
            )
            assert response.status_code == 401

        # 6번째 시도에서 레이트 리밋 발생
        response = client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com", "password": "wrongpassword"}
        )
        assert response.status_code == 429
        data = response.json()
        assert data["detail"]["error"] == "Too many login attempts"
        assert "retry_after" in data["detail"]


class TestSessionManagement:
    """세션 관리 테스트"""

    def test_session_token_format(self, client, test_teacher):
        """세션 토큰 형식 테스트"""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com", "password": "test123"}
        )
        
        assert response.status_code == 200
        session_cookie = response.cookies["SESSION"]
        
        # JWT 형식 확인 (3개 부분으로 구성, . 으로 구분)
        parts = session_cookie.split(".")
        assert len(parts) == 3

    def test_me_endpoint_with_session_refresh(self, logged_in_client):
        """세션 갱신이 포함된 /me 엔드포인트 테스트"""
        # 첫 번째 호출
        response1 = logged_in_client.get("/api/auth/me")
        assert response1.status_code == 200
        
        # 두 번째 호출 (세션 갱신 확인)
        response2 = logged_in_client.get("/api/auth/me")
        assert response2.status_code == 200
        
        # 데이터가 일관되게 반환되는지 확인
        data1 = response1.json()
        data2 = response2.json()
        assert data1["email"] == data2["email"]
        assert data1["id"] == data2["id"]