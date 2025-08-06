너는 내가 제공하는 여러 단계로 구성된 기능 기획서를 기준으로 개발을 진행할 FastAPI + React 엔지니어야.

단, 개발은 **한 번에 전부 하지 말고**, 아래의 기준에 따라 **5단계 내외**로 나누어 순차적으로 진행해줘.  
**각 단계마다 반드시 중지하고**, 내가 검토한 뒤 다음 단계로 넘어가야 해.


전체 프로젝트 구성은 다음과 같다.
---
## **0) 목표·원칙**

- **목표**: 한 세션을 실제로 개설·참여·대화 저장·종료까지 해보는 **최소 제품**.
- **원칙**: 단순/명확/변경 용이. 시간 제한 없음(무기한), 실시간/평가/통계는 후순위.

---

## **1) 사용자 플로우(간단)**

- **교사**: 로그인 → 템플릿 생성 → 세션 시작(LIVE, **6자리 코드** 발급) → 수동 종료.
- **학생**: 코드+이름으로 입장(중복 이름 **불가**) → **재참여 PIN** 발급
    
    └ 새로고침/기기 변경 시 **코드+이름+PIN**으로 **기존 기록 재연결**.
    

---

## **2) 상태·규칙**

- **Run.status**: READY → LIVE → ENDED (역행 불가)
- **입장코드**: **6자리 숫자**, 한 Run 당 1개, **무기한**, **재발급 없음**
    - **활성 유일성**: LIVE 상태들 사이에서 코드 충돌 불가(부분 유니크 인덱스)
- **이름 정책**: Run 내 **중복 불가**(정규화 비교: lower(trim)), 길이 ≤ 20
- **재참여 PIN**: 숫자 **4자리**(기본) 발급·표시, 서버엔 **해시** 저장
- **세션 종료**: 교사 **수동 종료만** 지원. 종료 후 학생 API는 **거부**, 데이터는 **보존**

---

## **3) 데이터 모델(최소)**

- teachers(id, email, password_hash, created_at)
    - **비밀번호 정책**: 최소 6자
- modes(id, name, version, options_schema JSON)
- session_templates(id, teacher_id, mode_id, title, settings_json JSON, created_at, updated_at)
- session_runs(id, template_id, status, started_at, ended_at, settings_snapshot_json JSON, created_at)
- join_codes(id, run_id, code CHAR(6), is_active BOOL, issued_at)
    - **인덱스**: UNIQUE(code) WHERE is_active=true
- enrollments(id, run_id, normalized_student_name, rejoin_pin_hash, joined_at, last_seen_at)
    - *UNIQUE(run_id, normalized_student_name)`
- activity_logs(id, run_id, student_name, activity_key, turn_index, student_input TEXT, ai_output TEXT, third_eval_json JSON, created_at)
    - 저장 단위 = **활동 1턴(학생입력·AI응답·제3평가)**

---

## **4) API (최소)**

**교사**

- POST /api/auth/login / POST /api/auth/logout / GET /api/auth/me
- GET /api/modes
- POST /api/templates / GET /api/templates
- POST /api/runs {template_id} → READY
- POST /api/runs/{id}/start → LIVE + **code** 생성(무기한)
- GET /api/runs/{id}/code → {code}
- POST /api/runs/{id}/end → ENDED
- *(선택)* POST /api/teacher/runs/{id}/recover-name {student_name}
    
    └ 교사 강제 복구(재참여 PIN 없이 기존 Enrollment 재연결)
    

**학생/공용**

- POST /api/join {code, student_name} → 신규 입장, **rejoin_pin_hint** 반환
    - 중복 이름이면 409
- POST /api/join/reclaim {code, student_name, rejoin_pin} → 기존 Enrollment 재연결
- POST /api/activity-log {run_id, student_name, activity_key, turn_index, student_input, ai_output, third_eval_json?}
    
    └ **보내기 버튼 없음**: 활동 전환/완료 시 프런트가 **자동 호출**
    

---

## **5) 프런트(검수용 최소 페이지)**

- **/teacher/login**: 로그인(성공→/teacher/dashboard)
- **/teacher/dashboard**: 템플릿 리스트 + “새 템플릿”
- **/teacher/template/new**: 필수 2~3 필드 폼 → 저장
- **/teacher/run/new?template_id=**: Run 생성→“시작” 버튼
- **/teacher/run/live?run_id=**: 상태 배지(LIVE/ENDED) + **코드 표시** + “종료” 버튼
    
    *(라이브 통계/모니터링 없음)*
    
- **/student/join**: 코드+이름 → 성공 시 **PIN 표시**(힌트 포함) → 학습 화면
- **/student/learn?run_id=&name=**: 템플릿 활동 화면(단순), **activity-log 자동 저장**

---

## **6) 에러·경계 사례 처리**

- **이름 중복**: 409 + “이미 사용 중인 이름”
- **새로고침/기기 변경**: /join/reclaim에서 **코드+이름+PIN** 요구
- **PIN 분실**: 교사가 **recover-name**으로 복구
- **세션 ENDED 후 요청**: 410 Gone + 안내
- **활성 코드 충돌(Live 세션 다수)**: 생성 시 재시도; 충돌 로그 집계

---

## **7) 보안·운영(최소)**

- 교사 로그인 레이트리밋: 5회/분/IP
- 코드 입력 레이트리밋: 30회/분/IP
- 쿠키: httpOnly, SameSite=Lax(운영은 Secure)
- 로깅: 주요 이벤트(JSON): run_start, join, reclaim, activity_log, run_end
- CORS: 로컬 도메인만 허용(dev)

---

## **8) 환경 변수(.env.sample)**

```
TZ=Asia/Seoul

# Auth
MIN_TEACHER_PASSWORD_LEN=6
AUTH_LOGIN_RATE_PER_MIN=5

# Run / Join
CODE_LENGTH=6
JOIN_CODE_ALPHABET=0123456789
MAX_STUDENTS_PER_RUN=60
JOIN_ATTEMPT_RATE_PER_MIN=30
REJOIN_PIN_LENGTH=4         # 숫자 4자리(변경 가능)
```

---

## **9) 수용 기준(기능별)**

- **S1**: 로그인 성공 시 보호 라우트 접근; 잘못된 비번 401; 레이트리밋 동작
- **S2**: 템플릿 저장→대시보드 노출
- **S3**: Run 시작 시 **6자리 코드** 생성; /code로 확인; 재발급 없음
- **S4**:
    - 신규 조인 성공 시 PIN 힌트 표시
    - 같은 이름 재조인 시 409
    - join/reclaim으로 **기존 기록** 재연결
- **S5**: 활동 전환 시 activity-log 자동 저장(한 턴에 3필드 저장)
    - 저장 후 재조회 시 데이터 일관
- **S7**: 종료 후 조인/재참여/로그 저장 **거부**, 데이터 유지

---

## **10) 추후(후순위)**

- 라이브(폴링) 대시보드, 통계/리포트/CSV, 실제 LLM 호출/평가, 코드 7자리 확장 옵션, 데이터 보존기간 정책

---

---

## 🧩 개발 진행 기준

1. 기능을 **논리적/검수 단위**로 5단계 내외로 나눈다.
   - 각 단계는 완결된 작은 기능 또는 구성요소 하나씩
   - 단계는 가능한 **백엔드 → 프론트엔드 → 통합 순서**로 나눈다

2. 각 단계를 설명할 때는 다음을 포함한다:
   - ✅ **개발 목표 요약** (한두 문장)
   - ✅ **수정된 파일 목록**
   - ✅ **검수 방법** (기획자가 직접 확인 가능해야 함, 예: curl, print 확인 등)

3. 한 단계의 작업이 끝나면 반드시 **실행을 멈추고**, 다음을 출력한다:
   - 🟩 “📍 *1단계 완료했습니다. 다음 단계로 넘어갈까요?*”  
   - 🧪 검수에 필요한 명령어, 주소, 설명 등을 간단히 안내

---

## 📌 주의사항

- 내 확인 없이 다음 단계로 넘어가지 말 것  
- 가능하면 **서버 구동 없이도 로컬 단위 확인 가능한 형태**로 먼저 개발  
- **에러 메시지 UX / 제한 로직**도 단계별로 나누어 구현

---