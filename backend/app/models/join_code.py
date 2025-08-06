"""
Join Code model for managing session access codes
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class JoinCode(Base):
    """세션 참여를 위한 6자리 코드"""
    __tablename__ = "join_codes"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("session_runs.id"), nullable=False, index=True)
    code = Column(String(6), nullable=False, index=True)  # 6자리 숫자 코드
    is_active = Column(Boolean, nullable=False, default=True, index=True)  # 활성화 여부
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session_run = relationship("SessionRun", back_populates="join_codes")

    def __repr__(self):
        return f"<JoinCode(id={self.id}, code='{self.code}', run_id={self.run_id}, is_active={self.is_active})>"


# Add indexes for performance and uniqueness
Index('idx_join_codes_run_id', JoinCode.run_id)
Index('idx_join_codes_is_active', JoinCode.is_active)

# CRITICAL: 활성 코드는 전체에서 유일해야 함 (PostgreSQL 스타일 부분 유니크 인덱스)
# SQLite에서는 WHERE 조건부 유니크 인덱스가 지원되므로 동일하게 사용 가능
Index('idx_join_codes_unique_active', JoinCode.code, 
      postgresql_where=JoinCode.is_active==True,
      sqlite_where=JoinCode.is_active==True,
      unique=True)