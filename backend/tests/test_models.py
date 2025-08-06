"""
모델 및 데이터베이스 테스트
"""
import pytest
from datetime import datetime
from app.models.teacher import Teacher
from app.core.security import hash_password


class TestTeacherModel:
    """Teacher 모델 테스트"""

    def test_create_teacher(self, db_session):
        """교사 생성 테스트"""
        teacher = Teacher(
            email="newteacher@test.com",
            password_hash=hash_password("password123")
        )
        
        db_session.add(teacher)
        db_session.commit()
        db_session.refresh(teacher)
        
        assert teacher.id is not None
        assert teacher.email == "newteacher@test.com"
        assert teacher.password_hash != "password123"  # 해시되어야 함
        assert teacher.created_at is not None
        assert isinstance(teacher.created_at, datetime)

    def test_teacher_email_unique(self, db_session):
        """교사 이메일 유니크 제약 테스트"""
        # 첫 번째 교사 생성
        teacher1 = Teacher(
            email="unique@test.com",
            password_hash=hash_password("password123")
        )
        db_session.add(teacher1)
        db_session.commit()
        
        # 같은 이메일로 두 번째 교사 생성 시도
        teacher2 = Teacher(
            email="unique@test.com",
            password_hash=hash_password("password456")
        )
        db_session.add(teacher2)
        
        # 유니크 제약 위반으로 오류 발생해야 함
        with pytest.raises(Exception):
            db_session.commit()

    def test_teacher_repr(self, db_session):
        """Teacher __repr__ 메서드 테스트"""
        teacher = Teacher(
            email="repr@test.com",
            password_hash=hash_password("password123")
        )
        
        db_session.add(teacher)
        db_session.commit()
        db_session.refresh(teacher)
        
        repr_str = repr(teacher)
        assert "Teacher" in repr_str
        assert str(teacher.id) in repr_str
        assert "repr@test.com" in repr_str

    def test_teacher_query_by_email(self, db_session):
        """이메일로 교사 조회 테스트"""
        email = "query@test.com"
        teacher = Teacher(
            email=email,
            password_hash=hash_password("password123")
        )
        
        db_session.add(teacher)
        db_session.commit()
        
        # 이메일로 조회
        found_teacher = db_session.query(Teacher).filter(Teacher.email == email).first()
        assert found_teacher is not None
        assert found_teacher.email == email
        assert found_teacher.id == teacher.id

    def test_teacher_query_nonexistent(self, db_session):
        """존재하지 않는 교사 조회 테스트"""
        found_teacher = db_session.query(Teacher).filter(
            Teacher.email == "nonexistent@test.com"
        ).first()
        assert found_teacher is None

    def test_teacher_update(self, db_session):
        """교사 정보 업데이트 테스트"""
        teacher = Teacher(
            email="update@test.com",
            password_hash=hash_password("oldpassword")
        )
        
        db_session.add(teacher)
        db_session.commit()
        
        # 비밀번호 업데이트
        new_password_hash = hash_password("newpassword")
        teacher.password_hash = new_password_hash
        db_session.commit()
        
        # 업데이트된 정보 확인
        db_session.refresh(teacher)
        assert teacher.password_hash == new_password_hash

    def test_teacher_delete(self, db_session):
        """교사 삭제 테스트"""
        teacher = Teacher(
            email="delete@test.com",
            password_hash=hash_password("password123")
        )
        
        db_session.add(teacher)
        db_session.commit()
        teacher_id = teacher.id
        
        # 교사 삭제
        db_session.delete(teacher)
        db_session.commit()
        
        # 삭제 확인
        found_teacher = db_session.query(Teacher).filter(Teacher.id == teacher_id).first()
        assert found_teacher is None


class TestDatabaseConnection:
    """데이터베이스 연결 테스트"""

    def test_database_connection(self, db_session):
        """데이터베이스 연결 테스트"""
        # 간단한 쿼리 실행으로 연결 확인
        result = db_session.execute("SELECT 1").fetchone()
        assert result[0] == 1

    def test_transaction_rollback(self, db_session):
        """트랜잭션 롤백 테스트"""
        teacher = Teacher(
            email="rollback@test.com",
            password_hash=hash_password("password123")
        )
        
        db_session.add(teacher)
        # commit 하지 않고 롤백
        db_session.rollback()
        
        # 데이터가 저장되지 않았는지 확인
        found_teacher = db_session.query(Teacher).filter(
            Teacher.email == "rollback@test.com"
        ).first()
        assert found_teacher is None