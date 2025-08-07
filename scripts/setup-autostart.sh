#!/bin/bash
set -e

echo "🚀 맥북 자동 시작 설정 (LaunchDaemon + Docker)"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 현재 프로젝트 경로
PROJECT_PATH=$(pwd)
SERVICE_NAME="com.llmclass.platform.ver2"

echo -e "${BLUE}📁 프로젝트 경로: ${PROJECT_PATH}${NC}"

# 1. Docker Desktop 자동 시작 설정
echo -e "${BLUE}🐳 Docker Desktop 자동 시작 설정...${NC}"
if [ -d "/Applications/Docker.app" ]; then
    # Docker Desktop을 로그인 아이템에 추가
    osascript -e "tell application \"System Events\" to make login item at end with properties {name:\"Docker\", path:\"/Applications/Docker.app\", hidden:false}"
    echo -e "${GREEN}✅ Docker Desktop 자동 시작 설정 완료${NC}"
else
    echo -e "${RED}❌ Docker Desktop이 설치되지 않았습니다.${NC}"
    echo "brew install --cask docker 로 설치하세요."
    exit 1
fi

# 2. LaunchDaemon plist 파일 생성
echo -e "${BLUE}📄 LaunchDaemon 설정 파일 생성...${NC}"
sudo tee /Library/LaunchDaemons/${SERVICE_NAME}.plist > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${PROJECT_PATH}/scripts/start-daemon.sh</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${PROJECT_PATH}</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>
    
    <key>StandardOutPath</key>
    <string>${PROJECT_PATH}/logs/daemon.log</string>
    
    <key>StandardErrorPath</key>
    <string>${PROJECT_PATH}/logs/daemon.error.log</string>
    
    <key>StartInterval</key>
    <integer>30</integer>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
    
    <key>UserName</key>
    <string>$(whoami)</string>
    
    <key>GroupName</key>
    <string>staff</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>$(eval echo ~$(whoami))</string>
    </dict>
</dict>
</plist>
EOF

# 3. 데몬 시작 스크립트 생성
echo -e "${BLUE}🔧 데몬 시작 스크립트 생성...${NC}"
cat > ${PROJECT_PATH}/scripts/start-daemon.sh << 'EOF'
#!/bin/bash

# 로그 디렉토리 생성
PROJECT_DIR="$(dirname "$(dirname "$0")")"
mkdir -p "${PROJECT_DIR}/logs"

# 로그 함수
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "${PROJECT_DIR}/logs/daemon.log"
}

log "🚀 LLM Classroom Platform Ver.2 데몬 시작"

# Docker 상태 확인
if ! docker info >/dev/null 2>&1; then
    log "⏳ Docker가 시작되지 않음. 60초 대기..."
    sleep 60
    
    if ! docker info >/dev/null 2>&1; then
        log "❌ Docker를 시작할 수 없음"
        exit 1
    fi
fi

log "✅ Docker 연결 확인됨"

# 프로젝트 디렉토리로 이동
cd "${PROJECT_DIR}" || exit 1

# 컨테이너 상태 확인
if docker-compose ps | grep -q "Up"; then
    log "✅ 컨테이너가 이미 실행 중"
    exit 0
fi

# 환경변수 파일 확인
if [ ! -f ".env.production" ]; then
    log "⚠️ .env.production 파일이 없음. 기본 파일 생성"
    cp .env.sample .env.production 2>/dev/null || log "❌ .env.sample 파일 없음"
fi

if [ ! -f "prototypes/proto4/backend/.env.production" ]; then
    log "⚠️ Proto4 환경변수 파일이 없음"
    mkdir -p prototypes/proto4/backend
    cat > prototypes/proto4/backend/.env.production << 'PROTO_EOF'
OPENAI_API_KEY=your-openai-api-key-here
HOST=0.0.0.0
PORT=3001
PROTO_EOF
fi

# 컨테이너 시작
log "🐳 Docker 컨테이너 시작 중..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log "✅ 컨테이너 시작 성공"
else
    log "❌ 컨테이너 시작 실패"
    exit 1
fi

# 헬스 체크
log "💓 헬스 체크 수행 중..."
sleep 15

if curl -f http://localhost/health >/dev/null 2>&1; then
    log "✅ 서비스 정상 작동 확인"
else
    log "⚠️ 헬스 체크 실패 - 서비스 시작 중일 수 있음"
fi

log "🎉 데몬 실행 완료"
EOF

# 스크립트 실행 권한 부여
chmod +x ${PROJECT_PATH}/scripts/start-daemon.sh

# 4. 로그 디렉토리 생성
mkdir -p ${PROJECT_PATH}/logs

# 5. LaunchDaemon 로드 및 시작
echo -e "${BLUE}🔄 LaunchDaemon 로드 및 시작...${NC}"
sudo launchctl load /Library/LaunchDaemons/${SERVICE_NAME}.plist
sudo launchctl start ${SERVICE_NAME}

# 6. 상태 확인
echo -e "${BLUE}🔍 서비스 상태 확인...${NC}"
sleep 5

if sudo launchctl list | grep -q ${SERVICE_NAME}; then
    echo -e "${GREEN}✅ LaunchDaemon이 성공적으로 등록되었습니다${NC}"
else
    echo -e "${RED}❌ LaunchDaemon 등록에 실패했습니다${NC}"
fi

echo ""
echo -e "${GREEN}🎉 자동 시작 설정 완료!${NC}"
echo ""
echo -e "${BLUE}📋 관리 명령어:${NC}"
echo -e "${BLUE}   시작: sudo launchctl start ${SERVICE_NAME}${NC}"
echo -e "${BLUE}   중지: sudo launchctl stop ${SERVICE_NAME}${NC}"
echo -e "${BLUE}   제거: sudo launchctl unload /Library/LaunchDaemons/${SERVICE_NAME}.plist${NC}"
echo -e "${BLUE}   상태: sudo launchctl list | grep ${SERVICE_NAME}${NC}"
echo ""
echo -e "${BLUE}📊 로그 확인:${NC}"
echo -e "${BLUE}   tail -f ${PROJECT_PATH}/logs/daemon.log${NC}"
echo -e "${BLUE}   tail -f ${PROJECT_PATH}/logs/daemon.error.log${NC}"
echo ""
echo -e "${GREEN}✨ 이제 맥북 재시작 후에도 자동으로 서비스가 시작됩니다!${NC}"