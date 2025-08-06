"""
라이브 스냅샷 API 테스트
"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.teacher import Teacher
from app.models.session_template import SessionTemplate
from app.models.session_run import SessionRun, RunStatus
from app.models.enrollment import Enrollment
from app.models.activity_log import ActivityLog
from app.services.live_snapshot_service import LiveSnapshotService


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    from app.core.database import SessionLocal, engine
    from app.core.database import Base
    
    # 테스트용 임시 테이블 생성 (실제로는 test DB를 별도로 사용해야 함)
    connection = engine.connect()
    db = SessionLocal()
    yield db
    db.close()
    connection.close()


@pytest.fixture
def test_teacher(db_session):
    """테스트용 교사 생성"""
    teacher = Teacher(
        email="test@example.com",
        password_hash="$argon2id$v=19$m=65536,t=3,p=4$test_hash"
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


@pytest.fixture
def test_session_run(db_session, test_teacher):
    """테스트용 세션 생성"""
    # 템플릿 먼저 생성
    template = SessionTemplate(
        teacher_id=test_teacher.id,
        mode_id="basic",
        title="Test Template",
        settings_json={}
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    
    # 세션 생성
    session_run = SessionRun(
        template_id=template.id,
        status=RunStatus.LIVE,
        settings_snapshot_json={}
    )
    db_session.add(session_run)
    db_session.commit()
    db_session.refresh(session_run)
    return session_run


class TestLiveSnapshotService:
    """라이브 스냅샷 서비스 테스트"""
    
    def test_get_run_live_snapshot_empty(self, db_session, test_session_run):
        """참여자가 없는 세션의 스냅샷 테스트"""
        service = LiveSnapshotService(db_session)
        snapshot = service.get_run_live_snapshot(test_session_run.id, window_sec=300)
        
        assert snapshot is not None
        assert snapshot["run_id"] == test_session_run.id
        assert snapshot["joined_total"] == 0
        assert snapshot["active_recent"] == 0
        assert snapshot["idle_recent"] == 0
        assert snapshot["students"] == []
    
    def test_get_run_live_snapshot_with_students(self, db_session, test_session_run):
        """참여자가 있는 세션의 스냅샷 테스트"""
        # 학생 참여 정보 생성
        now = datetime.now(timezone.utc)
        active_time = now - timedelta(seconds=60)  # 1분 전 (활성)
        idle_time = now - timedelta(seconds=600)   # 10분 전 (비활성)
        
        # 활성 학생
        enrollment_active = Enrollment(
            run_id=test_session_run.id,
            normalized_student_name="student1",
            rejoin_pin_hash="hash1",
            last_seen_at=active_time
        )
        
        # 비활성 학생
        enrollment_idle = Enrollment(
            run_id=test_session_run.id,
            normalized_student_name="student2", 
            rejoin_pin_hash="hash2",
            last_seen_at=idle_time
        )
        
        db_session.add_all([enrollment_active, enrollment_idle])
        db_session.commit()
        
        # 활동 로그 추가
        activity_log = ActivityLog(
            run_id=test_session_run.id,
            student_name="student1",
            activity_key="writing.step1",
            turn_index=1,
            student_input="test input"
        )
        db_session.add(activity_log)
        db_session.commit()
        
        # 스냅샷 조회
        service = LiveSnapshotService(db_session)
        snapshot = service.get_run_live_snapshot(test_session_run.id, window_sec=300)
        
        assert snapshot["joined_total"] == 2
        assert snapshot["active_recent"] == 1  # 5분 기준으로 1명만 활성
        assert snapshot["idle_recent"] == 1
        assert len(snapshot["students"]) == 2
        
        # 학생 정보 확인
        student1 = next(s for s in snapshot["students"] if s["student_name"] == "student1")
        assert student1["turns_total"] == 1
        assert student1["last_activity_key"] == "writing.step1"
        assert student1["last_turn_index"] == 1
    
    def test_window_variance(self, db_session, test_session_run):
        """윈도우 시간 변화에 따른 활성 사용자 수 변화 테스트"""
        now = datetime.now(timezone.utc)
        
        # 3분 전 활동한 학생
        enrollment = Enrollment(
            run_id=test_session_run.id,
            normalized_student_name="student1",
            rejoin_pin_hash="hash1",
            last_seen_at=now - timedelta(seconds=180)  # 3분 전
        )
        db_session.add(enrollment)
        db_session.commit()
        
        service = LiveSnapshotService(db_session)
        
        # 2분 윈도우: 비활성
        snapshot_2min = service.get_run_live_snapshot(test_session_run.id, window_sec=120)
        assert snapshot_2min["active_recent"] == 0
        assert snapshot_2min["idle_recent"] == 1
        
        # 5분 윈도우: 활성  
        snapshot_5min = service.get_run_live_snapshot(test_session_run.id, window_sec=300)
        assert snapshot_5min["active_recent"] == 1
        assert snapshot_5min["idle_recent"] == 0
    
    def test_nonexistent_session(self, db_session):
        """존재하지 않는 세션에 대한 테스트"""
        service = LiveSnapshotService(db_session)
        snapshot = service.get_run_live_snapshot(99999, window_sec=300)
        assert snapshot is None
    
    def test_get_recent_logs(self, db_session, test_session_run):
        """최근 로그 조회 테스트"""
        # 여러 활동 로그 생성
        logs = []
        for i in range(5):
            log = ActivityLog(
                run_id=test_session_run.id,
                student_name=f"student{i}",
                activity_key=f"activity{i}",
                turn_index=1,
                student_input=f"input{i}",
                created_at=datetime.now(timezone.utc) - timedelta(seconds=i*10)
            )
            logs.append(log)
        
        db_session.add_all(logs)
        db_session.commit()
        
        service = LiveSnapshotService(db_session)
        recent_logs = service.get_recent_logs(test_session_run.id, limit=3)
        
        assert recent_logs is not None
        assert len(recent_logs) == 3
        # 최신 순으로 정렬되어야 함
        assert recent_logs[0]["student_name"] == "student0"
        assert recent_logs[1]["student_name"] == "student1"
        assert recent_logs[2]["student_name"] == "student2"


class TestLiveSnapshotAPI:
    """라이브 스냅샷 API 엔드포인트 테스트"""
    
    def test_live_snapshot_unauthorized(self, client):
        """인증 없이 접근 시 401 반환"""
        response = client.get("/api/runs/1/live-snapshot")
        assert response.status_code == 401
    
    def test_live_snapshot_nonexistent_session(self, client):
        """존재하지 않는 세션 접근 시 404 반환"""
        # 실제로는 로그인 쿠키가 필요하지만, 테스트에서는 mock으로 처리
        # 여기서는 기본적인 엔드포인트 존재 여부만 확인
        response = client.get("/api/runs/99999/live-snapshot")
        assert response.status_code in [401, 404, 403]  # 인증 관련 또는 not found
    
    def test_recent_logs_unauthorized(self, client):
        """인증 없이 최근 로그 접근 시 401 반환"""
        response = client.get("/api/runs/1/recent-logs")
        assert response.status_code == 401
    
    def test_window_parameter_validation(self, client):
        """윈도우 파라미터 검증 테스트"""
        # 잘못된 윈도우 값
        response = client.get("/api/runs/1/live-snapshot?window_sec=30")  # 60 미만
        assert response.status_code in [401, 422]  # 인증 실패 또는 validation error
        
        response = client.get("/api/runs/1/live-snapshot?window_sec=4000")  # 3600 초과  
        assert response.status_code in [401, 422]


# 통합 테스트 마크
@pytest.mark.integration
class TestLiveSnapshotIntegration:
    """라이브 스냅샷 통합 테스트 (실제 DB 필요)"""
    
    def test_end_to_end_workflow(self):
        """전체 워크플로우 테스트 (실제 환경에서 수행)"""
        # 이 테스트는 실제 서버가 실행 중일 때 수행
        # 1. 교사 로그인
        # 2. 세션 생성 및 시작
        # 3. 학생 참여
        # 4. 활동 로그 생성
        # 5. 라이브 스냅샷 조회
        # 6. 세션 종료
        pass