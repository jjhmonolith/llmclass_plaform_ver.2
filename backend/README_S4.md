# S4: 학생 입장 시스템 완료 - 테스트 및 사용 가이드

## 📋 개요

S4에서는 학생의 세션 참여 시스템을 구현했습니다:
- **통합 API**: 최초 입장과 재참여를 하나의 엔드포인트로 처리
- **중복 방지**: 세션 내 학생 이름 고유성 보장
- **재참여 시스템**: 2자리 PIN으로 기존 기록 재연결
- **자동 캐싱**: 30분간 localStorage 기반 자동 재접속
- **보안**: Argon2id PIN 해시, IP 기반 레이트리밋

## 🔧 주요 구현 사항

### 1. 데이터베이스 모델
- **enrollments 테이블**: 학생 참여 정보 저장
- **고유 제약**: `(run_id, normalized_student_name)` 중복 방지
- **PIN 해시**: Argon2id로 안전하게 저장

### 2. 통합 API 설계
```
POST /api/join
```
- 기존 학생 → PIN 입력 요구 (409)
- 신규 학생 → 즉시 입장 + PIN 발급 (200)
- 재참여 → PIN 검증 후 재연결 (200)

### 3. 프론트엔드 UX
- 학생은 즉시 학습 화면으로 이동
- PIN은 토스트로 표시 + 언제든 확인 가능
- 30분간 자동 재접속 (마지막 활동 기준)

## 🧪 테스트 방법

### 자동화 테스트 실행
```bash
cd backend
pytest tests/test_join.py -v
```

### 브라우저 테스트

#### 1. 서버 시작
```bash
cd backend
python -m uvicorn app.main:app --reload --port 3000
```

#### 2. 프론트엔드 시작  
```bash
cd frontend
npm run dev
```

#### 3. 테스트 시나리오

**준비**: 교사로 로그인하여 LIVE 세션 생성 (예: 코드 `123456`)

**시나리오 1: 최초 입장**
1. `http://localhost:5174/student/join` 접속
2. 코드: `123456`, 이름: `김학생` 입력
3. ✅ 즉시 학습 화면으로 이동
4. ✅ "재참여 PIN: XX" 토스트 확인
5. ✅ 우상단 "재참여 PIN 보기" 버튼 확인

**시나리오 2: 중복 이름 시 PIN 요구**
1. 새 브라우저/시크릿모드로 같은 페이지 접속
2. 코드: `123456`, 이름: `김학생` (동일) 입력  
3. ✅ PIN 입력 단계로 전환
4. 잘못된 PIN 입력 → ✅ 오류 메시지
5. 올바른 PIN 입력 → ✅ 학습 화면 이동

**시나리오 3: 자동 재접속**
1. 학습 화면에서 브라우저 새로고침
2. ✅ 자동으로 세션 복원 (30분 이내)
3. 30분 후 새로고침 → ✅ 입장 페이지로 이동

### curl 테스트

```bash
# 1. 최초 입장
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","student_name":"테스트학생"}'

# 응답: {"ok":true,"run_id":1,"student_name":"테스트학생","rejoin_pin":"42"}

# 2. 중복 이름 - PIN 요구
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","student_name":"테스트학생"}'

# 응답: 409 {"detail":{"error":"requires_pin","message":"재참여 PIN을 입력해주세요."}}

# 3. 재참여
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","student_name":"테스트학생","rejoin_pin":"42"}'

# 응답: {"ok":true,"run_id":1,"student_name":"테스트학생"}
```

## 📊 API 응답 코드

| 코드 | 상황 | 응답 |
|------|------|------|
| 200 | 성공 (최초/재참여) | `{ok:true, run_id, student_name, rejoin_pin?}` |
| 400 | 잘못된 입력 | `"올바른 코드를 입력해주세요"` |
| 401 | PIN 불일치 | `"재참여 PIN이 올바르지 않습니다"` |
| 403 | 수용인원 초과 | `"세션 참여 인원이 가득찼습니다"` |
| 404 | 유효하지 않은 코드 | `"코드가 유효하지 않습니다"` |
| 409 | PIN 입력 필요 | `{error:"requires_pin", message:"재참여 PIN을 입력해주세요"}` |
| 410 | 종료된 세션 | `"세션이 종료되었습니다"` |
| 429 | 레이트리밋 | `{error:"rate_limit_exceeded", retry_after:60}` |

## 🔒 보안 설정

### 레이트리밋
- `/api/join`: **30회/분** (IP별)
- `/api/auth/login`: **5회/분** (IP별)
- Cloudflare 실IP 헤더 자동 감지

### PIN 보안
- **길이**: 2자리 숫자 (00-99)
- **해시**: Argon2id (솔트 자동 생성)
- **저장**: 원본 PIN은 즉시 폐기

### 캐시 정책
- **브라우저**: localStorage 30분 (활동 기준)
- **HTTP**: `Cache-Control: no-store` 헤더

## 📁 구현된 파일들

### 백엔드
- `app/models/enrollment.py` - 학생 참여 정보 모델
- `app/routers/join.py` - 통합 참여 API
- `app/utils/pin_utils.py` - PIN 생성/검증 유틸
- `app/middleware/rate_limit.py` - 레이트리밋 미들웨어
- `tests/test_join.py` - 종합 테스트 스위트

### 프론트엔드  
- `src/pages/StudentJoin.jsx` - 학생 입장 페이지
- `src/pages/StudentLearn.jsx` - 학습 화면 (PIN 확인)
- `src/utils/sessionCache.js` - localStorage 캐시 관리

### 설정
- `app/core/config.py` - 환경변수 추가
- `app/main.py` - CORS, 레이트리밋 미들웨어 등록
- `alembic/versions/` - DB 마이그레이션

## ✅ 검수 체크리스트

- [x] 최초 입장 시 2자리 PIN 발급
- [x] 중복 이름 시 409 + PIN 입력 요구
- [x] 잘못된 PIN 시 401 오류
- [x] 올바른 PIN 시 재참여 성공
- [x] 30분 localStorage 자동 재접속
- [x] 레이트리밋 동작 (30회/분)
- [x] 종료된 세션 410 응답
- [x] 수용인원 초과 403 응답
- [x] Cloudflare IP 헤더 처리
- [x] PIN 해시 저장 (보안)
- [x] 캐시 방지 헤더 설정

## 🚀 다음 단계 준비

S4 완료로 학생들이 안전하게 세션에 참여할 수 있는 시스템이 완성되었습니다.
다음 S5에서는 **활동 로그 자동 저장** 시스템을 구현할 예정입니다.

---

*📍 S4 완료 - 학생 입장 시스템 테스트 및 문서화 완료*