# 🚀 맥미니 빠른 시작 가이드

## 📋 복사해서 바로 실행하기

터미널을 열고 아래 명령어를 **순서대로** 복사해서 실행하세요:

### 1️⃣ **저장소 클론 및 이동**
```bash
cd ~ && git clone https://github.com/jjhmonolith/llmclass_plaform_ver.2.git && cd llmclass_plaform_ver.2
```

### 2️⃣ **API 키 설정 및 자동 배포**
```bash
export OPENAI_API_KEY="실제-API-키-입력" && chmod +x scripts/*.sh && ./scripts/macmini-production-setup.sh
```

---

## 🎯 **한 줄 명령어 (전체 자동화)**

API 키를 포함한 전체 과정을 한 번에:

```bash
cd ~ && git clone https://github.com/jjhmonolith/llmclass_plaform_ver.2.git && cd llmclass_plaform_ver.2 && export OPENAI_API_KEY="실제-API-키-입력" && chmod +x scripts/*.sh && ./scripts/macmini-production-setup.sh
```

⚠️ **주의**: `실제-API-키-입력` 부분을 실제 OpenAI API 키로 교체하세요!

---

## ✅ **설치 후 확인**

### **서비스 상태 확인**
```bash
./scripts/service-manager.sh status
```

### **접속 테스트**
```bash
open http://localhost
```

### **로그 확인**
```bash
./scripts/service-manager.sh logs
```

---

## 🔧 **문제 발생 시**

### **Docker Desktop 실행**
```bash
open -a Docker && sleep 30
```

### **서비스 재시작**
```bash
./scripts/service-manager.sh restart
```

### **전체 재설치**
```bash
cd ~ && rm -rf llmclass_plaform_ver.2 && git clone https://github.com/jjhmonolith/llmclass_plaform_ver.2.git && cd llmclass_plaform_ver.2 && export OPENAI_API_KEY="실제-API-키-입력" && chmod +x scripts/*.sh && ./scripts/macmini-production-setup.sh
```

---

## 📌 **성공 확인 체크리스트**

✅ Docker Desktop이 실행 중  
✅ http://localhost 접속 가능  
✅ 맥북 재시작 후에도 자동 시작  
✅ Cloudflare 터널 연결 (선택사항)  

🎉 **모두 확인되면 성공!**