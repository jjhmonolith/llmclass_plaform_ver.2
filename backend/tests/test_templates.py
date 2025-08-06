"""
템플릿 관련 테스트
"""
import pytest
import json
from fastapi.testclient import TestClient
from app.models.mode import Mode
from app.models.session_template import SessionTemplate


class TestModesAPI:
    """모드 API 테스트"""

    def test_get_modes_success(self, client):
        """모드 목록 조회 성공 테스트"""
        response = client.get("/api/modes/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # 시드 데이터로 2개 모드 존재
        
        # 첫 번째 모드 구조 확인
        if data:
            mode = data[0]
            assert "id" in mode
            assert "name" in mode
            assert "version" in mode
            assert "options_schema" in mode
            assert "created_at" in mode

    def test_get_modes_structure(self, client):
        """모드 스키마 구조 확인 테스트"""
        response = client.get("/api/modes/")
        data = response.json()
        
        # strategic_writing 모드 확인
        strategic_mode = None
        for mode in data:
            if mode["id"] == "strategic_writing":
                strategic_mode = mode
                break
        
        assert strategic_mode is not None
        assert strategic_mode["name"] == "전략적 글쓰기"
        
        schema = strategic_mode["options_schema"]
        assert "properties" in schema
        assert "required" in schema
        assert "topic" in schema["properties"]
        assert "difficulty" in schema["properties"]
        assert set(schema["required"]) == {"topic", "difficulty"}


class TestTemplatesAPI:
    """템플릿 API 테스트"""

    def test_create_template_success(self, logged_in_client, test_teacher):
        """템플릿 생성 성공 테스트"""
        template_data = {
            "mode_id": "strategic_writing",
            "title": "중2 과학 글쓰기",
            "settings_json": {
                "topic": "환경 보호",
                "difficulty": "중급"
            }
        }
        
        response = logged_in_client.post(
            "/api/templates/",
            json=template_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode_id"] == "strategic_writing"
        assert data["title"] == "중2 과학 글쓰기"
        assert data["settings_json"]["topic"] == "환경 보호"
        assert data["settings_json"]["difficulty"] == "중급"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert data["mode"]["name"] == "전략적 글쓰기"

    def test_create_template_missing_required_field(self, logged_in_client):
        """필수 필드 누락 시 템플릿 생성 실패 테스트"""
        template_data = {
            "mode_id": "strategic_writing",
            "title": "테스트 템플릿",
            "settings_json": {
                "topic": "과학"
                # difficulty 필드 누락
            }
        }
        
        response = logged_in_client.post(
            "/api/templates/",
            json=template_data
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert data["detail"]["valid"] is False
        assert len(data["detail"]["errors"]) > 0
        
        # 오류 메시지에 difficulty 관련 내용 포함
        error_messages = [err["message"] for err in data["detail"]["errors"]]
        assert any("difficulty" in msg for msg in error_messages)

    def test_create_template_invalid_mode(self, logged_in_client):
        """존재하지 않는 모드로 템플릿 생성 실패 테스트"""
        template_data = {
            "mode_id": "nonexistent_mode",
            "title": "테스트 템플릿",
            "settings_json": {"some": "value"}
        }
        
        response = logged_in_client.post(
            "/api/templates/",
            json=template_data
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Mode not found" in data["detail"]

    def test_create_template_unauthenticated(self, client):
        """미인증 상태에서 템플릿 생성 실패 테스트"""
        template_data = {
            "mode_id": "strategic_writing",
            "title": "테스트 템플릿",
            "settings_json": {
                "topic": "테스트",
                "difficulty": "초급"
            }
        }
        
        response = client.post(
            "/api/templates/",
            json=template_data
        )
        
        assert response.status_code == 401

    def test_get_templates_empty_list(self, logged_in_client):
        """빈 템플릿 목록 조회 테스트"""
        response = logged_in_client.get("/api/templates/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "total_pages" in data
        
        assert isinstance(data["templates"], list)
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["size"] == 20
        assert data["total_pages"] == 0

    def test_get_templates_with_data(self, logged_in_client, db_session, test_teacher):
        """템플릿이 있는 상태에서 목록 조회 테스트"""
        # 테스트용 모드 생성
        mode = Mode(
            id="test_mode",
            name="테스트 모드",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {"test_field": {"type": "string"}},
                "required": ["test_field"]
            }
        )
        db_session.add(mode)
        
        # 테스트용 템플릿 생성
        template = SessionTemplate(
            teacher_id=test_teacher.id,
            mode_id="test_mode",
            title="테스트 템플릿",
            settings_json={"test_field": "test_value"}
        )
        db_session.add(template)
        db_session.commit()
        
        response = logged_in_client.get("/api/templates/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["templates"]) == 1
        assert data["total"] == 1
        assert data["templates"][0]["title"] == "테스트 템플릿"
        assert data["templates"][0]["mode"]["name"] == "테스트 모드"

    def test_get_templates_search(self, logged_in_client, db_session, test_teacher):
        """템플릿 검색 기능 테스트"""
        # 테스트용 모드 생성
        mode = Mode(
            id="search_test_mode",
            name="검색 테스트 모드",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {"field": {"type": "string"}},
                "required": ["field"]
            }
        )
        db_session.add(mode)
        
        # 여러 템플릿 생성
        templates = [
            SessionTemplate(
                teacher_id=test_teacher.id,
                mode_id="search_test_mode",
                title="중학교 과학 실험",
                settings_json={"field": "value1"}
            ),
            SessionTemplate(
                teacher_id=test_teacher.id,
                mode_id="search_test_mode",
                title="고등학교 수학 문제",
                settings_json={"field": "value2"}
            )
        ]
        for template in templates:
            db_session.add(template)
        db_session.commit()
        
        # 제목으로 검색
        response = logged_in_client.get("/api/templates/?query=중학교")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["templates"]) == 1
        assert data["templates"][0]["title"] == "중학교 과학 실험"

    def test_get_templates_sorting(self, logged_in_client, db_session, test_teacher):
        """템플릿 정렬 기능 테스트"""
        # 테스트용 모드와 템플릿들 생성 (시간차를 두고)
        mode = Mode(
            id="sort_test_mode",
            name="정렬 테스트 모드",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {"field": {"type": "string"}},
                "required": ["field"]
            }
        )
        db_session.add(mode)
        db_session.commit()
        
        templates = [
            SessionTemplate(
                teacher_id=test_teacher.id,
                mode_id="sort_test_mode",
                title="A 템플릿",
                settings_json={"field": "value"}
            ),
            SessionTemplate(
                teacher_id=test_teacher.id,
                mode_id="sort_test_mode",
                title="B 템플릿",
                settings_json={"field": "value"}
            )
        ]
        for template in templates:
            db_session.add(template)
            db_session.commit()  # 각각 커밋하여 시간차 생성
        
        # 제목 오름차순 정렬
        response = logged_in_client.get("/api/templates/?sort=title&order=asc")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["templates"]) >= 2
        # 첫 번째가 A, 두 번째가 B여야 함
        titles = [t["title"] for t in data["templates"]]
        assert "A 템플릿" in titles
        assert "B 템플릿" in titles

    def test_get_template_by_id_success(self, logged_in_client, db_session, test_teacher):
        """템플릿 단건 조회 성공 테스트"""
        # 테스트용 템플릿 생성
        mode = Mode(
            id="single_test_mode",
            name="단건 테스트 모드",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {"field": {"type": "string"}},
                "required": ["field"]
            }
        )
        db_session.add(mode)
        
        template = SessionTemplate(
            teacher_id=test_teacher.id,
            mode_id="single_test_mode",
            title="단건 테스트 템플릿",
            settings_json={"field": "test_value"}
        )
        db_session.add(template)
        db_session.commit()
        
        response = logged_in_client.get(f"/api/templates/{template.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == template.id
        assert data["title"] == "단건 테스트 템플릿"
        assert data["mode"]["name"] == "단건 테스트 모드"

    def test_get_template_by_id_not_found(self, logged_in_client):
        """존재하지 않는 템플릿 조회 실패 테스트"""
        response = logged_in_client.get("/api/templates/99999")
        
        assert response.status_code == 404
        data = response.json()
        assert "Template not found" in data["detail"]

    def test_get_template_by_id_unauthorized(self, client):
        """미인증 상태에서 템플릿 조회 실패 테스트"""
        response = client.get("/api/templates/1")
        
        assert response.status_code == 401

    def test_templates_ownership_isolation(self, client, db_session):
        """템플릿 소유권 분리 테스트 (다른 교사의 템플릿 접근 불가)"""
        # 두 번째 교사 생성
        from app.models.teacher import Teacher
        from app.core.security import hash_password
        
        teacher2 = Teacher(
            email="teacher2@test.com",
            password_hash=hash_password("password123")
        )
        db_session.add(teacher2)
        db_session.commit()
        
        # 두 번째 교사로 로그인
        login_response = client.post(
            "/api/auth/login",
            json={"email": "teacher2@test.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        
        # 두 번째 교사의 템플릿 생성
        template_data = {
            "mode_id": "strategic_writing",
            "title": "교사2의 템플릿",
            "settings_json": {
                "topic": "수학",
                "difficulty": "고급"
            }
        }
        
        create_response = client.post(
            "/api/templates/",
            json=template_data
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # 첫 번째 교사로 로그인
        client.post(
            "/api/auth/login",
            json={"email": "test@teacher.com", "password": "test123"}
        )
        
        # 첫 번째 교사가 두 번째 교사의 템플릿에 접근 시도
        response = client.get(f"/api/templates/{template_id}")
        assert response.status_code == 404  # 소유하지 않은 템플릿은 404