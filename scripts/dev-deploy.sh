#!/bin/bash
set -e

echo "🔧 개발 환경 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 개발 환경 설정 중...${NC}"

# 1. 백엔드 설정 및 시작
echo -e "${BLUE}🏗️  백엔드 설정...${NC}"
cd backend

# 가상환경 확인 (선택사항)
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  가상환경이 없습니다. python3 -m venv venv 실행을 권장합니다.${NC}"
fi

# 종속성 설치
pip install -r requirements.txt

# 환경변수 확인
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. .env.sample을 복사합니다.${NC}"
    cp .env.sample .env
    echo -e "${YELLOW}🔧 .env 파일을 수정하여 OpenAI API 키를 설정하세요!${NC}"
fi

# 데이터베이스 초기화
echo -e "${BLUE}📊 데이터베이스 초기화...${NC}"
PYTHONPATH=. python app/seed_modes.py

# 백엔드 시작 (백그라운드)
echo -e "${BLUE}🚀 플랫폼 백엔드 시작 (포트 3000)...${NC}"
PYTHONPATH=. python -m uvicorn app.main:app --reload --port 3000 &
BACKEND_PID=$!

cd ..

# 2. Proto4 백엔드 설정 및 시작
echo -e "${BLUE}🧠 Proto4 백엔드 설정...${NC}"
cd prototypes/proto4/backend

# 종속성 설치
pip install -r requirements.txt

# 환경변수 확인
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Proto4 .env 파일이 없습니다.${NC}"
    echo -e "${YELLOW}🔧 OpenAI API 키를 설정하세요: echo 'OPENAI_API_KEY=your-key' > .env${NC}"
    touch .env
fi

# Proto4 시작 (백그라운드)
echo -e "${BLUE}🚀 Proto4 백엔드 시작 (포트 3001)...${NC}"
python -m uvicorn main:app --reload --port 3001 &
PROTO4_PID=$!

cd ../../..

# 3. 프론트엔드 설정 및 시작
echo -e "${BLUE}📱 프론트엔드 설정...${NC}"
cd frontend

# Node 모듈 설치
npm install

# 환경변수 확인
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  프론트엔드 .env 파일이 없습니다. .env.sample을 복사합니다.${NC}"
    cp .env.sample .env
fi

# 프론트엔드 시작 (포어그라운드)
echo -e "${BLUE}🚀 프론트엔드 시작 (포트 5173)...${NC}"
echo ""
echo -e "${GREEN}✅ 개발 환경 준비 완료!${NC}"
echo -e "${GREEN}📊 백엔드: http://localhost:3000${NC}"
echo -e "${GREEN}🧠 Proto4: http://localhost:3001${NC}"
echo -e "${GREEN}📱 프론트엔드: http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}💡 종료하려면 Ctrl+C를 누르세요${NC}"

# 종료 시 백그라운드 프로세스들 정리
cleanup() {
    echo -e "\n${YELLOW}🛑 서비스 종료 중...${NC}"
    kill $BACKEND_PID $PROTO4_PID 2>/dev/null || true
    exit 0
}
trap cleanup EXIT

# 프론트엔드 시작
npm run dev