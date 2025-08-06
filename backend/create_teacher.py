#!/usr/bin/env python3
"""
테스트용 교사 계정 생성 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.models.teacher import Teacher
from app.core.security import hash_password

def create_teacher():
    """테스트용 교사 계정 생성"""
    db = SessionLocal()
    try:
        # 기존 계정 확인
        existing = db.query(Teacher).filter(Teacher.email == "teacher@example.com").first()
        if existing:
            print("교사 계정이 이미 존재합니다.")
            return
        
        # 새 교사 계정 생성
        teacher = Teacher(
            email="teacher@example.com",
            password_hash=hash_password("password123")
        )
        
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        
        print(f"교사 계정이 생성되었습니다: {teacher.email} (ID: {teacher.id})")
        
    except Exception as e:
        print(f"오류: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_teacher()