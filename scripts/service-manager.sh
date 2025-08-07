#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_PATH="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="com.llmclass.platform.ver2"

# 명령어 확인
COMMAND=${1:-help}

case $COMMAND in
    start)
        echo -e "${BLUE}🚀 서비스 시작...${NC}"
        cd "$PROJECT_PATH"
        docker-compose up -d
        echo -e "${GREEN}✅ 서비스가 시작되었습니다${NC}"
        ;;
        
    stop)
        echo -e "${BLUE}🛑 서비스 중지...${NC}"
        cd "$PROJECT_PATH"
        docker-compose down
        echo -e "${GREEN}✅ 서비스가 중지되었습니다${NC}"
        ;;
        
    restart)
        echo -e "${BLUE}🔄 서비스 재시작...${NC}"
        cd "$PROJECT_PATH"
        docker-compose restart
        echo -e "${GREEN}✅ 서비스가 재시작되었습니다${NC}"
        ;;
        
    status)
        echo -e "${BLUE}📊 서비스 상태 확인${NC}"
        echo ""
        
        # Docker 서비스 상태
        echo -e "${BLUE}🐳 Docker 컨테이너 상태:${NC}"
        cd "$PROJECT_PATH"
        docker-compose ps
        echo ""
        
        # LaunchDaemon 상태
        echo -e "${BLUE}⚙️  자동 시작 데몬 상태:${NC}"
        if sudo launchctl list | grep -q $SERVICE_NAME; then
            echo -e "${GREEN}✅ 자동 시작 활성화됨${NC}"
        else
            echo -e "${YELLOW}⚠️  자동 시작 비활성화${NC}"
        fi
        echo ""
        
        # Cloudflare 터널 상태
        echo -e "${BLUE}🌐 Cloudflare 터널 상태:${NC}"
        if pgrep -x "cloudflared" > /dev/null; then
            echo -e "${GREEN}✅ Cloudflare 터널 실행 중${NC}"
        else
            echo -e "${YELLOW}⚠️  Cloudflare 터널 미실행${NC}"
        fi
        echo ""
        
        # 헬스 체크
        echo -e "${BLUE}💓 헬스 체크:${NC}"
        if curl -s -f http://localhost/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ 서비스 정상 작동 중${NC}"
        else
            echo -e "${RED}❌ 서비스 응답 없음${NC}"
        fi
        ;;
        
    logs)
        echo -e "${BLUE}📋 실시간 로그 확인 (Ctrl+C로 종료)${NC}"
        cd "$PROJECT_PATH"
        docker-compose logs -f --tail=100
        ;;
        
    update)
        echo -e "${BLUE}🔄 서비스 업데이트...${NC}"
        cd "$PROJECT_PATH"
        
        # Git pull
        echo "📥 최신 코드 가져오기..."
        git pull
        
        # 프론트엔드 빌드
        echo "🏗️  프론트엔드 빌드..."
        cd frontend
        npm install
        npm run build
        cd ..
        
        # 정적 파일 복사
        echo "📋 정적 파일 업데이트..."
        rm -rf backend/static
        cp -r frontend/dist backend/static
        
        # Docker 재빌드
        echo "🐳 Docker 이미지 재빌드..."
        docker-compose build
        docker-compose up -d
        
        echo -e "${GREEN}✅ 업데이트 완료${NC}"
        ;;
        
    help|*)
        echo -e "${BLUE}📌 LLM Classroom Platform 서비스 관리자${NC}"
        echo ""
        echo "사용법: $0 [명령어]"
        echo ""
        echo "명령어:"
        echo "  start    - 서비스 시작"
        echo "  stop     - 서비스 중지"
        echo "  restart  - 서비스 재시작"
        echo "  status   - 서비스 상태 확인"
        echo "  logs     - 실시간 로그 확인"
        echo "  update   - 서비스 업데이트 (git pull + 재빌드)"
        echo "  help     - 도움말 표시"
        echo ""
        echo "예시:"
        echo "  $0 status"
        echo "  $0 restart"
        ;;
esac