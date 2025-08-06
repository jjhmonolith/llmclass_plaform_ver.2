#!/bin/bash
# 간단한 로그인 플로우 테스트

echo "🧪 간단 로그인 플로우 테스트"
echo "=========================="

BACKEND_URL="http://localhost:3000"

# 1분 대기 (레이트리밋 해제)
echo "⏳ 레이트리밋 해제 대기 (10초)..."
sleep 10

echo ""
echo "🔐 로그인 테스트"
echo "---------------"

# 정상 로그인
echo "1. 로그인 중..."
LOGIN_RESPONSE=$(curl -s -c test_cookies.txt -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@teacher.com","password":"demo123"}')

echo "✅ 로그인 응답:"
echo $LOGIN_RESPONSE | jq .

# 사용자 정보 조회
echo ""
echo "2. 사용자 정보 조회..."
ME_RESPONSE=$(curl -s -b test_cookies.txt $BACKEND_URL/api/auth/me)
echo "✅ 사용자 정보:"
echo $ME_RESPONSE | jq .

# 로그아웃
echo ""
echo "3. 로그아웃..."
LOGOUT_RESPONSE=$(curl -s -b test_cookies.txt -c test_cookies_after.txt -X POST $BACKEND_URL/api/auth/logout)
echo "✅ 로그아웃 응답:"
echo $LOGOUT_RESPONSE | jq .

# 로그아웃 후 접근 시도
echo ""
echo "4. 로그아웃 후 접근 시도..."
AFTER_LOGOUT=$(curl -s -w "%{http_code}" -b test_cookies_after.txt $BACKEND_URL/api/auth/me)
HTTP_CODE=$(echo $AFTER_LOGOUT | tail -c 4)
RESPONSE_BODY=$(echo $AFTER_LOGOUT | head -c -4)

echo "HTTP 상태 코드: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ 올바른 응답: 401 Unauthorized"
else
    echo "❌ 예상 밖 응답: $HTTP_CODE"
    echo "응답 내용: $RESPONSE_BODY"
fi

# 정리
rm -f test_cookies.txt test_cookies_after.txt

echo ""
echo "🎯 브라우저에서 테스트하세요:"
echo "http://localhost:5173"