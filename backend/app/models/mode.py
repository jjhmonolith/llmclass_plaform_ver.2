"""
Mode model for template types
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class Mode(Base):
    __tablename__ = "modes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False, default="1.0")
    options_schema = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Mode(id='{self.id}', name='{self.name}', version='{self.version}')>"