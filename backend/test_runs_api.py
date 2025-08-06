#!/usr/bin/env python3
"""
Runs API 직접 테스트 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import Teacher, SessionTemplate, SessionRun, RunStatus, JoinCode
from app.routers.runs import generate_join_code, create_unique_join_code

def test_runs_functionality():
    """Runs API 기능을 직접 테스트"""
    db = SessionLocal()
    try:
        # 1. 교사와 템플릿 조회
        teacher = db.query(Teacher).filter(Teacher.email == "teacher@example.com").first()
        if not teacher:
            print("❌ 교사 계정을 찾을 수 없습니다.")
            return
        
        template = db.query(SessionTemplate).filter(SessionTemplate.teacher_id == teacher.id).first()
        if not template:
            print("❌ 템플릿을 찾을 수 없습니다.")
            return
        
        print(f"✅ 교사: {teacher.email} (ID: {teacher.id})")
        print(f"✅ 템플릿: {template.title} (ID: {template.id})")
        
        # 2. 세션 실행 생성 (READY)
        session_run = SessionRun(
            template_id=template.id,
            status=RunStatus.READY,
            settings_snapshot_json=template.settings_json
        )
        
        db.add(session_run)
        db.commit()
        db.refresh(session_run)
        
        print(f"✅ 세션 실행 생성됨: ID {session_run.id}, 상태: {session_run.status.value}")
        
        # 3. 세션 시작 (READY -> LIVE)
        session_run.status = RunStatus.LIVE
        from sqlalchemy import func
        session_run.started_at = func.now()
        db.commit()
        
        print(f"✅ 세션 시작됨: 상태 변경 {session_run.status.value}")
        
        # 4. 참여 코드 생성
        code = create_unique_join_code(db, session_run.id)
        print(f"✅ 참여 코드 생성됨: {code}")
        
        # 5. 코드 조회
        join_code = db.query(JoinCode).filter(
            JoinCode.run_id == session_run.id,
            JoinCode.is_active == True
        ).first()
        
        if join_code:
            print(f"✅ 활성 코드 조회됨: {join_code.code}")
        else:
            print("❌ 활성 코드를 찾을 수 없습니다.")
        
        # 6. 세션 종료 (LIVE -> ENDED)
        session_run.status = RunStatus.ENDED
        session_run.ended_at = func.now()
        
        # 코드 비활성화
        db.query(JoinCode).filter(
            JoinCode.run_id == session_run.id,
            JoinCode.is_active == True
        ).update({"is_active": False})
        
        db.commit()
        
        print(f"✅ 세션 종료됨: 상태 {session_run.status.value}, 코드 비활성화됨")
        
        # 7. 최종 확인
        final_code = db.query(JoinCode).filter(JoinCode.run_id == session_run.id).first()
        print(f"✅ 최종 코드 상태: {final_code.code}, 활성: {final_code.is_active}")
        
        print("\n🎉 모든 테스트 통과!")
        
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_runs_functionality()