# S1: 교사 로그인 시스템 구현 완료

## 🎯 개요

**S1 교사 로그인 시스템**은 LLM Class Platform의 첫 번째 단계로, 교사 인증 및 세션 관리 기능을 제공합니다.

### 📋 구현 범위

- ✅ **S1-1**: DB teachers 테이블 생성 및 시드 계정 설정
- ✅ **S1-2**: 백엔드 인증 API 구현 (login/logout/me)  
- ✅ **S1-3**: 프런트 로그인 페이지 구현
- ✅ **S1-4**: 보호 라우트 및 홈 페이지 구현
- ✅ **S1-5**: 테스트 코드 및 문서 작성

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 프로젝트 클론 및 이동
cd /path/to/platform_ver.2

# 환경변수 파일 생성
cp .env.sample backend/.env

# 의존성 설치
make install
```

### 2. 데이터베이스 설정

```bash
# 데이터베이스 마이그레이션
make db-upgrade

# 시드 데이터 생성 (demo 계정)
make dev-seed
```

### 3. 서버 실행

```bash
# 백엔드 + 프런트엔드 동시 실행
make dev

# 또는 개별 실행
make backend    # 백엔드만 (포트 3000)
make frontend   # 프런트엔드만 (포트 5173)
```

### 4. 브라우저 접속

- **프런트엔드**: http://localhost:5173
- **백엔드 API**: http://localhost:3000
- **API 문서**: http://localhost:3000/docs

---

## 🔐 인증 시스템

### 기본 계정

| 항목 | 값 |
|------|-----|
| 이메일 | demo@teacher.com |
| 비밀번호 | demo123 |
| 역할 | 교사 |

### 보안 기능

- **bcrypt 해싱**: 안전한 비밀번호 저장
- **JWT 세션**: 토큰 기반 인증 (12시간 만료)
- **HttpOnly 쿠키**: XSS 공격 방지
- **레이트리밋**: 5회/분 로그인 시도 제한
- **자동 세션 갱신**: 3시간 이하 남을 때 자동 연장

---

## 🏗️ 시스템 아키텍처

### 백엔드 (FastAPI)

```
backend/
├── app/
│   ├── core/           # 핵심 모듈
│   │   ├── config.py   # 환경설정
│   │   ├── database.py # DB 연결
│   │   ├── security.py # 보안 함수
│   │   ├── session.py  # 세션 관리
│   │   ├── rate_limit.py # 레이트리밋
│   │   └── deps.py     # 의존성 함수
│   ├── models/         # 데이터 모델
│   │   └── teacher.py  # Teacher 모델
│   ├── routers/        # API 라우터
│   │   └── auth.py     # 인증 API
│   ├── schemas/        # Pydantic 스키마
│   │   └── auth.py     # 인증 스키마
│   ├── main.py         # FastAPI 앱
│   └── seed.py         # 시드 데이터
└── tests/              # 테스트 코드
    ├── conftest.py     # 테스트 설정
    ├── test_auth_flow.py # 인증 플로우 테스트
    ├── test_security.py  # 보안 테스트
    └── test_models.py    # 모델 테스트
```

### 프런트엔드 (React + Vite)

```
frontend/
├── src/
│   ├── contexts/       # React 컨텍스트
│   │   └── AuthContext.jsx # 인증 상태 관리
│   ├── pages/          # 페이지 컴포넌트
│   │   ├── TeacherLogin.jsx # 로그인 페이지
│   │   └── TeacherHome.jsx  # 홈 페이지
│   ├── components/     # 공통 컴포넌트
│   │   └── ProtectedRoute.jsx # 보호된 라우트
│   ├── utils/          # 유틸리티
│   │   └── api.js      # API 통신
│   ├── App.jsx         # 메인 앱
│   └── main.jsx        # 엔트리 포인트
└── vite.config.js      # Vite 설정 (프록시 포함)
```

---

## 🔌 API 명세

### 인증 엔드포인트

#### POST /api/auth/login
교사 로그인

**요청:**
```json
{
  \"email\": \"demo@teacher.com\",
  \"password\": \"demo123\"
}
```

**응답 (200):**
```json
{
  \"message\": \"로그인되었습니다.\",
  \"teacher\": {
    \"id\": 1,
    \"email\": \"demo@teacher.com\",
    \"created_at\": \"2025-08-02T14:19:09\"
  }
}
```

**쿠키:** `SESSION=JWT토큰; HttpOnly; SameSite=lax`

#### POST /api/auth/logout
교사 로그아웃

**응답 (200):**
```json
{
  \"ok\": true,
  \"message\": \"로그아웃되었습니다.\"
}
```

#### GET /api/auth/me
현재 로그인 교사 정보 조회 (인증 필요)

**응답 (200):**
```json
{
  \"id\": 1,
  \"email\": \"demo@teacher.com\",
  \"created_at\": \"2025-08-02T14:19:09\"
}
```

### 오류 응답

#### 401 Unauthorized
```json
{
  \"detail\": {
    \"error\": \"invalid_credentials\",
    \"message\": \"이메일 또는 비밀번호가 올바르지 않습니다.\"
  }
}
```

#### 429 Too Many Requests
```json
{
  \"detail\": {
    \"error\": \"Too many login attempts\",
    \"message\": \"로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.\",
    \"remaining_requests\": 0,
    \"retry_after\": 60
  }
}
```

---

## 🧪 테스트

### 통합 테스트 실행

```bash
# 간단한 로그인 플로우 테스트
make test-integration

# 또는 직접 실행
./test_simple.sh
```

### 백엔드 단위 테스트

```bash
# 모든 테스트 실행
make test

# 특정 테스트 파일 실행
cd backend && python -m pytest tests/test_auth_flow.py -v
```

### 수동 테스트 (curl)

```bash
# 1. 로그인
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \\
  -H \"Content-Type: application/json\" \\
  -d '{\"email\":\"demo@teacher.com\",\"password\":\"demo123\"}'

# 2. 사용자 정보 조회
curl -b cookies.txt http://localhost:3000/api/auth/me

# 3. 로그아웃
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

---

## 🔧 개발 도구

### 유용한 명령어

```bash
make help              # 사용 가능한 명령어 확인
make install           # 의존성 설치
make dev               # 개발 서버 실행
make db-upgrade        # DB 마이그레이션
make dev-seed          # 시드 데이터 생성
make backup            # 데이터베이스 백업
make setup-cron        # 자동 백업 설정 (매일 새벽 3시)
make backup-status     # 백업 상태 확인
make test-integration  # 통합 테스트
make clean             # 캐시 정리
```

### 개발 환경 설정

**환경변수 (.env)**
```bash
TZ=Asia/Seoul
DATABASE_URL=sqlite:///./data/app.db
MIN_TEACHER_PASSWORD_LEN=6
AUTH_LOGIN_RATE_PER_MIN=5
SESSION_EXP_HOURS=12
SESSION_REFRESH_THRESHOLD_H=3
SESSION_SECRET=dev-secret-key-change-in-production-12345
```

### 포트 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| 백엔드 | 3000 | FastAPI 서버 |
| 프런트엔드 | 5173 | Vite 개발 서버 |
| DB | N/A | SQLite 파일 기반 |

---

## 📂 데이터베이스

### Teachers 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY | 교사 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 (로그인 ID) |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 해시된 비밀번호 |
| created_at | DATETIME | DEFAULT NOW | 생성일시 |

### 백업 시스템

- **자동 백업**: 매일 새벽 3시 (KST)
- **보관 기간**: 180일
- **백업 위치**: `backups/app_backup_YYYYMMDD_HHMMSS.db`
- **로그**: `logs/backup.log`

---

## 🔍 문제 해결

### 일반적인 문제

#### 1. 서버가 시작되지 않는 경우

```bash
# 포트 사용 중 확인
lsof -i :3000
lsof -i :5173

# 프로세스 종료 후 재시작
make dev
```

#### 2. 로그인이 실패하는 경우

```bash
# 시드 데이터 재생성
make dev-seed

# 데이터베이스 상태 확인
sqlite3 backend/data/app.db \"SELECT * FROM teachers;\"
```

#### 3. 레이트리밋에 걸린 경우

```bash
# 1분 대기 후 재시도, 또는 서버 재시작
make backend
```

#### 4. 데이터베이스 오류

```bash
# 데이터베이스 재생성
rm backend/data/app.db
make db-upgrade
make dev-seed
```

### 로그 확인

```bash
# 백엔드 로그 (콘솔)
make backend

# 백업 로그
tail -f logs/backup.log

# 브라우저 콘솔 (F12)
# 프런트엔드 세션 관리 로그 확인
```

---

## 🎯 성능 및 제한사항

### 현재 제한사항

- **동시 사용자**: SQLite 기준 ~100명 추천
- **세션 저장**: 메모리 기반 (서버 재시작 시 초기화)
- **레이트리밋**: 메모리 기반 (서버 재시작 시 초기화)
- **파일 업로드**: 미구현
- **이메일 발송**: 미구현

### 권장 사양

**개발 환경**
- RAM: 4GB 이상
- Storage: 1GB 이상 여유 공간
- Node.js: 18+ 
- Python: 3.8+

**운영 환경 (맥미니)**
- RAM: 8GB 이상
- Storage: 10GB 이상 여유 공간
- Cloudflare 도메인 연결

---

## 🚀 다음 단계 (S2 이후)

### 예정된 기능

1. **S2**: 템플릿 생성 및 관리
2. **S3**: 세션 실행 및 6자리 코드 생성
3. **S4**: 학생 참여 및 PIN 시스템
4. **S5**: 활동 로그 저장 및 조회

### 확장 계획

- PostgreSQL 마이그레이션
- Redis 세션 스토어
- 실시간 알림 (WebSocket)
- 파일 업로드 및 관리
- 이메일 알림 시스템

---

## 📞 지원

### 개발팀 연락처

- **개발자**: Claude (Anthropic)
- **구현 일자**: 2025-08-02
- **버전**: S1.0.0

### 이슈 보고

문제 발생 시 다음 정보와 함께 보고해 주세요:

1. **환경 정보**: OS, 브라우저, Node.js/Python 버전
2. **오류 메시지**: 콘솔 로그 및 브라우저 개발자 도구
3. **재현 단계**: 문제가 발생한 정확한 단계
4. **기대 결과**: 예상했던 동작
5. **실제 결과**: 실제로 발생한 동작

---

## 📄 라이선스

이 프로젝트는 교육 목적으로 개발되었습니다.

---

**🎉 축하합니다! S1 교사 로그인 시스템이 성공적으로 구현되었습니다.**

**다음 단계인 S2 템플릿 관리 시스템 구현을 위해 준비해주세요!**