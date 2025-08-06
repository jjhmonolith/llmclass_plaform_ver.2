# 🚀 배포 가이드

## 📋 **터미널 명령어 요약**

### 🔧 **개발 환경**
```bash
# 모든 서비스 한번에 시작 (자동화)
./scripts/dev-deploy.sh

# 또는 수동으로 각각 시작:
# 백엔드 (포트 3000)
cd backend && python -m uvicorn app.main:app --reload --port 3000

# Proto4 (포트 3001) 
cd prototypes/proto4/backend && python -m uvicorn main:app --reload --port 3001

# 프론트엔드 (포트 5173)
cd frontend && npm run dev
```

### 🏭 **운영 환경**
```bash
# 운영 환경 전체 배포 (자동화)
./scripts/prod-deploy.sh

# 또는 수동으로:
./scripts/build-production.sh  # 빌드
docker-compose up -d          # 서비스 시작

# Cloudflare 연동
./scripts/setup-cloudflare.sh
```

---

## 🔧 **개발 환경 상세**

### **자동 배포 스크립트**
```bash
./scripts/dev-deploy.sh
```

**수행 작업:**
- ✅ 백엔드 종속성 설치 및 데이터베이스 초기화
- ✅ Proto4 백엔드 시작 (포트 3001) 
- ✅ 플랫폼 백엔드 시작 (포트 3000)
- ✅ 프론트엔드 시작 (포트 5173)
- ✅ 환경변수 파일 자동 생성

### **접속 URL**
- 📱 **프론트엔드**: http://localhost:5173
- 🏫 **플랫폼 API**: http://localhost:3000
- 🧠 **Proto4 API**: http://localhost:3001

### **환경변수 설정**
개발용 환경변수가 없으면 자동으로 샘플에서 복사됩니다:
```bash
# 백엔드: backend/.env
cp backend/.env.sample backend/.env

# 프론트엔드: frontend/.env  
cp frontend/.env.sample frontend/.env

# Proto4: 수동 설정 필요
echo "OPENAI_API_KEY=your-key" > prototypes/proto4/backend/.env
```

---

## 🏭 **운영 환경 상세**

### **자동 배포 스크립트**
```bash
./scripts/prod-deploy.sh
```

**수행 작업:**
- ✅ Docker 환경 확인
- ✅ 프론트엔드 프로덕션 빌드
- ✅ Docker 이미지 빌드
- ✅ 컨테이너 시작 (Nginx + 백엔드)
- ✅ 헬스 체크 수행
- ✅ 서비스 상태 확인

### **접속 URL**
- 🌐 **로컬**: http://localhost:80
- 🏫 **교사용** (Cloudflare 연동 후): https://teacher.llmclass.org
- 👨‍🎓 **학생용** (Cloudflare 연동 후): https://llmclass.org

### **수동 명령어**
```bash
# 빌드만
./scripts/build-production.sh

# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# 서비스 상태
docker-compose ps
```

---

## 🌐 **Cloudflare 연동**

### **자동 설정**
```bash
./scripts/setup-cloudflare.sh
```

### **수동 설정**
```bash
# 1. cloudflared 설치
brew install cloudflare/cloudflare/cloudflared  # macOS
# 또는 https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# 2. 로그인
cloudflared tunnel login

# 3. 터널 생성
cloudflared tunnel create llm-classroom-platform

# 4. DNS 설정
cloudflared tunnel route dns llm-classroom-platform teacher.llmclass.org
cloudflared tunnel route dns llm-classroom-platform llmclass.org
cloudflared tunnel route dns llm-classroom-platform www.llmclass.org

# 5. 설정 파일 복사 및 서비스 시작
sudo cp cloudflare/config.yml /etc/cloudflared/config.yml
sudo cloudflared service install
sudo systemctl start cloudflared
```

---

## 🔍 **문제 해결**

### **개발 환경**
```bash
# 포트 충돌 시 프로세스 종료
lsof -ti:3000 | xargs kill -9  # 백엔드
lsof -ti:3001 | xargs kill -9  # Proto4
lsof -ti:5173 | xargs kill -9  # 프론트엔드

# 데이터베이스 재초기화
cd backend && python app/seed_modes.py

# 캐시 정리
cd frontend && npm ci
```

### **운영 환경**
```bash
# 컨테이너 로그 확인
docker-compose logs llm-classroom
docker-compose logs nginx

# 컨테이너 재시작
docker-compose restart

# 볼륨 정리 (주의: 데이터 손실)
docker-compose down -v
docker system prune -a
```

### **Cloudflare 문제**
```bash
# 터널 상태 확인
cloudflared tunnel list
sudo systemctl status cloudflared

# 수동 터널 실행 (테스트)
cloudflared tunnel --config /etc/cloudflared/config.yml run

# DNS 전파 확인
dig teacher.llmclass.org
dig llmclass.org
```

---

## 📊 **모니터링 명령어**

### **시스템 상태**
```bash
# 프로세스 확인
ps aux | grep uvicorn
ps aux | grep node

# 포트 사용 확인  
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
netstat -tlnp | grep :5173

# Docker 상태
docker-compose ps
docker stats
```

### **로그 모니터링**
```bash
# 개발 환경
tail -f backend/logs/*.log
tail -f prototypes/proto4/backend/*.log

# 운영 환경
docker-compose logs -f
sudo journalctl -u cloudflared -f
```

---

## ⚡ **빠른 참조**

| 작업 | 개발 | 운영 |
|------|------|------|
| **전체 시작** | `./scripts/dev-deploy.sh` | `./scripts/prod-deploy.sh` |
| **빌드만** | `npm run build` | `./scripts/build-production.sh` |
| **서비스 중지** | `Ctrl+C` | `docker-compose down` |
| **로그 확인** | 터미널 출력 | `docker-compose logs -f` |
| **URL** | `localhost:5173` | `teacher.llmclass.org` |

🎯 **추천 워크플로우:**
1. 개발: `./scripts/dev-deploy.sh`
2. 테스트 완료 후 운영: `./scripts/prod-deploy.sh`  
3. 도메인 연동: `./scripts/setup-cloudflare.sh`