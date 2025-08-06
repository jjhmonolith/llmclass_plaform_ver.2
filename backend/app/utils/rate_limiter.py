"""
간단한 인메모리 레이트 리미터
운영환경에서는 Redis 등으로 교체 권장
"""
from datetime import datetime, timedelta
from typing import Dict, List
import threading


class RateLimiter:
    def __init__(self, max_requests: int, window_minutes: int):
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        self.requests: Dict[str, List[datetime]] = {}
        self.lock = threading.Lock()
    
    def is_allowed(self, key: str) -> bool:
        """
        키에 대한 요청이 허용되는지 확인
        """
        now = datetime.now()
        window_start = now - timedelta(minutes=self.window_minutes)
        
        with self.lock:
            # 해당 키의 요청 기록 가져오기
            if key not in self.requests:
                self.requests[key] = []
            
            # 윈도우 외부의 오래된 요청들 정리
            self.requests[key] = [
                req_time for req_time in self.requests[key] 
                if req_time > window_start
            ]
            
            # 최대 요청 수 확인
            if len(self.requests[key]) >= self.max_requests:
                return False
            
            # 요청 기록
            self.requests[key].append(now)
            return True
    
    def reset(self, key: str):
        """특정 키의 레이트리밋 리셋"""
        with self.lock:
            if key in self.requests:
                del self.requests[key]
    
    def clear_all(self):
        """모든 레이트리밋 기록 삭제"""
        with self.lock:
            self.requests.clear()