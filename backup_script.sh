#!/bin/bash
# SQLite 데이터베이스 자동 백업 스크립트

# 로그 파일 설정
LOG_FILE="logs/backup.log"
mkdir -p logs

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 백업 디렉토리 생성
mkdir -p backups

# 현재 날짜로 백업 파일명 생성
BACKUP_FILE="backups/app_backup_$(date +%Y%m%d_%H%M%S).db"

log "데이터베이스 백업 시작"

# 데이터베이스 파일 존재 확인
if [ ! -f "backend/data/app.db" ]; then
    log "ERROR: 데이터베이스 파일이 존재하지 않습니다: backend/data/app.db"
    exit 1
fi

# 데이터베이스 백업 (트랜잭션 안전)
if sqlite3 backend/data/app.db ".backup $BACKUP_FILE"; then
    log "백업 완료: $BACKUP_FILE"
    
    # 백업 파일 크기 확인
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    log "백업 파일 크기: $BACKUP_SIZE"
else
    log "ERROR: 백업 실패"
    exit 1
fi

# 180일 이상 된 백업 파일 삭제
DELETED_COUNT=$(find backups -name "app_backup_*.db" -mtime +180 -delete -print | wc -l)
log "오래된 백업 파일 정리 완료 (삭제된 파일: $DELETED_COUNT개)"

# 현재 백업 파일 개수 확인
BACKUP_COUNT=$(ls -1 backups/app_backup_*.db 2>/dev/null | wc -l)
log "현재 백업 파일 개수: $BACKUP_COUNT개"

log "백업 작업 완료"