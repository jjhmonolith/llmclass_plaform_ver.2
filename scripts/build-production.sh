#!/bin/bash
set -e

echo "🏗️  Building LLM Classroom Platform for Production..."

# 현재 디렉토리 확인
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# 프론트엔드 빌드
echo "📦 Building Frontend..."
cd frontend
npm ci --only=production
npm run build
cd ..

# 빌드된 파일을 백엔드 static 폴더로 복사
echo "📋 Copying built files to backend static directory..."
rm -rf backend/static
cp -r frontend/dist backend/static

echo "✅ Production build completed successfully!"
echo "📊 Built files are available in:"
echo "   - frontend/dist (original)"
echo "   - backend/static (for serving)"

# 파일 크기 확인
echo ""
echo "📊 Build statistics:"
du -sh frontend/dist
echo "🗂️  Files:"
find frontend/dist -type f -name "*.js" -o -name "*.css" -o -name "*.html" | wc -l | xargs echo "   JavaScript/CSS/HTML files:"