"""
Modes API router
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.mode import Mode
from app.schemas.templates import ModeSchema

router = APIRouter()


@router.get("/", response_model=List[ModeSchema])
def get_modes(db: Session = Depends(get_db)):
    """
    Get all available modes
    
    Returns list of all modes with their schemas
    """
    modes = db.query(Mode).order_by(Mode.created_at.asc()).all()
    return modes