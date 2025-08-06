"""
Template related schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ModeSchema(BaseModel):
    """Mode information schema"""
    id: str
    name: str
    version: str
    options_schema: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateCreateRequest(BaseModel):
    """Template creation request schema"""
    mode_id: str = Field(..., description="Mode ID")
    title: str = Field(..., min_length=1, max_length=200, description="Template title")
    settings_json: Dict[str, Any] = Field(..., description="Template settings")


class TemplateResponse(BaseModel):
    """Template response schema"""
    id: int
    mode_id: str
    title: str
    settings_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    # Include mode information
    mode: Optional[ModeSchema] = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Template list response schema"""
    templates: List[TemplateResponse]
    total: int
    page: int
    size: int
    total_pages: int


class ValidationError(BaseModel):
    """Validation error schema"""
    path: str
    message: str


class ValidationErrorResponse(BaseModel):
    """Validation error response schema"""
    valid: bool = False
    errors: List[ValidationError]