#!/bin/bash

echo "🚀 LLM Classroom Proto4 서버 시작 중..."

# 백엔드 서버 시작 (백그라운드)
echo "📡 백엔드 서버 시작..."
cd /Users/jjh_server/llmclass_platform/llm_classroom_proto4/backend
python3 main.py &
BACKEND_PID=$!
echo "✅ 백엔드 서버 시작됨 (PID: $BACKEND_PID)"

# 잠시 대기 (서버 시작 시간)
sleep 3

# Cloudflare Tunnel 시작 (백그라운드)
echo "🌐 Cloudflare Tunnel 시작..."
cloudflared tunnel run a2f0f49b-254f-4c76-a6bb-a6aa266dd3d9 &
TUNNEL_PID=$!
echo "✅ Cloudflare Tunnel 시작됨 (PID: $TUNNEL_PID)"

echo ""
echo "🎉 모든 서비스가 시작되었습니다!"
echo "📍 로컬 접속: http://localhost:8000"
echo "🌍 외부 접속: https://socratic.llmclass.org"
echo ""
echo "⚠️  서버를 중지하려면 이 터미널에서 Ctrl+C를 누르세요"
echo ""

# PID 파일에 저장 (나중에 종료용)
echo $BACKEND_PID > /tmp/llm_classroom_backend.pid
echo $TUNNEL_PID > /tmp/llm_classroom_tunnel.pid

# 무한 대기 (사용자가 Ctrl+C로 종료할 때까지)
trap 'echo ""; echo "🛑 서버 종료 중..."; kill $BACKEND_PID $TUNNEL_PID; exit' INT
wait