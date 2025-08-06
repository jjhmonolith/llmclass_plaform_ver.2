# 데이터베이스 백업 가이드

## 자동 백업 설정

### 1. 초기 설정 (한 번만 실행)
```bash
make setup-cron
```

이 명령어는 매일 새벽 3시(03:00)에 자동으로 데이터베이스를 백업하도록 cron job을 설정합니다.

### 2. 백업 확인
```bash
make backup-status
```

백업 파일 목록과 최근 백업 로그를 확인할 수 있습니다.

## 수동 백업

### 즉시 백업 실행
```bash
make backup
```

## 백업 파일 관리

### 저장 위치
- **백업 파일**: `backups/` 폴더
- **백업 로그**: `logs/backup.log` 파일

### 파일명 규칙
```
app_backup_YYYYMMDD_HHMMSS.db
예: app_backup_20240801_000001.db
```

### 자동 정리
- 180일 이상된 백업 파일은 자동으로 삭제됩니다
- 매일 새벽 3시 백업 시 함께 실행됩니다

## 백업 복구

### 백업 파일로 복구하기
```bash
# 1. 현재 데이터베이스 백업 (안전을 위해)
make backup

# 2. 복구할 백업 파일 확인
ls -la backups/

# 3. 데이터베이스 복구
cp backups/app_backup_YYYYMMDD_HHMMSS.db backend/data/app.db
```

## 백업 모니터링

### 백업 로그 실시간 확인
```bash
tail -f logs/backup.log
```

### cron job 상태 확인
```bash
crontab -l | grep backup
```

## 문제 해결

### 백업이 실행되지 않는 경우
1. cron 서비스 상태 확인
2. 스크립트 실행 권한 확인: `ls -la backup_script.sh`
3. 로그 파일 확인: `cat logs/backup.log`

### 용량 부족 경고
- 백업 파일이 많이 쌓이면 디스크 용량을 확인하세요
- 필요시 보관 기간을 180일에서 조정할 수 있습니다

## 클라우드 백업 (선택사항)

추가 안전성을 위해 중요한 백업 파일을 클라우드에 저장하는 것을 권장합니다:
- iCloud Drive
- Google Drive
- Dropbox
- 외부 하드드라이브