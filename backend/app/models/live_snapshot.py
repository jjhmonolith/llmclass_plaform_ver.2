"""
라이브 스냅샷 API 모델
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class StudentSnapshot(BaseModel):
    """학생별 스냅샷 정보"""
    student_name: str = Field(..., description="학생 이름")
    last_seen_at: Optional[str] = Field(None, description="마지막 활동 시각 (ISO format)")
    turns_total: int = Field(0, description="총 턴 수")
    last_activity_key: Optional[str] = Field(None, description="마지막 활동 키")
    last_turn_index: Optional[int] = Field(None, description="마지막 턴 인덱스")


class LiveSnapshotResponse(BaseModel):
    """라이브 스냅샷 응답"""
    run_id: int = Field(..., description="세션 ID")
    status: str = Field(..., description="세션 상태")
    window_sec: int = Field(..., description="활성 기준 시간(초)")
    joined_total: int = Field(..., description="총 참여자 수")
    active_recent: int = Field(..., description="최근 활성 참여자 수")
    idle_recent: int = Field(..., description="최근 비활성 참여자 수")
    students: List[StudentSnapshot] = Field(..., description="학생별 상세 정보")


class RecentLogItem(BaseModel):
    """최근 로그 항목"""
    student_name: str = Field(..., description="학생 이름")
    activity_key: str = Field(..., description="활동 키")
    turn_index: int = Field(..., description="턴 인덱스")
    created_at: str = Field(..., description="생성 시각 (ISO format)")


class RecentLogsResponse(BaseModel):
    """최근 로그 응답"""
    run_id: int = Field(..., description="세션 ID")
    logs: List[RecentLogItem] = Field(..., description="최근 로그 목록")