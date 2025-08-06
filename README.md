# LLM Classroom Platform v2

🏫 **AI 기반 교육 플랫폼** - 교사가 AI 학습 세션을 생성하고 학생들이 참여할 수 있는 통합 솔루션

## 🌟 주요 기능

### 교사 기능
- 📚 **템플릿 관리**: 다양한 학습 모드로 템플릿 생성
- 🚀 **세션 운영**: 실시간 세션 시작/종료, 6자리 참여 코드 관리
- 📊 **모니터링**: 학생 활동 실시간 추적, 학습 데이터 분석
- 📈 **리포트**: 활동 로그, 턴별 대화 기록, 평가 데이터

### 학생 기능
- 🎯 **간편 참여**: 6자리 코드로 즉시 참여
- 🔐 **재참여 시스템**: PIN 기반 세션 재연결
- 🤖 **AI 대화**: 소크라테스식 학습법 기반 AI 튜터 대화
- 📱 **반응형 UI**: 모바일/데스크톱 최적화 인터페이스

### 소크라테스식 학습 (Proto4 통합)
- 🧠 **GPT-4o-mini 기반 AI 튜터**
- 📊 **5차원 평가**: 사고 깊이, 확장성, 적용성, 메타인지, 참여도
- 🎯 **적응형 학습**: 학생 수준에 맞는 질문 생성
- 📈 **실시간 피드백**: 이해도 점수 및 성장 지표

## 🏗️ 기술 스택

### Backend
- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM 및 데이터베이스 관리
- **SQLite**: 경량 데이터베이스 (프로덕션용)
- **Pydantic**: 데이터 검증 및 설정 관리

### Frontend
- **React 18**: 모던 UI 프레임워크
- **React Router**: SPA 라우팅
- **Vite**: 빠른 개발 빌드 도구
- **Vanilla CSS**: 커스텀 스타일링

### AI & Integration
- **OpenAI GPT-4o-mini**: 소크라테스식 대화 AI
- **Proto4**: 소크라테스식 학습 엔진
- **iframe 통합**: 원본 Proto4 UI 보존

### Infrastructure
- **Docker**: 컨테이너화
- **Nginx**: 리버스 프록시 및 정적 파일 서빙
- **Cloudflare**: CDN 및 보안

## 🚀 빠른 시작

### 개발 환경

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd llmclass_platform/platform_ver.2
   ```

2. **백엔드 설정**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # 환경변수 설정
   cp .env.example .env
   # .env 파일에서 OpenAI API 키 등 설정
   
   # 데이터베이스 초기화
   python app/seed_modes.py
   
   # 서버 시작
   python -m uvicorn app.main:app --reload --port 3000
   ```

3. **Proto4 백엔드 설정**
   ```bash
   cd prototypes/proto4/backend
   pip install -r requirements.txt
   
   # 환경변수 설정
   cp .env.example .env
   # OpenAI API 키 설정
   
   # 서버 시작
   python -m uvicorn main:app --reload --port 3001
   ```

4. **프론트엔드 설정**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### 프로덕션 배포

1. **환경 설정**
   ```bash
   # 프로덕션 환경변수 설정
   cp .env.production.example .env.production
   # 실제 도메인, API 키 등 설정
   ```

2. **Docker 빌드 및 실행**
   ```bash
   # 빌드
   docker-compose build
   
   # 실행
   docker-compose up -d
   ```

3. **Nginx 설정 (선택)**
   ```bash
   # SSL 인증서 설정
   mkdir nginx/ssl
   # SSL 인증서 파일 복사
   
   # Nginx 재시작
   docker-compose restart nginx
   ```

## 📁 프로젝트 구조

```
platform_ver.2/
├── backend/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── core/              # 설정, 데이터베이스
│   │   ├── models/            # SQLAlchemy 모델
│   │   ├── routers/           # API 라우터
│   │   └── middleware/        # 미들웨어
│   └── static/                # 빌드된 프론트엔드 (프로덕션)
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── hooks/            # 커스텀 훅
│   │   └── utils/            # 유틸리티
│   └── public/
│       └── proto4-chat.html  # Proto4 통합 페이지
├── prototypes/proto4/          # Proto4 소크라테스 엔진
│   └── backend/               # Proto4 API 서버
├── nginx/                      # Nginx 설정
├── scripts/                    # 배포 스크립트
└── docker-compose.yml         # 프로덕션 배포 설정
```

## 🔧 환경 변수

### 백엔드 (.env)
```env
# 환경 설정
APP_ENV=dev                    # dev | production
DEBUG_MODE=true

# 데이터베이스
DATABASE_URL=sqlite:///./data/app.db

# 인증
MIN_TEACHER_PASSWORD_LEN=6
AUTH_LOGIN_RATE_PER_MIN=5

# 세션 설정
CODE_LENGTH=6
MAX_STUDENTS_PER_RUN=60
REJOIN_PIN_LENGTH=4
```

### Proto4 (.env)
```env
# OpenAI 설정
OPENAI_API_KEY=your-openai-api-key

# 서버 설정
HOST=0.0.0.0
PORT=3001
```

## 🔒 보안 기능

- **레이트 리미팅**: API 엔드포인트별 요청 제한
- **CORS 설정**: 허용된 도메인만 접근 가능
- **세션 관리**: JWT 기반 인증 토큰
- **입력 검증**: Pydantic 기반 데이터 검증
- **SQL 인젝션 방지**: SQLAlchemy ORM 사용

## 📊 모니터링

- **헬스 체크**: `/health` 엔드포인트
- **로그 수집**: 구조화된 JSON 로그
- **활동 추적**: 학생 참여 및 대화 로그
- **에러 처리**: 전역 예외 처리기

## 🤝 기여하기

1. 이슈 등록 또는 기능 제안
2. Fork 후 브랜치 생성
3. 변경사항 커밋
4. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**버전**: 2.0.0  
**최근 업데이트**: 2025년 8월  
**호환성**: Python 3.11+, Node.js 18+