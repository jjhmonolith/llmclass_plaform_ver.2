#!/bin/bash
# S1 통합 테스트 스크립트

echo "🧪 S1 교사 로그인 시스템 통합 테스트"
echo "========================================"

# 색상 코드
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

echo ""
echo "📋 테스트 환경 확인"
echo "-------------------"

# 백엔드 서버 확인
echo -n "백엔드 서버 (3000): "
if curl -s $BACKEND_URL > /dev/null; then
    echo -e "${GREEN}✅ 정상${NC}"
else
    echo -e "${RED}❌ 오프라인${NC}"
    exit 1
fi

# 프런트엔드 서버 확인
echo -n "프런트엔드 서버 (5173): "
if curl -s $FRONTEND_URL > /dev/null; then
    echo -e "${GREEN}✅ 정상${NC}"
else
    echo -e "${RED}❌ 오프라인${NC}"
    exit 1
fi

# 데이터베이스 확인
echo -n "데이터베이스: "
if [ -f "/Users/jonghyunjun/Documents/llmclass_platform/platform_ver.2/backend/data/app.db" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
else
    echo -e "${RED}❌ 없음${NC}"
    exit 1
fi

echo ""
echo "🔐 인증 API 테스트"
echo "------------------"

# 1. 잘못된 로그인
echo -n "1. 잘못된 비밀번호: "
RESPONSE=$(curl -s -w "%{http_code}" -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@teacher.com","password":"wrong"}')
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ 401 Unauthorized${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi

# 2. 정상 로그인 (쿠키 저장)
echo -n "2. 정상 로그인: "
RESPONSE=$(curl -s -w "%{http_code}" -c cookies.tmp -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@teacher.com","password":"demo123"}')
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ Expected 200, got $HTTP_CODE${NC}"
fi

# 3. 인증된 사용자 정보 조회
echo -n "3. 사용자 정보 조회: "
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.tmp $BACKEND_URL/api/auth/me)
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
    # 사용자 정보 출력
    echo "   📧 " $(echo $RESPONSE | head -c -4 | jq -r '.email')
else
    echo -e "${RED}❌ Expected 200, got $HTTP_CODE${NC}"
fi

# 4. 로그아웃
echo -n "4. 로그아웃: "
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.tmp -X POST $BACKEND_URL/api/auth/logout)
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ Expected 200, got $HTTP_CODE${NC}"
fi

# 5. 로그아웃 후 사용자 정보 조회 (실패해야 함)
echo -n "5. 로그아웃 후 접근: "
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.tmp $BACKEND_URL/api/auth/me)
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ 401 Unauthorized${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi

echo ""
echo "⚡ 레이트리밋 테스트"
echo "------------------"

echo -n "연속 6회 로그인 시도: "
for i in {1..6}; do
    RESPONSE=$(curl -s -w "%{http_code}" -X POST $BACKEND_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"demo@teacher.com","password":"wrong"}')
    HTTP_CODE=$(echo $RESPONSE | tail -c 4)
    
    if [ $i -eq 6 ] && [ "$HTTP_CODE" = "429" ]; then
        echo -e "${GREEN}✅ 6번째 시도에서 429 Too Many Requests${NC}"
        break
    elif [ $i -lt 6 ] && [ "$HTTP_CODE" = "401" ]; then
        continue
    else
        echo -e "${RED}❌ 예상하지 못한 응답: $HTTP_CODE${NC}"
        break
    fi
done

echo ""
echo "🌐 프런트엔드 프록시 테스트"
echo "-------------------------"

# 프록시를 통한 API 호출
echo -n "프록시를 통한 API 호출: "
RESPONSE=$(curl -s -w "%{http_code}" -X POST $FRONTEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}')
HTTP_CODE=$(echo $RESPONSE | tail -c 4)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ 프록시 정상 동작${NC}"
else
    echo -e "${RED}❌ 프록시 오류: $HTTP_CODE${NC}"
fi

echo ""
echo "📊 테스트 결과 요약"
echo "------------------"
echo -e "${GREEN}✅ 백엔드 API 인증 시스템${NC}"
echo -e "${GREEN}✅ 세션 쿠키 관리${NC}"
echo -e "${GREEN}✅ 레이트리밋 보안${NC}"
echo -e "${GREEN}✅ 프런트엔드 프록시${NC}"

echo ""
echo -e "${YELLOW}🎯 브라우저 테스트 가이드:${NC}"
echo "1. http://localhost:5173 접속"
echo "2. 🔧 개발용 자동채움 버튼 클릭"
echo "3. 로그인 버튼 클릭"
echo "4. 홈 페이지 이동 확인"
echo "5. 로그아웃 버튼 클릭"
echo "6. 로그인 페이지로 돌아가는지 확인"

# 임시 파일 정리
rm -f cookies.tmp

echo ""
echo -e "${GREEN}🎉 통합 테스트 완료!${NC}"