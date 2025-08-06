# 운영 환경 설정 가이드 (맥미니 + Cloudflare)

## 🚀 프로덕션 환경 설정

### 1. 백엔드 환경변수 (.env)

```bash
# Environment Configuration
APP_ENV=prod
TZ=Asia/Seoul

# Database (SQLite for local server)
DATABASE_URL=sqlite:///./data/app.db
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_ECHO=false

# Auth Settings
MIN_TEACHER_PASSWORD_LEN=6
AUTH_LOGIN_RATE_PER_MIN=5
SESSION_EXP_HOURS=12
SESSION_REFRESH_THRESHOLD_H=3

# Session Secret (강력한 비밀키로 변경!)
SESSION_SECRET=your-super-secure-production-secret-key-here

# CORS Settings (프로덕션에서는 사용되지 않음)
CORS_ORIGINS=
```

### 2. 프런트엔드 환경변수 (.env)

```bash
# Production Environment
VITE_APP_ENV=prod
VITE_API_BASE=/api
```

### 3. 환경별 동작 차이

| 기능 | 개발 환경 (APP_ENV=dev) | 운영 환경 (APP_ENV=prod) |
|------|------------------------|-------------------------|
| **쿠키 Secure** | `false` | `true` (HTTPS 필수) |
| **CORS** | `http://localhost:5173` 허용 | 비활성화 (동일 도메인) |
| **API 베이스** | `http://localhost:3000/api` | `/api` (상대경로) |
| **디버그 로그** | 활성화 | 비활성화 |

---

## 🐳 Docker 설정 (참고용)

### Dockerfile (백엔드)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 프로덕션 환경변수 설정
ENV APP_ENV=prod
ENV SESSION_SECRET=change-this-in-production

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (프런트엔드)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_APP_ENV=prod
ENV VITE_API_BASE=/api
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🌐 Nginx 설정

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Real IP 설정 (Cloudflare용)
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;
    
    upstream backend {
        server backend:8000;
    }
    
    server {
        listen 80;
        server_name _;
        
        # 정적 파일 캐싱
        location /assets/ {
            root /usr/share/nginx/html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # API 프록시 (캐시 없음)
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 캐시 비활성화
            add_header Cache-Control "no-store, no-cache, must-revalidate";
            add_header Pragma "no-cache";
        }
        
        # SPA 라우팅 (모든 요청을 index.html로)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # 기본 캐싱
            expires 1h;
            add_header Cache-Control "public";
        }
    }
}
```

---

## ☁️ Cloudflare Tunnel 설정

### 1. Cloudflare Tunnel 생성

```bash
# cloudflared 설치 (맥)
brew install cloudflare/cloudflare/cloudflared

# 로그인
cloudflared tunnel login

# 터널 생성
cloudflared tunnel create llm-platform

# 터널 설정
```

### 2. config.yml

```yaml
tunnel: llm-platform
credentials-file: /Users/user/.cloudflared/tunnel-id.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:80  # Nginx 컨테이너
  - service: http_status:404
```

### 3. DNS 설정

Cloudflare 대시보드에서:
- Type: CNAME
- Name: your-domain.com
- Target: tunnel-id.cfargotunnel.com
- Proxy: Enabled (오렌지 클라우드)

---

## 🔧 배포 스크립트

### deploy.sh

```bash
#!/bin/bash

echo "🚀 LLM Platform 프로덕션 배포 시작..."

# 1. 환경변수 설정
export APP_ENV=prod
export VITE_APP_ENV=prod
export VITE_API_BASE=/api

# 2. 백엔드 빌드 및 시작
echo "📦 백엔드 배포..."
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m app.seed_modes

# 3. 프런트엔드 빌드
echo "🏗️  프런트엔드 빌드..."
cd ../frontend
npm ci
npm run build

# 4. Docker 컨테이너 시작
echo "🐳 Docker 컨테이너 시작..."
cd ..
docker-compose -f docker-compose.prod.yml up -d

# 5. Cloudflare Tunnel 시작
echo "☁️  Cloudflare Tunnel 시작..."
cloudflared tunnel run llm-platform

echo "✅ 배포 완료!"
```

---

## 🔍 운영 확인사항

### 1. 환경별 확인

**개발 환경 (APP_ENV=dev):**
```bash
curl -I http://localhost:3000/api/auth/me
# Set-Cookie: SESSION=...; HttpOnly; SameSite=lax
```

**운영 환경 (APP_ENV=prod):**
```bash
curl -I https://your-domain.com/api/auth/me
# Set-Cookie: SESSION=...; HttpOnly; Secure; SameSite=lax
```

### 2. CORS 확인

**개발 환경:** CORS 헤더 존재
**운영 환경:** CORS 헤더 없음 (불필요)

### 3. API 베이스 확인

**개발:** `http://localhost:3000/api`
**운영:** `/api` (상대경로)

---

## ⚠️ 보안 체크리스트

- [ ] SESSION_SECRET을 강력한 키로 변경
- [ ] APP_ENV=prod 설정
- [ ] HTTPS 인증서 설정 (Cloudflare SSL)
- [ ] Nginx 보안 헤더 추가
- [ ] 데이터베이스 백업 설정
- [ ] 로그 모니터링 설정
- [ ] 방화벽 설정 (필요한 포트만 오픈)

---

**이 가이드를 따라 설정하면 맥미니 + Cloudflare 환경에서 안전하게 운영할 수 있습니다.**