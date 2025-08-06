"""
Session Run model for managing active sessions
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class RunStatus(enum.Enum):
    """세션 실행 상태"""
    READY = "READY"    # 생성됨, 아직 시작 안됨
    LIVE = "LIVE"      # 진행 중 (학생들이 참여 가능)
    ENDED = "ENDED"    # 종료됨


class SessionRun(Base):
    """실제로 진행되는 세션 (템플릿 기반)"""
    __tablename__ = "session_runs"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("session_templates.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)  # 세션 이름
    status = Column(Enum(RunStatus), nullable=False, default=RunStatus.READY, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)  # LIVE가 될 때 설정
    ended_at = Column(DateTime(timezone=True), nullable=True)    # ENDED가 될 때 설정
    
    # 템플릿 설정의 스냅샷 (템플릿이 수정되어도 이 세션은 영향받지 않음)
    settings_snapshot_json = Column(JSON, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template = relationship("SessionTemplate")
    join_codes = relationship("JoinCode", back_populates="session_run")
    enrollments = relationship("Enrollment", back_populates="session_run")

    def __repr__(self):
        return f"<SessionRun(id={self.id}, status={self.status.value}, template_id={self.template_id})>"


# Add indexes for performance
Index('idx_session_runs_template_id', SessionRun.template_id)
Index('idx_session_runs_status', SessionRun.status)
Index('idx_session_runs_created_at', SessionRun.created_at)