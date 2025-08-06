#!/bin/bash
set -e

echo "🏭 운영 환경 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되지 않았습니다.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose가 설치되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 환경 확인 완료${NC}"

# 1. 프로덕션 빌드
echo -e "${BLUE}🏗️  프로덕션 빌드 시작...${NC}"
./scripts/build-production.sh

# 2. 환경변수 확인
echo -e "${BLUE}🔧 환경변수 확인...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production 파일이 없습니다.${NC}"
    echo "다음 명령으로 생성하세요:"
    echo "cp .env.sample .env.production"
    exit 1
fi

# Proto4 환경변수 확인
if [ ! -f "prototypes/proto4/backend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  Proto4 프로덕션 환경변수가 없습니다.${NC}"
    echo -e "${RED}❌ prototypes/proto4/backend/.env.production 파일을 생성하고 OpenAI API 키를 설정하세요.${NC}"
    echo "예시: echo 'OPENAI_API_KEY=your-openai-api-key' > prototypes/proto4/backend/.env.production"
    exit 1
fi

# 3. 기존 컨테이너 정리
echo -e "${BLUE}🧹 기존 컨테이너 정리...${NC}"
docker-compose down 2>/dev/null || true

# 4. Docker 이미지 빌드
echo -e "${BLUE}🐳 Docker 이미지 빌드...${NC}"
docker-compose build

# 5. 프로덕션 서비스 시작
echo -e "${BLUE}🚀 프로덕션 서비스 시작...${NC}"
docker-compose up -d

# 6. 서비스 상태 확인
echo -e "${BLUE}🔍 서비스 상태 확인...${NC}"
sleep 10

# 헬스 체크
echo -e "${BLUE}💓 헬스 체크 수행...${NC}"
if curl -f http://localhost:80/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 플랫폼 서비스 정상 작동${NC}"
else
    echo -e "${RED}❌ 플랫폼 서비스 응답 없음${NC}"
    docker-compose logs --tail=20
fi

# 7. Cloudflare 설정 안내
echo ""
echo -e "${GREEN}🎉 운영 환경 배포 완료!${NC}"
echo ""
echo -e "${BLUE}📋 서비스 상태:${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}🌐 Cloudflare 연동이 필요한 경우:${NC}"
echo -e "${YELLOW}   ./scripts/setup-cloudflare.sh${NC}"
echo ""
echo -e "${GREEN}📊 로컬 접속 URL:${NC}"
echo -e "${GREEN}   http://localhost:80${NC}"
echo ""
echo -e "${GREEN}🌍 도메인 접속 URL (Cloudflare 설정 후):${NC}"
echo -e "${GREEN}   🏫 교사용: https://teacher.llmclass.org${NC}"
echo -e "${GREEN}   👨‍🎓 학생용: https://llmclass.org${NC}"
echo ""
echo -e "${BLUE}📋 유용한 명령어:${NC}"
echo -e "${BLUE}   로그 확인: docker-compose logs -f${NC}"
echo -e "${BLUE}   서비스 중지: docker-compose down${NC}"
echo -e "${BLUE}   서비스 재시작: docker-compose restart${NC}"