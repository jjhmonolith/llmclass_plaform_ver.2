#!/bin/bash
# cron job 설정 스크립트

PROJECT_DIR=$(pwd)
CRON_JOB="0 3 * * * cd $PROJECT_DIR && ./backup_script.sh"

echo "프로젝트 디렉토리: $PROJECT_DIR"
echo "설정할 cron job: $CRON_JOB"

# 현재 cron 작업 목록 가져오기
crontab -l > current_cron 2>/dev/null || touch current_cron

# 이미 백업 작업이 있는지 확인
if grep -q "backup_script.sh" current_cron; then
    echo "⚠️  이미 백업 cron job이 설정되어 있습니다."
    echo "현재 설정:"
    grep "backup_script.sh" current_cron
    read -p "기존 설정을 덮어쓰시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설정을 취소했습니다."
        rm current_cron
        exit 0
    fi
    # 기존 백업 작업 제거
    grep -v "backup_script.sh" current_cron > temp_cron && mv temp_cron current_cron
fi

# 새로운 cron job 추가
echo "$CRON_JOB" >> current_cron

# cron job 설정 적용
crontab current_cron

if [ $? -eq 0 ]; then
    echo "✅ 매일 자정 자동 백업이 설정되었습니다!"
    echo ""
    echo "설정 확인:"
    crontab -l | grep "backup_script.sh"
    echo ""
    echo "📝 참고사항:"
    echo "- 백업 파일은 backups/ 폴더에 저장됩니다"
    echo "- 백업 로그는 logs/backup.log에서 확인할 수 있습니다"
    echo "- 30일 이상된 백업은 자동으로 삭제됩니다"
    echo ""
    echo "수동 백업 실행: make backup"
    echo "백업 로그 확인: tail -f logs/backup.log"
else
    echo "❌ cron job 설정에 실패했습니다."
    exit 1
fi

# 임시 파일 정리
rm current_cron