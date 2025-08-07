#!/bin/bash
set -e

echo "🍎 맥미니 완전 자동화 운영 환경 설정"
echo "======================================="

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 현재 경로
PROJECT_PATH=$(pwd)

# 1. Docker Desktop 확인 및 시작
echo -e "\n${BLUE}🐳 Docker Desktop 확인...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker Desktop이 실행되지 않았습니다. 시작 중...${NC}"
    open -a Docker
    echo "Docker가 완전히 시작될 때까지 30초 대기..."
    sleep 30
    
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker Desktop을 시작할 수 없습니다.${NC}"
        echo "Docker Desktop을 수동으로 실행한 후 다시 시도하세요."
        exit 1
    fi
fi
echo -e "${GREEN}✅ Docker Desktop 실행 확인${NC}"

# 2. 환경변수 확인
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "\n${YELLOW}⚠️  OpenAI API 키가 설정되지 않았습니다.${NC}"
    echo "다음 명령어로 설정하세요:"
    echo 'export OPENAI_API_KEY="your-api-key-here"'
    echo ""
    read -p "계속하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 3. 스크립트 실행 권한 설정
echo -e "\n${BLUE}🔧 스크립트 실행 권한 설정...${NC}"
chmod +x scripts/*.sh
echo -e "${GREEN}✅ 완료${NC}"

# 4. 운영 환경 배포
echo -e "\n${BLUE}🚀 운영 환경 배포 시작...${NC}"
./scripts/macmini-deploy.sh

# 5. 자동 시작 설정
echo -e "\n${BLUE}⚙️  자동 시작 설정...${NC}"
read -p "맥북 재시작 시 자동으로 서비스를 시작하도록 설정하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/setup-autostart.sh
else
    echo -e "${YELLOW}자동 시작 설정을 건너뛰었습니다.${NC}"
fi

# 6. Cloudflare 터널 설정
echo -e "\n${BLUE}🌐 Cloudflare 터널 설정...${NC}"
read -p "외부 도메인 접속을 위해 Cloudflare 터널을 설정하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/setup-cloudflare.sh
else
    echo -e "${YELLOW}Cloudflare 설정을 건너뛰었습니다.${NC}"
fi

# 7. 최종 상태 확인
echo -e "\n${BLUE}📊 최종 상태 확인...${NC}"
./scripts/service-manager.sh status || true

# 8. 완료 메시지
echo ""
echo -e "${GREEN}🎉 맥미니 운영 환경 설정 완료!${NC}"
echo ""
echo -e "${BLUE}📌 유용한 명령어:${NC}"
echo -e "  상태 확인: ${GREEN}./scripts/service-manager.sh status${NC}"
echo -e "  로그 확인: ${GREEN}./scripts/service-manager.sh logs${NC}"
echo -e "  서비스 재시작: ${GREEN}./scripts/service-manager.sh restart${NC}"
echo -e "  업데이트: ${GREEN}./scripts/service-manager.sh update${NC}"
echo ""
echo -e "${BLUE}🌐 접속 주소:${NC}"
echo -e "  로컬: ${GREEN}http://localhost${NC}"
if [ -f "/etc/cloudflared/config.yml" ]; then
    echo -e "  교사용: ${GREEN}https://teacher.llmclass.org${NC}"
    echo -e "  학생용: ${GREEN}https://llmclass.org${NC}"
fi
echo ""
echo -e "${GREEN}✨ 모든 설정이 완료되었습니다!${NC}"