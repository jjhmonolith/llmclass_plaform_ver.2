"""
레이트 리밋 시스템
"""
import time
from typing import Dict
from collections import defaultdict, deque
from fastapi import HTTPException, Request
from .config import settings


class RateLimiter:
    """메모리 기반 레이트 리미터"""
    
    def __init__(self):
        # IP별 요청 기록: {ip: deque([timestamp, ...])}
        self.requests: Dict[str, deque] = defaultdict(lambda: deque())
    
    def check_rate_limit(self, ip: str, limit: int, window_seconds: int = 60) -> bool:
        """레이트 리밋 확인
        
        Args:
            ip: 클라이언트 IP 주소
            limit: 허용 요청 수
            window_seconds: 시간 윈도우 (초)
        
        Returns:
            True: 허용, False: 제한 초과
        """
        current_time = time.time()
        requests = self.requests[ip]
        
        # 윈도우 밖의 오래된 요청 제거
        while requests and requests[0] < current_time - window_seconds:
            requests.popleft()
        
        # 현재 요청 수가 제한을 초과하는지 확인
        if len(requests) >= limit:
            return False
        
        # 새 요청 기록
        requests.append(current_time)
        return True
    
    def get_remaining_requests(self, ip: str, limit: int, window_seconds: int = 60) -> int:
        """남은 요청 수 반환"""
        current_time = time.time()
        requests = self.requests[ip]
        
        # 윈도우 밖의 오래된 요청 제거
        while requests and requests[0] < current_time - window_seconds:
            requests.popleft()
        
        return max(0, limit - len(requests))


# 전역 레이트 리미터 인스턴스
rate_limiter = RateLimiter()


def check_auth_rate_limit(request: Request):
    """인증 관련 레이트 리밋 검사"""
    client_ip = request.client.host
    limit = settings.auth_login_rate_per_min
    
    if not rate_limiter.check_rate_limit(client_ip, limit, 60):
        remaining = rate_limiter.get_remaining_requests(client_ip, limit, 60)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Too many login attempts",
                "message": f"로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.",
                "remaining_requests": remaining,
                "retry_after": 60
            }
        )