# 🌐 Cloudflare 도메인 설정 가이드

**도메인 구조:**
- 🏫 **교사용**: `teacher.llmclass.org` (모든 교사 기능)  
- 👨‍🎓 **학생용**: `llmclass.org` (조인 및 학습만)
- 🌐 **WWW**: `www.llmclass.org` (학생용과 동일)

## 🚀 빠른 설정

### 1. 자동 설정 스크립트 실행

```bash
# 프로젝트 루트에서 실행
./scripts/setup-cloudflare.sh
```

이 스크립트가 자동으로 수행하는 작업:
- ✅ cloudflared 설치 확인
- ✅ Cloudflare 로그인
- ✅ 터널 생성 (`llm-classroom-platform`)
- ✅ DNS 레코드 설정 (3개 도메인)
- ✅ 설정 파일 복사
- ✅ 시스템 서비스 등록

### 2. 플랫폼 시작

```bash
# 프로덕션 빌드 및 시작
docker-compose up -d

# 터널 시작 (자동 시작되지 않는 경우)
sudo systemctl start cloudflared
```

## 🔧 수동 설정 (상세)

### 1. Cloudflared 설치

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Ubuntu/Debian
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Cloudflare 로그인

```bash
cloudflared tunnel login
```

### 3. 터널 생성

```bash
cloudflared tunnel create llm-classroom-platform
```

### 4. DNS 설정

```bash
# 교사용 도메인
cloudflared tunnel route dns llm-classroom-platform teacher.llmclass.org

# 학생용 메인 도메인
cloudflared tunnel route dns llm-classroom-platform llmclass.org

# WWW 서브도메인
cloudflared tunnel route dns llm-classroom-platform www.llmclass.org
```

### 5. 설정 파일 복사

```bash
sudo mkdir -p /etc/cloudflared
sudo cp cloudflare/config.yml /etc/cloudflared/config.yml
```

### 6. 서비스 설치 및 시작

```bash
# 서비스 설치
sudo cloudflared service install

# 서비스 시작
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# 상태 확인
sudo systemctl status cloudflared
```

## 🌍 도메인별 라우팅 동작

### 🏫 teacher.llmclass.org
- **허용 경로**: 모든 경로 (`/teacher/*`, `/login`, `/dashboard` 등)
- **기능**: 교사 로그인, 템플릿 생성, 세션 관리, 실시간 모니터링
- **Nginx**: 모든 요청을 백엔드로 프록시

### 👨‍🎓 llmclass.org
- **허용 경로**: `/`, `/student/*` (학생 관련 페이지만)
- **차단 경로**: `/teacher/*`, `/login` → `teacher.llmclass.org`로 리디렉션
- **기능**: 세션 조인, 학습 활동, 재참여
- **Nginx**: 교사 경로 접근 시 자동 리디렉션

### 🌐 www.llmclass.org
- **동작**: `llmclass.org`와 동일
- **자동 처리**: Cloudflare에서 자동 리디렉션 또는 동일 콘텐츠 서빙

## 🔍 테스트 및 확인

### 1. 도메인 접근 테스트

```bash
# 교사용 도메인
curl -I https://teacher.llmclass.org/health
# 응답: "Teacher Domain OK"

# 학생용 도메인  
curl -I https://llmclass.org/health
# 응답: "Student Domain OK"

# 교사 페이지 접근 시 리디렉션 확인
curl -I https://llmclass.org/teacher/login
# 응답: 302 Redirect → https://teacher.llmclass.org/teacher/login
```

### 2. SSL 인증서 확인

```bash
# SSL 인증서 정보 확인
openssl s_client -connect teacher.llmclass.org:443 -servername teacher.llmclass.org
openssl s_client -connect llmclass.org:443 -servername llmclass.org
```

### 3. 터널 상태 확인

```bash
# 터널 목록
cloudflared tunnel list

# 터널 상태
cloudflared tunnel info llm-classroom-platform

# 로그 확인
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

## 🛠️ 문제 해결

### 터널이 연결되지 않는 경우

```bash
# 터널 수동 실행 (테스트용)
cloudflared tunnel --config /etc/cloudflared/config.yml run

# 설정 파일 검증
cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
```

### DNS 전파 확인

```bash
# DNS 레코드 확인
dig teacher.llmclass.org
dig llmclass.org
dig www.llmclass.org

# nslookup으로 확인
nslookup teacher.llmclass.org
nslookup llmclass.org
```

### 도메인 리디렉션 테스트

```bash
# 학생 도메인에서 교사 경로 접근 시 리디렉션 확인
curl -v https://llmclass.org/teacher/login
curl -v https://llmclass.org/login
```

## 📊 모니터링

### 1. Cloudflare 대시보드
- **Analytics**: 트래픽, 응답시간, 에러율
- **Security**: DDoS 방어, Bot 차단  
- **SSL/TLS**: 인증서 상태, 암호화 설정

### 2. 로그 모니터링

```bash
# Cloudflared 로그
sudo journalctl -u cloudflared -f

# Nginx 로그
docker-compose logs -f nginx

# 백엔드 로그
docker-compose logs -f llm-classroom
```

## 🔒 보안 설정

### 1. Cloudflare 보안 기능
- **SSL/TLS**: Full (Strict) 모드 권장
- **Always Use HTTPS**: 활성화
- **HSTS**: 활성화 (6개월)
- **Bot Fight Mode**: 활성화

### 2. 방화벽 규칙
- **Rate Limiting**: API 엔드포인트별 제한
- **Security Level**: Medium 이상
- **Challenge Passage**: 1 hour

## 🎯 성능 최적화

### 1. Cloudflare 최적화
- **Caching**: 정적 파일 캐싱 활성화
- **Minification**: CSS, JS, HTML 압축
- **Brotli**: 압축 활성화
- **HTTP/2**: 자동 활성화

### 2. CDN 설정
- **Auto Minify**: CSS, JS 활성화
- **Rocket Loader**: JS 최적화 (필요시)
- **Mirage**: 이미지 최적화 (필요시)

---

✅ **설정 완료 후 접근 가능한 URL:**
- 🏫 교사용: https://teacher.llmclass.org
- 👨‍🎓 학생용: https://llmclass.org  
- 🌐 WWW: https://www.llmclass.org