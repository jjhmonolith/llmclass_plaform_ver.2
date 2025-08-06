"""
Activity Log model - 학생 활동 로그 저장
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class ActivityLog(Base):
    """학생 활동 로그 테이블"""
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("session_runs.id"), nullable=False, index=True)
    student_name = Column(String(20), nullable=False, index=True)  # 정규화된 이름
    activity_key = Column(String(100), nullable=False, index=True)  # e.g., "writing.step1"
    turn_index = Column(Integer, nullable=False)  # 해당 활동 내 턴 번호
    
    # 활동 데이터
    student_input = Column(Text, nullable=True)  # 학생 입력
    ai_output = Column(Text, nullable=True)  # AI 응답
    third_eval_json = Column(JSON, nullable=True)  # 제3 AI 평가 결과
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # 유니크 제약: 한 세션의 같은 학생이 같은 활동의 같은 턴을 중복 저장할 수 없음
    __table_args__ = (
        UniqueConstraint('run_id', 'student_name', 'activity_key', 'turn_index', 
                        name='uq_activity_logs_run_student_activity_turn'),
    )