#!/bin/bash
set -e

echo "🌐 Cloudflare Tunnel 설정 시작..."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m' 
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# cloudflared 설치 확인
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared가 설치되지 않았습니다.${NC}"
    echo "설치 방법:"
    echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: 다음 링크에서 다운로드 - https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
fi

echo -e "${GREEN}✅ cloudflared 설치 확인됨${NC}"

# 1. Cloudflare 로그인
echo -e "${BLUE}📝 Cloudflare 계정에 로그인합니다...${NC}"
echo "브라우저가 열리면 Cloudflare 계정으로 로그인하세요."
cloudflared tunnel login

# 2. 터널 생성 (기존에 있으면 건너뛰기)
echo -e "${BLUE}🚇 터널 생성 중...${NC}"
if cloudflared tunnel list | grep -q "llm-classroom-platform"; then
    echo -e "${YELLOW}⚠️  터널 'llm-classroom-platform'이 이미 존재합니다.${NC}"
else
    cloudflared tunnel create llm-classroom-platform
    echo -e "${GREEN}✅ 터널 'llm-classroom-platform' 생성 완료${NC}"
fi

# 3. DNS 레코드 설정
echo -e "${BLUE}🌍 DNS 레코드 설정 중...${NC}"

# 교사용 도메인
echo "teacher.llmclass.org DNS 레코드 설정..."
cloudflared tunnel route dns llm-classroom-platform teacher.llmclass.org

# 학생용 메인 도메인
echo "llmclass.org DNS 레코드 설정..."
cloudflared tunnel route dns llm-classroom-platform llmclass.org

# www 서브도메인
echo "www.llmclass.org DNS 레코드 설정..."
cloudflared tunnel route dns llm-classroom-platform www.llmclass.org

echo -e "${GREEN}✅ DNS 레코드 설정 완료${NC}"

# 4. 설정 파일 복사
echo -e "${BLUE}📄 설정 파일 복사 중...${NC}"
sudo mkdir -p /etc/cloudflared
sudo cp cloudflare/config.yml /etc/cloudflared/config.yml

echo -e "${GREEN}✅ 설정 파일 복사 완료${NC}"

# 5. 서비스 설치 (systemd)
if command -v systemctl &> /dev/null; then
    echo -e "${BLUE}🔧 시스템 서비스 설치 중...${NC}"
    sudo cloudflared service install
    echo -e "${GREEN}✅ 시스템 서비스 설치 완료${NC}"
else
    echo -e "${YELLOW}⚠️  systemd를 사용하지 않는 시스템입니다. 수동으로 터널을 시작해야 합니다.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cloudflare 설정 완료!${NC}"
echo ""
echo "📋 설정된 도메인:"
echo "   🏫 교사용: https://teacher.llmclass.org"
echo "   👨‍🎓 학생용: https://llmclass.org"
echo "   🌐 WWW: https://www.llmclass.org"
echo ""
echo "🚀 다음 단계:"
echo "   1. 플랫폼 서비스 시작: docker-compose up -d"
echo "   2. 터널 시작: sudo systemctl start cloudflared"
echo "   3. 터널 상태 확인: sudo systemctl status cloudflared"
echo ""
echo "🔍 수동 터널 시작 (테스트용):"
echo "   cloudflared tunnel run llm-classroom-platform"