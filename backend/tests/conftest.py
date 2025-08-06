"""
pytest 설정 및 공통 픽스처
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.core.security import hash_password
from app.models.teacher import Teacher
from app.models.mode import Mode


# 테스트용 인메모리 데이터베이스
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """테스트용 데이터베이스 세션"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# 의존성 오버라이드
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def test_db():
    """테스트 데이터베이스 생성"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_db):
    """각 테스트용 데이터베이스 세션"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture(scope="function")
def test_teacher(db_session):
    """테스트용 교사 계정"""
    teacher = Teacher(
        email="test@teacher.com",
        password_hash=hash_password("test123")
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


@pytest.fixture(scope="function")
def test_modes(db_session):
    """테스트용 모드 데이터"""
    modes = [
        Mode(
            id="strategic_writing",
            name="전략적 글쓰기",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "title": "주제",
                        "description": "글쓰기 주제를 입력하세요"
                    },
                    "difficulty": {
                        "type": "string",
                        "title": "난이도",
                        "enum": ["초급", "중급", "고급"],
                        "description": "글쓰기 난이도를 선택하세요"
                    }
                },
                "required": ["topic", "difficulty"]
            }
        ),
        Mode(
            id="prompt_practice",
            name="프롬프트 연습",
            version="1.0",
            options_schema={
                "type": "object",
                "properties": {
                    "objective": {
                        "type": "string",
                        "title": "목표",
                        "description": "연습 목표를 입력하세요"
                    },
                    "steps": {
                        "type": "integer",
                        "title": "단계 수",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "연습 단계 수를 입력하세요 (1-10)"
                    }
                },
                "required": ["objective", "steps"]
            }
        )
    ]
    
    for mode in modes:
        db_session.add(mode)
    db_session.commit()
    
    return modes


@pytest.fixture(scope="function")
def logged_in_client(client, test_teacher, test_modes):
    """로그인된 클라이언트 (모드 데이터 포함)"""
    # 로그인
    response = client.post(
        "/api/auth/login",
        json={"email": "test@teacher.com", "password": "test123"}
    )
    assert response.status_code == 200
    return client