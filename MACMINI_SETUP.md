# 🍎 맥미니 운영 배포 가이드

## 🚀 **완전 자동화 배포 (권장)**

### **1. 저장소 클론 및 이동**
```bash
git clone https://github.com/jjhmonolith/llmclass_plaform_ver.2.git
cd llmclass_plaform_ver.2
```

### **2. OpenAI API 키 설정**
```bash
# 환경변수로 설정 (권장)
export OPENAI_API_KEY="your-openai-api-key-here"
```

### **3. 완전 자동화 배포 실행**
```bash
# 모든 것을 자동으로 설정 (배포 + 백그라운드 + Cloudflare)
./scripts/macmini-production-setup.sh
```

**이 명령어가 자동으로 수행하는 작업:**
- ✅ Docker 환경 확인
- ✅ 프론트엔드 빌드 및 백엔드 통합
- ✅ 환경변수 파일 생성 (API 키 자동 설정)
- ✅ Docker 컨테이너 빌드 및 시작
- ✅ macOS LaunchDaemon 설정 (자동 시작)
- ✅ Cloudflare 터널 설정 (선택사항)
- ✅ 백그라운드 실행 설정

---

## 🛠️ **서비스 관리**

### **상태 확인**
```bash
# 전체 서비스 상태 확인
./scripts/service-manager.sh status
```

### **서비스 제어**
```bash
# 서비스 시작
./scripts/service-manager.sh start

# 서비스 중지
./scripts/service-manager.sh stop

# 서비스 재시작
./scripts/service-manager.sh restart

# 실시간 로그 확인
./scripts/service-manager.sh logs
```

### **업데이트**
```bash
# 코드 업데이트 및 서비스 재배포
./scripts/service-manager.sh update
```

---

## 🌐 **접속 정보**

### **로컬 접속**
- **서비스**: http://localhost

### **도메인 접속** (Cloudflare 설정 시)
- **교사용**: https://teacher.llmclass.org
- **학생용**: https://llmclass.org

---

## 🔧 **문제 해결**

### **Docker 관련 오류**
```bash
# Docker Desktop 재시작
open -a Docker

# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs
```

### **자동 시작 문제**
```bash
# LaunchDaemon 상태 확인
sudo launchctl list | grep com.llmclass.platform.ver2

# 수동 시작
sudo launchctl start com.llmclass.platform.ver2

# 로그 확인
tail -f logs/daemon.log
```

### **Cloudflare 터널 문제**
```bash
# 터널 상태 확인
cloudflared tunnel list

# 터널 재시작
sudo launchctl restart com.cloudflare.tunnel.llmclass-platform-ver2

# 터널 로그 확인  
tail -f logs/cloudflare.log
```

### **API 키 문제**
```bash
# Proto4 환경변수 파일 편집
nano prototypes/proto4/backend/.env.production

# 내용 예시:
# OPENAI_API_KEY=sk-proj-your-actual-api-key
# HOST=0.0.0.0
# PORT=3001
```

---

## 🎯 **특징 및 장점**

### ✨ **완전 자동화**
- **한 번의 명령어**로 전체 운영 환경 구축
- **백그라운드 실행**: 터미널 종료해도 계속 작동
- **자동 시작**: 맥북 재부팅/업데이트 후 자동 실행

### 🔄 **운영 안정성**
- **헬스 체크**: 서비스 상태 자동 모니터링
- **자동 복구**: 서비스 크래시 시 자동 재시작
- **로그 관리**: 구조화된 로그 수집 및 관리

### 🌐 **도메인 연동**
- **Cloudflare 터널**: 안전한 외부 접속
- **도메인별 라우팅**: 교사/학생 페이지 분리
- **SSL 인증서**: 자동 HTTPS 적용

### 📊 **모니터링 및 관리**
- **실시간 상태 확인**: 서비스, Docker, Cloudflare 상태
- **통합 로그 뷰어**: 모든 서비스 로그 실시간 확인
- **원클릭 업데이트**: Git pull + 빌드 + 재배포 자동화

---

## ⚡ **빠른 체크리스트**

맥미니 배포 후 확인사항:

- [ ] `./scripts/service-manager.sh status` 실행 시 모든 서비스 ✅
- [ ] `http://localhost/health` 접속 시 정상 응답
- [ ] Docker Desktop이 로그인 항목에 등록됨
- [ ] `sudo launchctl list | grep llmclass` 명령어로 데몬 확인
- [ ] `logs/daemon.log` 파일에서 정상 시작 로그 확인
- [ ] (Cloudflare 설정 시) 도메인 접속 확인

🎉 **모든 체크리스트 완료 시 운영 환경 구축 성공!**