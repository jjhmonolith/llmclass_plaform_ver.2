"""
FastAPI 메인 애플리케이션
"""
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .routers import auth, modes, templates, runs, join, activity_log, live_snapshot
from .middleware.rate_limit import RateLimitMiddleware

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title=settings.app_name,
    description="교육용 LLM 플랫폼 API",
    version="1.0.0",
    debug=settings.debug
)

# Rate limiting middleware (레이트리밋 설정)
app.add_middleware(
    RateLimitMiddleware,
    rates={
        "/api/join": (settings.join_attempt_rate_per_min, 60),  # 30 requests per minute
        "/api/auth/login": (settings.auth_login_rate_per_min, 60),  # 5 requests per minute
        "/api/activity-log": (settings.activity_write_rate_per_min, 60),  # 120 requests per minute
        "/api/runs/.*/live-snapshot": (12, 60),  # 12 requests per minute for live snapshot
        "/api/runs/.*/recent-logs": (12, 60),  # 12 requests per minute for recent logs
    }
)

# CORS 설정 
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(modes.router, prefix="/api/modes", tags=["modes"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(join.router, prefix="/api", tags=["join"])
app.include_router(activity_log.router, prefix="/api", tags=["activity-log"])
app.include_router(live_snapshot.router, prefix="/api", tags=["live-snapshot"])

# 정적 파일 서빙 (프로덕션용)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    
    # SPA를 위한 catch-all 라우트 (모든 경로를 index.html로 리디렉션)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA를 위한 catch-all 라우트"""
        # API 경로는 제외
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("health"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
        
        # 정적 파일 경로 확인
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return StaticFiles(directory=str(static_dir)).get_response(full_path)
        
        # 그 외는 모두 index.html로 서빙 (React Router 대응)
        index_path = static_dir / "index.html"
        if index_path.exists():
            return StaticFiles(directory=str(static_dir)).get_response("index.html")
        
        return JSONResponse(status_code=404, content={"error": "Static files not found"})


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "LLM Class Platform API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "timestamp": "2025-08-02T23:00:00Z"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """전역 예외 처리기"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "서버 내부 오류가 발생했습니다."
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3000,
        reload=True
    )