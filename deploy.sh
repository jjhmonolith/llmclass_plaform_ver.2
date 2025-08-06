#!/bin/bash

# LLM Class Platform Ver.2 - 통합 배포 스크립트
# 맥미니 배포용

set -e

echo "🚀 LLM Class Platform Ver.2 배포 시작..."

# 1. 환경 체크
echo "📋 환경 요구사항 체크..."
python3 --version
node --version
npm --version

# 2. 백엔드 설정
echo "🔧 백엔드 설정 중..."
cd backend

# 가상환경 생성 (선택사항)
if [ ! -d "venv" ]; then
    echo "가상환경 생성 중..."
    python3 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
echo "의존성 설치 중..."
pip install -r requirements.txt

# 환경변수 파일 체크
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. .env.sample을 복사하여 설정하세요."
    cp .env.sample .env
    echo "📝 .env 파일을 편집하여 OpenAI API 키 등을 설정하세요."
    exit 1
fi

# 데이터베이스 마이그레이션
echo "📊 데이터베이스 마이그레이션..."
alembic upgrade head

# 3. 프론트엔드 설정
echo "🎨 프론트엔드 설정 중..."
cd ../frontend

# 의존성 설치
npm install

# 프로덕션 빌드
echo "빌드 중..."
npm run build

# 4. 배포 완료
cd ..
echo "✅ 배포 완료!"
echo ""
echo "🔧 서버 실행 방법:"
echo "1. 백엔드: cd backend && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "2. 프론트엔드: cd frontend && npm run preview"
echo ""
echo "🌐 접속 주소:"
echo "- 교사용: http://localhost:4173/teacher/login"
echo "- 학생용: http://localhost:4173/student/join"
echo ""
echo "📚 문서: README.md, S6_Proto4_Integration_Documentation.md"