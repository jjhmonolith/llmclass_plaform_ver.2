# S6: 라이브 진행 현황 검수 문서

## 📋 개요

S6에서 구현된 라이브 진행 현황 기능의 검수 방법을 안내합니다.

**구현된 기능:**
- 세션별 실시간 참여자 현황 조회
- 10초 폴링으로 자동 갱신
- 활성/비활성 참여자 구분 (시간 윈도우 기반)
- 학생별 상세 활동 정보 표시
- 세션 종료 시 폴링 자동 중단

## 🔧 기술 구현

### 백엔드
- **API**: `/api/runs/{id}/live-snapshot`
- **서비스**: `LiveSnapshotService`
- **인증**: 세션 소유 교사만 접근 가능
- **레이트리밋**: 12회/분
- **캐시**: no-store 헤더로 캐시 방지

### 프론트엔드
- **페이지**: `/teacher/run/live?run_id={id}`
- **폴링**: 10초 간격 (실패 시 점진적 백오프)
- **윈도우**: 5분/15분/1시간 선택 가능
- **상태 표시**: 실시간 갱신 상태 표시

---

## 🧪 검수 방법

### **1단계: 서버 구동 확인**

```bash
# 백엔드 서버 시작
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload

# 프론트엔드 서버 시작  
cd frontend
npm run dev
```

**확인 사항:**
- 백엔드: http://localhost:3000/health 응답 확인
- 프론트엔드: 브라우저에서 접속 가능 확인

### **2단계: API 엔드포인트 테스트 (터미널)**

```bash
# 1. 교사 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@example.com", "password": "password123"}' \
  -c cookies.txt

# 2. 라이브 스냅샷 조회 (인증된 상태)
curl -s -b cookies.txt \
  'http://localhost:3000/api/runs/1/live-snapshot?window_sec=300' \
  | jq .

# 3. 최근 로그 조회
curl -s -b cookies.txt \
  'http://localhost:3000/api/runs/1/recent-logs?limit=10' \
  | jq .
```

**예상 응답:**
```json
{
  "run_id": 1,
  "status": "LIVE",
  "window_sec": 300,
  "joined_total": 3,
  "active_recent": 2,
  "idle_recent": 1,
  "students": [
    {
      "student_name": "학생1",
      "last_seen_at": "2025-08-05T12:34:56Z",
      "turns_total": 5,
      "last_activity_key": "writing.step2",
      "last_turn_index": 3
    }
  ]
}
```

### **3단계: 권한 및 에러 처리 확인**

```bash
# 1. 인증 없이 접근 (401 예상)
curl -s http://localhost:3000/api/runs/1/live-snapshot
# Expected: {"error": "authentication_required", "message": "로그인이 필요합니다."}

# 2. 존재하지 않는 세션 (404 예상)
curl -s -b cookies.txt http://localhost:3000/api/runs/99999/live-snapshot

# 3. 다른 교사 세션 접근 (403 예상)
# (다른 계정으로 로그인 후 테스트)

# 4. 종료된 세션 접근 (410 예상)
# (ENDED 상태 세션으로 테스트)
```

### **4단계: 브라우저 테스트**

1. **교사 로그인**
   - http://localhost:5173/teacher/login 접속
   - 로그인 후 대시보드에서 LIVE 세션 선택

2. **라이브 현황 확인**
   - `/teacher/run/live?run_id={id}` 페이지 접속
   - 요약 카드 4개 표시 확인:
     - 총 참여자 수
     - 활성 참여자 수  
     - 대기 중 참여자 수
     - 활성 기준 시간

3. **실시간 갱신 테스트**
   - 10초마다 자동 갱신 확인
   - 우측 상단 갱신 상태 표시 확인 (녹색 점 + "10초마다 갱신")

4. **윈도우 변경 테스트**
   - 활성 기준을 5분 → 15분 → 1시간으로 변경
   - 활성/비활성 참여자 수 변화 확인
   - 즉시 새로고침 확인

5. **학생 목록 표시**
   - 참여자 테이블 확인
   - 활성 학생은 녹색 배경으로 하이라이트
   - 상대 시간 표시 확인 ("방금 전", "5분 전" 등)

### **5단계: 학생 활동과 연동 테스트**

1. **학생 참여 시뮬레이션**
   ```bash
   # 새 탭에서 학생 참여
   # http://localhost:5173/student/join
   # 세션 코드 입력 후 참여
   ```

2. **활동 로그 생성**
   - 학생 학습 페이지에서 더미 활동 수행
   - "답변 제출" 버튼으로 활동 저장

3. **교사 화면에서 확인**
   - 10초 내에 참여자 수 증가 확인
   - 학생별 턴 수 및 마지막 활동 업데이트 확인
   - 활성 참여자로 분류 확인

### **6단계: 세션 종료 테스트**

1. **수동 종료**
   - "⛔ 세션 종료" 버튼 클릭
   - 확인 대화상자 승인

2. **종료 후 상태 확인**
   - 폴링 중단 확인 (빨간 점 + "갱신 중단")
   - 라이브 현황 섹션 숨김 확인
   - 참여 코드 비활성화 확인

3. **API 응답 확인**
   ```bash
   # 종료된 세션 접근 시 410 응답 확인
   curl -s -b cookies.txt http://localhost:3000/api/runs/{ended_run_id}/live-snapshot
   # Expected: 410 Gone
   ```

---

## 🧪 테스트 실행

### **단위 테스트**
```bash
cd backend
pytest tests/test_live_snapshot.py -v
```

**예상 결과:**
```
tests/test_live_snapshot.py::TestLiveSnapshotService::test_get_run_live_snapshot_empty PASSED
tests/test_live_snapshot.py::TestLiveSnapshotService::test_get_run_live_snapshot_with_students PASSED
tests/test_live_snapshot.py::TestLiveSnapshotService::test_window_variance PASSED
tests/test_live_snapshot.py::TestLiveSnapshotService::test_nonexistent_session PASSED
tests/test_live_snapshot.py::TestLiveSnapshotService::test_get_recent_logs PASSED
tests/test_live_snapshot.py::TestLiveSnapshotAPI::test_live_snapshot_unauthorized PASSED
tests/test_live_snapshot.py::TestLiveSnapshotAPI::test_recent_logs_unauthorized PASSED
```

### **통합 테스트**
```bash
# 실제 서버 실행 상태에서
pytest tests/test_live_snapshot.py::TestLiveSnapshotIntegration -m integration
```

---

## ✅ Definition of Done 체크리스트

- [ ] `/api/runs/{id}/live-snapshot` API 200 응답
- [ ] 정확한 집계 수치 (joined_total, active_recent, idle_recent)
- [ ] 권한 검증 (403 Forbidden)
- [ ] ENDED 세션 처리 (410 Gone)
- [ ] 프론트엔드 10초 폴링 동작
- [ ] 윈도우 변경 시 즉시 반영
- [ ] 세션 종료 시 폴링 중단
- [ ] 학생별 상세 정보 표시
- [ ] 단위 테스트 통과
- [ ] 브라우저 검수 완료

---

## 🚨 알려진 제한사항

1. **실시간 프레즌스 없음**
   - 학생이 페이지를 보고 있어도 활동이 없으면 "비활성"으로 표시
   - 향후 백그라운드 핑으로 개선 가능

2. **템플릿별 상세 진행도 없음**
   - 현재는 공통 지표만 제공
   - 템플릿별 세부 진행도는 후속 개발

3. **브라우저 캐시 이슈**
   - no-store 헤더 설정으로 대부분 해결
   - 일부 브라우저에서 캐시 문제 가능성

---

## 📞 문제 해결

### **일반적인 문제**

1. **폴링이 작동하지 않음**
   - 브라우저 개발자 도구 > Network 탭에서 10초마다 요청 확인
   - 401/403 오류 시 로그인 상태 확인

2. **참여자 수가 맞지 않음**
   - 데이터베이스의 enrollments 테이블 확인
   - window_sec 파라미터와 last_seen_at 비교

3. **레이트리밋 오류**
   - 폴링 간격이 자동으로 증가하는지 확인
   - 12회/분 제한 준수 확인

### **디버깅 팁**

```bash
# 실시간 로그 확인
tail -f backend/app.log

# 데이터베이스 직접 조회
sqlite3 backend/data/app.db "SELECT * FROM enrollments WHERE run_id=1;"
sqlite3 backend/data/app.db "SELECT * FROM activity_logs WHERE run_id=1 ORDER BY created_at DESC LIMIT 5;"
```

---

**📍 S6 라이브 진행 현황 구현 완료!**

모든 검수 단계를 통과하면 S6 구현이 성공적으로 완료된 것입니다.