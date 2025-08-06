"""
Templates API router
"""
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.deps import get_db, get_current_teacher
from app.core.validation import validate_settings_against_schema
from app.models.teacher import Teacher
from app.models.mode import Mode
from app.models.session_template import SessionTemplate
from app.schemas.templates import (
    TemplateCreateRequest, 
    TemplateResponse, 
    TemplateListResponse,
    ValidationErrorResponse
)

router = APIRouter()


@router.post("/", response_model=TemplateResponse)
def create_template(
    template_data: TemplateCreateRequest,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Create a new template
    
    Validates settings_json against the mode's schema
    """
    # Check if mode exists
    mode = db.query(Mode).filter(Mode.id == template_data.mode_id).first()
    if not mode:
        raise HTTPException(status_code=404, detail="Mode not found")
    
    # Validate settings against mode schema
    is_valid, errors = validate_settings_against_schema(
        template_data.settings_json, 
        mode.options_schema
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=ValidationErrorResponse(errors=errors).dict()
        )
    
    # Create template
    template = SessionTemplate(
        teacher_id=current_teacher.id,
        mode_id=template_data.mode_id,
        title=template_data.title,
        settings_json=template_data.settings_json
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    # Load mode relationship
    db.refresh(template, ["mode"])
    
    return template


@router.get("/", response_model=TemplateListResponse)
def get_templates(
    query: Optional[str] = Query(None, description="Search query for title or mode name"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    sort: str = Query("created_at", description="Sort field: created_at, title, updated_at"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Get templates for current teacher with search, pagination and sorting
    """
    # Base query - only teacher's templates
    base_query = db.query(SessionTemplate).filter(
        SessionTemplate.teacher_id == current_teacher.id
    ).join(Mode)
    
    # Apply search filter
    if query:
        search_filter = or_(
            SessionTemplate.title.ilike(f"%{query}%"),
            Mode.name.ilike(f"%{query}%")
        )
        base_query = base_query.filter(search_filter)
    
    # Apply sorting
    sort_column = getattr(SessionTemplate, sort, SessionTemplate.created_at)
    if order.lower() == "asc":
        base_query = base_query.order_by(sort_column.asc())
    else:
        base_query = base_query.order_by(sort_column.desc())
    
    # Get total count
    total = base_query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    templates = base_query.offset(offset).limit(size).all()
    
    # Load mode relationships
    for template in templates:
        db.refresh(template, ["mode"])
    
    total_pages = math.ceil(total / size)
    
    return TemplateListResponse(
        templates=templates,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Get a specific template by ID
    
    Only allows access to teacher's own templates
    """
    template = db.query(SessionTemplate).filter(
        SessionTemplate.id == template_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Load mode relationship
    db.refresh(template, ["mode"])
    
    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Delete a template by ID
    
    Only allows deletion of teacher's own templates
    """
    template = db.query(SessionTemplate).filter(
        SessionTemplate.id == template_id,
        SessionTemplate.teacher_id == current_teacher.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    
    return {"ok": True, "message": "템플릿이 삭제되었습니다."}