.PHONY: help install dev backend frontend db-upgrade db-downgrade dev-seed dev-seed-modes test clean

help: ## 사용 가능한 명령어들을 보여줍니다
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## 모든 의존성을 설치합니다
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev: ## 개발 서버를 시작합니다 (백엔드와 프런트엔드 동시)
	@echo "백엔드 서버를 3000번 포트에서 시작합니다..."
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload &
	@echo "프런트엔드 서버를 5173번 포트에서 시작합니다..."
	cd frontend && npm run dev

backend: ## 백엔드 서버만 시작합니다
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload

frontend: ## 프런트엔드 서버만 시작합니다
	cd frontend && npm run dev

db-upgrade: ## 데이터베이스 마이그레이션을 실행합니다
	cd backend && alembic upgrade head

db-downgrade: ## 데이터베이스 마이그레이션을 되돌립니다
	cd backend && alembic downgrade -1

dev-seed: ## 개발용 시드 데이터를 생성합니다
	cd backend && python -m app.seed

dev-seed-modes: ## 모드 시드 데이터를 생성합니다 (S2용)
	cd backend && python -m app.seed_modes

test: ## 테스트를 실행합니다
	cd backend && pytest

test-templates: ## 템플릿 관련 테스트만 실행합니다 (S2)
	cd backend && pytest tests/test_templates.py -v

test-integration: ## 통합 테스트를 실행합니다
	./test_simple.sh

backup: ## 데이터베이스를 수동 백업합니다
	./backup_script.sh

setup-cron: ## 매일 자정 자동 백업을 설정합니다
	./setup_cron.sh

backup-status: ## 백업 상태와 로그를 확인합니다
	@echo "=== 백업 파일 목록 ==="
	@ls -la backups/ 2>/dev/null || echo "백업 파일이 없습니다"
	@echo ""
	@echo "=== 최근 백업 로그 ==="
	@tail -10 logs/backup.log 2>/dev/null || echo "백업 로그가 없습니다"

clean: ## 캐시 파일들을 정리합니다
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -name "*.pyc" -delete