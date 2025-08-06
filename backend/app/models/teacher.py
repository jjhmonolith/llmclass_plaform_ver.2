"""
Teacher 모델 정의
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Teacher(Base):
    """교사 모델"""
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session_templates = relationship("SessionTemplate", back_populates="teacher")
    
    def __repr__(self):
        return f"<Teacher(id={self.id}, email='{self.email}')>"