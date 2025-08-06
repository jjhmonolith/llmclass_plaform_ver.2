# 💸 AWS 완전 정리 가이드 (비용 0원 만들기)

## 🎯 목표: AWS 비용을 완전히 0원으로 만들기

### 📋 현재 상황
✅ 맥미니 + Cloudflare Tunnel로 이전 완료  
✅ 네임서버가 이미 Cloudflare로 설정됨  
❌ AWS 리소스들이 여전히 비용 발생 중

---

## 🗂 1단계: Route53 레코드 완전 정리

### ✅ 즉시 삭제 - SSL 검증 레코드들
Route53 콘솔에서 다음 레코드들을 **모두 삭제**:

```
🗑️ _6b3a0391147217bdc46b377281fa0015.llmclass.org
🗑️ _a8c25e79aa7407b2520dc015d370847a.api.llmclass.org
🗑️ _e0231ce7417626474f5e8397afeae066.dev.llmclass.org
🗑️ _297089e95f2b466552430a5e7dc5726c.api.dev.llmclass.org
🗑️ _078e3f8cece2ec6d7747728c7b0507d8.stage.llmclass.org
🗑️ _95907577676bac02034778e8c6fa276f.api.stage.llmclass.org
```

### ✅ 개발 서버 레코드 삭제 (AWS 안 쓰니까)
```
🗑️ dev.llmclass.org           → 52.63.139.191
🗑️ fire.dev.llmclass.org      → 52.63.139.191
🗑️ socratic.dev.llmclass.org  → 52.63.139.191
🗑️ strategic.dev.llmclass.org → 52.63.139.191
```

### 🚫 유지할 레코드 (필수)
```
✅ llmclass.org NS  → paul.ns.cloudflare.com (절대 삭제 금지!)
✅ llmclass.org SOA → DNS 존 정보 (자동 생성)
```

---

## 🖥 2단계: EC2 완전 정리

### 📍 EC2 콘솔 접속
1. [AWS EC2 콘솔](https://console.aws.amazon.com/ec2/) 접속
2. **리전 확인** (우측 상단) - 서울, 버지니아 등 모든 리전 체크

### 🔍 삭제할 EC2 리소스들

#### A. 인스턴스 (52.63.139.191)
```
1. EC2 → Instances 선택
2. 실행 중인 인스턴스 확인
3. 선택 → Actions → Instance State → Terminate
4. "Delete on Termination" 체크 확인
```

#### B. 볼륨 (EBS)
```
1. EC2 → Volumes 선택  
2. "Available" 상태 볼륨들 확인
3. 선택 → Actions → Delete Volume
```

#### C. 스냅샷
```
1. EC2 → Snapshots 선택
2. 개인 소유 스냅샷 확인
3. 선택 → Actions → Delete
```

#### D. 보안 그룹 (기본 제외)
```
1. EC2 → Security Groups 선택
2. "default" 아닌 그룹들 선택
3. Actions → Delete Security Group
```

#### E. 키 페어
```
1. EC2 → Key Pairs 선택
2. 사용하던 키 페어 선택
3. Actions → Delete
```

---

## 🌐 3단계: 기타 AWS 서비스 정리

### 📜 Certificate Manager (ACM)
```
1. Certificate Manager 콘솔 접속
2. 발급된 SSL 인증서 확인
3. 사용하지 않는 인증서 삭제
```

### 🗄 S3 버킷 확인
```
1. S3 콘솔 접속
2. 버킷 목록 확인
3. 불필요한 버킷 삭제 (비어있어야 삭제 가능)
```

### 📊 CloudWatch 로그
```
1. CloudWatch 콘솔 접속
2. Logs → Log groups 확인
3. 불필요한 로그 그룹 삭제
```

### 🔄 Elastic IP
```
1. EC2 → Elastic IPs 선택
2. 할당된 IP 확인
3. Actions → Release Elastic IP
```

---

## 💰 4단계: 비용 모니터링 설정

### 📊 Billing Dashboard 확인
```
1. AWS Billing 콘솔 접속
2. "Bills" 탭에서 현재 비용 확인
3. 각 서비스별 비용 내역 체크
```

### 🚨 비용 알림 설정
```
1. CloudWatch → Billing 선택
2. "Create Alarm" 클릭
3. 임계값: $1 (1달러 초과시 알림)
4. 이메일 알림 설정
```

### 📈 Cost Explorer
```
1. Cost Management → Cost Explorer
2. 지난 달 vs 이번 달 비용 비교
3. 서비스별 비용 분석
```

---

## ✅ 5단계: 완전 정리 체크리스트

### 🔍 최종 확인 사항
```
□ Route53: 불필요한 레코드 10개 삭제
□ EC2: 인스턴스 종료 (52.63.139.191)
□ EBS: 볼륨 삭제
□ ACM: SSL 인증서 삭제  
□ S3: 빈 버킷 삭제
□ Elastic IP: 릴리스
□ CloudWatch: 로그 그룹 정리
□ 비용 알림: $1 임계값 설정
```

### 💸 예상 결과
```
기존: $10-50/월 (EC2, EBS, Route53 등)
정리후: $0.50/월 (Route53 호스팅 존만 유지)
```

---

## 🎯 최종 상태 (이상적)

### ✅ 유지할 AWS 서비스
```
Route53 호스팅 존: $0.50/월 (llmclass.org NS 레코드만)
```

### 🌐 새로운 서비스 구조
```
맥미니 (로컬) → Cloudflare Tunnel → 전세계 사용자
비용: $0/월 (Cloudflare 무료 플랜)
```

---

## ⚠️ 주의사항

### 🚫 절대 삭제하면 안 되는 것
```
❌ llmclass.org NS 레코드 → 도메인 완전 접속 불가
❌ Route53 호스팅 존 전체 → 도메인 소유권 잃음
```

### ✅ 안전한 삭제 순서
```
1. 백업: 현재 설정 스크린샷
2. 인스턴스 종료
3. 24시간 대기 (혹시 모를 문제 확인)
4. 나머지 리소스 삭제
```

---

## 📞 문제 발생시 대처법

### 🔄 롤백 방법
만약 문제가 생기면:
```
1. Route53에서 A 레코드 다시 생성
2. EC2 인스턴스 새로 시작
3. Cloudflare 설정 원복
```

### 📱 비상 연락처
AWS 지원 (기본 플랜도 계정 관련 도움 가능):
- AWS Support Center에서 "Account and Billing" 문의

---

**이 가이드대로 진행하면 AWS 비용을 거의 0원으로 만들 수 있습니다!**

*순서대로 천천히 진행하시고, 각 단계별로 확인해가며 삭제하세요.*