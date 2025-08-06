"""
S4 학생 입장 API 테스트
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db, Base
from app.models import Teacher, SessionTemplate, SessionRun, RunStatus, JoinCode, Enrollment
from app.utils.pin_utils import hash_pin


# 테스트 데이터베이스 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function")
def setup_db():
    """각 테스트마다 새로운 DB 상태"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_session(setup_db):
    """테스트용 세션"""
    db = TestingSessionLocal()
    
    # 테스트 데이터 생성
    teacher = Teacher(email="test@teacher.com", password_hash="test_hash")
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    
    template = SessionTemplate(
        teacher_id=teacher.id,
        mode_id=1,
        title="테스트 템플릿",
        settings_json={"test": True}
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    
    session_run = SessionRun(
        template_id=template.id,
        name="테스트 세션",
        status=RunStatus.LIVE,
        settings_snapshot_json={"test": True}
    )
    db.add(session_run)
    db.commit()
    db.refresh(session_run)
    
    join_code = JoinCode(
        run_id=session_run.id,
        code="123456",
        is_active=True
    )
    db.add(join_code)
    db.commit()
    
    yield {
        "db": db,
        "teacher": teacher,
        "template": template,
        "session_run": session_run,
        "join_code": join_code
    }
    
    db.close()


class TestJoinAPI:
    """학생 입장 API 테스트"""
    
    def test_new_student_join_success(self, test_session):
        """신규 학생 입장 성공"""
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "김학생"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["student_name"] == "김학생"
        assert "rejoin_pin" in data
        assert len(data["rejoin_pin"]) == 2  # 2자리 PIN
        
        # DB에 enrollment 생성 확인
        db = test_session["db"]
        enrollment = db.query(Enrollment).filter(
            Enrollment.run_id == test_session["session_run"].id,
            Enrollment.normalized_student_name == "김학생"
        ).first()
        assert enrollment is not None
    
    def test_duplicate_name_requires_pin(self, test_session):
        """중복 이름 시 PIN 입력 요구"""
        # 첫 번째 입장
        client.post("/api/join", json={
            "code": "123456",
            "student_name": "중복학생"
        })
        
        # 같은 이름으로 다시 입장 시도
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "중복학생"
        })
        
        assert response.status_code == 409
        data = response.json()
        assert data["detail"]["error"] == "requires_pin"
        assert "재참여 PIN을 입력해주세요" in data["detail"]["message"]
    
    def test_rejoin_with_correct_pin(self, test_session):
        """올바른 PIN으로 재참여 성공"""
        # 첫 번째 입장으로 PIN 획득
        response1 = client.post("/api/join", json={
            "code": "123456",
            "student_name": "재참여학생"
        })
        pin = response1.json()["rejoin_pin"]
        
        # PIN으로 재참여
        response2 = client.post("/api/join", json={
            "code": "123456",
            "student_name": "재참여학생",
            "rejoin_pin": pin
        })
        
        assert response2.status_code == 200
        data = response2.json()
        assert data["ok"] is True
        assert data["student_name"] == "재참여학생"
        assert "rejoin_pin" not in data  # 재참여시에는 PIN 반환 안함
    
    def test_rejoin_with_wrong_pin(self, test_session):
        """잘못된 PIN으로 재참여 실패"""
        # 첫 번째 입장
        client.post("/api/join", json={
            "code": "123456",
            "student_name": "잘못된핀학생"
        })
        
        # 잘못된 PIN으로 재참여 시도
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "잘못된핀학생",
            "rejoin_pin": "99"
        })
        
        assert response.status_code == 401
        assert "재참여 PIN이 올바르지 않습니다" in response.json()["detail"]
    
    def test_invalid_code(self, test_session):
        """유효하지 않은 코드"""
        response = client.post("/api/join", json={
            "code": "999999",
            "student_name": "테스트학생"
        })
        
        assert response.status_code == 404
        assert "코드가 유효하지 않습니다" in response.json()["detail"]
    
    def test_ended_session(self, test_session):
        """종료된 세션 참여 시도"""
        # 세션 종료
        db = test_session["db"]
        session_run = test_session["session_run"]
        session_run.status = RunStatus.ENDED
        db.commit()
        
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "종료된세션학생"
        })
        
        assert response.status_code == 410
        assert "세션이 종료되었습니다" in response.json()["detail"]
    
    def test_invalid_name_formats(self, test_session):
        """잘못된 이름 형식들"""
        test_cases = [
            ("", "이름을 입력해주세요"),
            ("   ", "이름을 입력해주세요"),
            ("a" * 21, "이름은 20자 이하로 입력해주세요"),
        ]
        
        for name, expected_error in test_cases:
            response = client.post("/api/join", json={
                "code": "123456",
                "student_name": name
            })
            
            assert response.status_code == 400
            assert expected_error in response.json()["detail"]
    
    def test_invalid_code_format(self, test_session):
        """잘못된 코드 형식"""
        response = client.post("/api/join", json={
            "code": "123",  # 6자리가 아님
            "student_name": "테스트학생"
        })
        
        assert response.status_code == 400
        assert "올바른 코드를 입력해주세요" in response.json()["detail"]
    
    def test_invalid_pin_length(self, test_session):
        """잘못된 PIN 길이"""
        # 첫 번째 입장
        client.post("/api/join", json={
            "code": "123456",
            "student_name": "핀길이학생"
        })
        
        # 잘못된 PIN 길이로 재참여
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "핀길이학생",
            "rejoin_pin": "1"  # 2자리가 아님
        })
        
        assert response.status_code == 400
        assert "올바른 재참여 PIN을 입력해주세요" in response.json()["detail"]


class TestRateLimit:
    """레이트리밋 테스트"""
    
    def test_rate_limit_enforcement(self, test_session):
        """레이트리밋 적용 확인"""
        # 30회 연속 요청 (설정된 한계)
        for i in range(30):
            response = client.post("/api/join", json={
                "code": "123456",
                "student_name": f"학생{i}"
            })
            # 처음 몇 개는 성공해야 함
            if i < 10:
                assert response.status_code in [200, 409, 403]  # 정상 응답들
        
        # 31번째 요청은 레이트리밋에 걸려야 함
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "마지막학생"
        })
        
        assert response.status_code == 429
        data = response.json()
        assert data["error"] == "rate_limit_exceeded"
        assert "너무 많은 요청입니다" in data["message"]


class TestCacheHeaders:
    """캐시 헤더 테스트"""
    
    def test_no_cache_headers(self, test_session):
        """join 엔드포인트 캐시 방지 헤더"""
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "캐시테스트학생"
        })
        
        assert "cache-control" in response.headers
        cache_control = response.headers["cache-control"]
        assert "no-store" in cache_control


class TestCapacity:
    """수용 인원 테스트"""
    
    def test_capacity_limit(self, test_session):
        """수용 인원 초과 시 403 에러"""
        # MAX_STUDENTS_PER_RUN이 60으로 설정되어 있으므로
        # 실제로는 60명을 생성하기 어려워 모킹하거나 설정 변경 필요
        # 여기서는 개념적 테스트로 작성
        
        db = test_session["db"]
        session_run = test_session["session_run"]
        
        # 가상으로 60명의 enrollment 생성
        for i in range(60):
            enrollment = Enrollment(
                run_id=session_run.id,
                normalized_student_name=f"student{i}",
                rejoin_pin_hash=hash_pin("12")
            )
            db.add(enrollment)
        db.commit()
        
        # 61번째 학생 입장 시도
        response = client.post("/api/join", json={
            "code": "123456",
            "student_name": "61번째학생"
        })
        
        assert response.status_code == 403
        assert "세션 참여 인원이 가득찼습니다" in response.json()["detail"]