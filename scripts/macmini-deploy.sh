#!/bin/bash
set -e

echo "🍎 맥미니 운영 환경 배포 스크립트"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# OpenAI API 키 설정 (환경변수에서 가져오거나 기본값 사용)
OPENAI_KEY="${OPENAI_API_KEY:-your-openai-api-key-here}"

echo -e "${BLUE}🔧 환경변수 설정 중...${NC}"

# 1. 메인 환경변수 파일 생성
cp .env.sample .env.production 2>/dev/null || cat > .env.production << 'EOF'
# 프로덕션 환경 설정
TZ=Asia/Seoul
APP_ENV=prod
DEBUG_MODE=false
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATABASE_URL=sqlite:///./data/app.db
SESSION_SECRET=prod-secure-session-secret-change-this-in-production-2025
ACTIVITY_TOKEN_SECRET=prod-secure-activity-token-secret-change-this-2025
SECURE_COOKIES=true
CORS_ORIGINS=https://llmclass.org,https://www.llmclass.org,https://teacher.llmclass.org
MIN_TEACHER_PASSWORD_LEN=6
AUTH_LOGIN_RATE_PER_MIN=5
CODE_LENGTH=6
MAX_STUDENTS_PER_RUN=60
REJOIN_PIN_LENGTH=4
JOIN_ATTEMPT_RATE_PER_MIN=30
ACTIVITY_WRITE_RATE_PER_MIN=120
ENABLE_TEST_ROUTES=false
ENABLE_DEBUG_ROUTES=false
LOG_LEVEL=INFO
VITE_APP_ENV=prod
VITE_API_BASE=/api
EOF

# 2. Proto4 환경변수 파일 생성
mkdir -p prototypes/proto4/backend
cat > prototypes/proto4/backend/.env.production << EOF
OPENAI_API_KEY=${OPENAI_KEY}
HOST=0.0.0.0
PORT=3001
EOF

echo -e "${GREEN}✅ 환경변수 파일 생성 완료${NC}"

# 3. 프론트엔드 빌드
echo -e "${BLUE}🏗️  프론트엔드 빌드...${NC}"
cd frontend

# Node.js 의존성 설치
echo "📦 의존성 설치 중..."
npm install

# 빌드 실행
echo "🔨 빌드 실행 중..."
npm run build

cd ..

# 4. 정적 파일 복사
echo -e "${BLUE}📋 정적 파일 복사...${NC}"
rm -rf backend/static
cp -r frontend/dist backend/static

# 5. Docker 실행
echo -e "${BLUE}🐳 Docker 컨테이너 시작...${NC}"

# 기존 컨테이너 정리
docker-compose down 2>/dev/null || true

# 새 컨테이너 빌드 및 시작
docker-compose build
docker-compose up -d

# 6. 상태 확인
echo -e "${BLUE}🔍 서비스 상태 확인...${NC}"
sleep 10

if curl -f http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 서비스 정상 작동 중${NC}"
else
    echo -e "${YELLOW}⚠️  서비스 시작 중... 잠시 후 다시 확인하세요${NC}"
fi

echo ""
echo -e "${GREEN}🎉 맥미니 배포 완료!${NC}"
echo -e "${GREEN}📊 로컬 접속: http://localhost${NC}"
echo -e "${GREEN}🔧 상태 확인: docker-compose ps${NC}"
echo -e "${GREEN}📋 로그 확인: docker-compose logs -f${NC}"
echo ""
echo -e "${BLUE}🌐 Cloudflare 연동이 필요한 경우:${NC}"
echo -e "${BLUE}   ./scripts/setup-cloudflare.sh${NC}"