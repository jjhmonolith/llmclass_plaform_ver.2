#!/usr/bin/env python3
"""
테스트용 템플릿 생성 스크립트
"""
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import Teacher, SessionTemplate

def create_template():
    """테스트용 템플릿 생성"""
    db = SessionLocal()
    try:
        # 교사 계정 조회
        teacher = db.query(Teacher).filter(Teacher.email == "teacher@example.com").first()
        if not teacher:
            print("교사 계정을 찾을 수 없습니다.")
            return
        
        # 기존 템플릿 확인
        existing = db.query(SessionTemplate).filter(SessionTemplate.teacher_id == teacher.id).first()
        if existing:
            print(f"템플릿이 이미 존재합니다: {existing.title} (ID: {existing.id})")
            return
        
        # 새 템플릿 생성
        template = SessionTemplate(
            teacher_id=teacher.id,
            mode_id="strategic_writing",
            title="테스트 전략적 글쓰기 세션",
            settings_json={
                "topic": "AI의 미래",
                "difficulty": "중급"
            }
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        print(f"템플릿이 생성되었습니다: {template.title} (ID: {template.id})")
        
    except Exception as e:
        print(f"오류: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_template()