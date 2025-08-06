"""
라이브 세션 현황 스냅샷 서비스
"""
from datetime import datetime, timezone, timedelta
import pytz
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from app.models.session_run import SessionRun
from app.models.enrollment import Enrollment
from app.models.activity_log import ActivityLog


class LiveSnapshotService:
    """라이브 세션 현황 집계 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_run_live_snapshot(
        self, 
        run_id: int, 
        window_sec: int = 300
    ) -> Optional[Dict[str, Any]]:
        """
        세션의 라이브 현황 스냅샷을 반환
        
        Args:
            run_id: 세션 ID
            window_sec: 활성 기준 시간(초) - 기본 5분
            
        Returns:
            스냅샷 데이터 또는 None (세션이 없을 경우)
        """
        # 세션 정보 조회
        session_run = self.db.query(SessionRun).filter(SessionRun.id == run_id).first()
        if not session_run:
            return None
        
        # 활성 기준 시간 계산
        active_threshold = datetime.now(timezone.utc) - timedelta(seconds=window_sec)
        
        # 전체 참여자 수 조회
        joined_total = self.db.query(func.count(Enrollment.id)).filter(
            Enrollment.run_id == run_id
        ).scalar() or 0
        
        # 최근 활성 참여자 수 계산
        active_recent = self.db.query(func.count(Enrollment.id)).filter(
            and_(
                Enrollment.run_id == run_id,
                Enrollment.last_seen_at >= active_threshold
            )
        ).scalar() or 0
        
        idle_recent = joined_total - active_recent
        
        # 학생별 상세 정보 조회
        students = self._get_students_detail(run_id)
        
        return {
            "run_id": run_id,
            "status": session_run.status,
            "window_sec": window_sec,
            "joined_total": joined_total,
            "active_recent": active_recent,
            "idle_recent": idle_recent,
            "students": students
        }
    
    def _get_students_detail(self, run_id: int) -> List[Dict[str, Any]]:
        """
        학생별 상세 정보 조회
        
        Args:
            run_id: 세션 ID
            
        Returns:
            학생별 상세 정보 리스트
        """
        # 학생별 총 턴 수와 마지막 활동 정보 서브쿼리
        latest_activity_subq = (
            self.db.query(
                ActivityLog.student_name,
                func.count(ActivityLog.id).label('turns_total'),
                func.max(ActivityLog.created_at).label('last_activity_at'),
                # 마지막 활동 정보를 위한 윈도우 함수 사용
                ActivityLog.activity_key.label('last_activity_key'),
                ActivityLog.turn_index.label('last_turn_index')
            )
            .filter(ActivityLog.run_id == run_id)
            .group_by(ActivityLog.student_name)
            .subquery()
        )
        
        # enrollment와 조인하여 최종 결과 생성
        results = (
            self.db.query(
                Enrollment.normalized_student_name.label('student_name'),
                Enrollment.last_seen_at,
                func.coalesce(latest_activity_subq.c.turns_total, 0).label('turns_total'),
                latest_activity_subq.c.last_activity_key,
                latest_activity_subq.c.last_turn_index
            )
            .outerjoin(
                latest_activity_subq,
                Enrollment.normalized_student_name == latest_activity_subq.c.student_name
            )
            .filter(Enrollment.run_id == run_id)
            .order_by(desc(Enrollment.last_seen_at))
            .all()
        )
        
        students = []
        for result in results:
            # 각 학생의 최신 활동 정보를 별도로 조회 (더 정확한 방법)
            latest_activity = (
                self.db.query(ActivityLog)
                .filter(
                    and_(
                        ActivityLog.run_id == run_id,
                        ActivityLog.student_name == result.student_name
                    )
                )
                .order_by(desc(ActivityLog.created_at))
                .first()
            )
            
            # 시간이 있을 경우 한국 시간대로 변환하여 반환
            last_seen_formatted = None
            if result.last_seen_at:
                # naive datetime을 UTC로 가정하고 한국 시간대로 변환
                if result.last_seen_at.tzinfo is None:
                    utc_time = result.last_seen_at.replace(tzinfo=timezone.utc)
                else:
                    utc_time = result.last_seen_at
                
                # 한국 시간대로 변환
                kst = pytz.timezone('Asia/Seoul')
                local_time = utc_time.astimezone(kst)
                last_seen_formatted = local_time.strftime('%Y-%m-%dT%H:%M:%S')
            
            students.append({
                "student_name": result.student_name,
                "last_seen_at": last_seen_formatted,
                "turns_total": result.turns_total,
                "last_activity_key": latest_activity.activity_key if latest_activity else None,
                "last_turn_index": latest_activity.turn_index if latest_activity else None
            })
        
        return students
    
    def get_recent_logs(
        self, 
        run_id: int, 
        limit: int = 50
    ) -> Optional[List[Dict[str, Any]]]:
        """
        최근 활동 로그 미리보기 (내용 제외)
        
        Args:
            run_id: 세션 ID
            limit: 조회할 로그 수
            
        Returns:
            최근 로그 리스트 또는 None (세션이 없을 경우)
        """
        # 세션 존재 여부 확인
        session_exists = self.db.query(SessionRun).filter(SessionRun.id == run_id).first()
        if not session_exists:
            return None
        
        # 최근 로그 조회 (내용 필드 제외)
        recent_logs = (
            self.db.query(
                ActivityLog.student_name,
                ActivityLog.activity_key,
                ActivityLog.turn_index,
                ActivityLog.created_at
            )
            .filter(ActivityLog.run_id == run_id)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
            .all()
        )
        
        return [
            {
                "student_name": log.student_name,
                "activity_key": log.activity_key,
                "turn_index": log.turn_index,
                "created_at": log.created_at.isoformat()
            }
            for log in recent_logs
        ]