"""
Enrollment Model - 학생 세션 참여 정보
"""
from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Enrollment(Base):
    """학생 세션 참여 정보"""
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("session_runs.id"), nullable=False, index=True)
    normalized_student_name = Column(String(20), nullable=False)  # lower(trim(name))
    rejoin_pin_hash = Column(String(255), nullable=False)  # Argon2id 해시
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    session_run = relationship("SessionRun", back_populates="enrollments")


# 중복 이름 방지 - Run 내에서 normalized_student_name 유일성
Index('idx_enrollments_unique_name_per_run', 
      Enrollment.run_id, 
      Enrollment.normalized_student_name,
      unique=True)