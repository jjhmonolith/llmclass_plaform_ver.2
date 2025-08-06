"""
Session Template model for storing teacher's templates
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SessionTemplate(Base):
    __tablename__ = "session_templates"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False, index=True)
    mode_id = Column(String(50), ForeignKey("modes.id"), nullable=False)
    title = Column(String(200), nullable=False)
    settings_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    teacher = relationship("Teacher", back_populates="session_templates")
    mode = relationship("Mode")

    def __repr__(self):
        return f"<SessionTemplate(id={self.id}, title='{self.title}', mode_id='{self.mode_id}')>"


# Add indexes for performance
Index('idx_session_templates_teacher_id', SessionTemplate.teacher_id)
Index('idx_session_templates_title', SessionTemplate.title)