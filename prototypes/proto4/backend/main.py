from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.api.socratic_chat import router as chat_router

load_dotenv()

app = FastAPI(
    title="LLM Classroom Proto4 - Socratic Method",
    description="Socratic Method AI Learning System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
app.mount("/pages", StaticFiles(directory="../frontend/pages"), name="pages")

app.include_router(chat_router, prefix="/api/v1")

@app.get("/")
async def root():
    # index.html 파일을 서빙
    from fastapi.responses import FileResponse
    return FileResponse("../frontend/index.html")

@app.get("/health")
async def health():
    return {"status": "healthy"}

# OPTIONS 요청 전역 처리 (CORS preflight 대응)
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)