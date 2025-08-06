"""
Rate limiting middleware for API endpoints
"""
import time
import logging
from typing import Dict, Tuple
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rates: Dict[str, Tuple[int, int]] = None):
        """
        Rate limiting middleware
        
        Args:
            app: FastAPI application
            rates: Dict of {path_pattern: (requests, seconds)}
                  e.g., {"/api/join": (30, 60)} = 30 requests per 60 seconds
        """
        super().__init__(app)
        self.rates = rates or {}
        self.client_requests: Dict[str, Dict[str, list]] = {}  # {client_ip: {endpoint: [timestamps]}}
    
    def get_client_ip(self, request: Request) -> str:
        """
        Get real client IP, considering Cloudflare headers
        """
        # Cloudflare real IP headers (in order of preference)
        cf_headers = [
            "CF-Connecting-IP",  # Cloudflare
            "X-Forwarded-For",   # Proxy
            "X-Real-IP",         # Nginx
        ]
        
        for header in cf_headers:
            ip = request.headers.get(header)
            if ip:
                # X-Forwarded-For can contain multiple IPs, take the first
                return ip.split(',')[0].strip()
        
        # Fallback to direct connection IP
        client_host = request.client.host if request.client else "unknown"
        return client_host
    
    def is_rate_limited(self, client_ip: str, endpoint: str, max_requests: int, window_seconds: int) -> bool:
        """
        Check if client is rate limited for specific endpoint
        """
        now = time.time()
        
        # Initialize client tracking
        if client_ip not in self.client_requests:
            self.client_requests[client_ip] = {}
        
        if endpoint not in self.client_requests[client_ip]:
            self.client_requests[client_ip][endpoint] = []
        
        # Clean old requests outside the window
        requests = self.client_requests[client_ip][endpoint]
        self.client_requests[client_ip][endpoint] = [
            req_time for req_time in requests 
            if now - req_time < window_seconds
        ]
        
        # Check if rate limit exceeded
        current_requests = len(self.client_requests[client_ip][endpoint])
        if current_requests >= max_requests:
            logger.warning(f"Rate limit exceeded: IP={client_ip}, endpoint={endpoint}, requests={current_requests}/{max_requests}")
            return True
        
        # Add current request
        self.client_requests[client_ip][endpoint].append(now)
        return False
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request with rate limiting
        """
        path = request.url.path
        method = request.method
        
        # Check if this endpoint needs rate limiting
        rate_config = None
        for pattern, (max_req, window) in self.rates.items():
            if path.startswith(pattern):
                rate_config = (max_req, window)
                break
        
        if rate_config:
            client_ip = self.get_client_ip(request)
            max_requests, window_seconds = rate_config
            endpoint_key = f"{method}:{path}"
            
            if self.is_rate_limited(client_ip, endpoint_key, max_requests, window_seconds):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "message": "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
                        "retry_after": window_seconds
                    },
                    headers={
                        "Retry-After": str(window_seconds),
                        "Cache-Control": "no-store"
                    }
                )
        
        response = await call_next(request)
        
        # Add no-cache headers for join and activity-log endpoints
        if path.startswith(("/api/join", "/api/activity-log")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        
        return response