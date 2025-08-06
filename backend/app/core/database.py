"""
데이터베이스 연결 및 설정
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# SQLite 연결 설정 (WAL 모드로 동시성 개선)
engine = create_engine(
    settings.database_url,
    echo=settings.db_echo if hasattr(settings, 'db_echo') else False,
    pool_size=settings.db_pool_size if hasattr(settings, 'db_pool_size') else 20,
    max_overflow=settings.db_max_overflow if hasattr(settings, 'db_max_overflow') else 30,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# WAL 모드 설정 (SQLite 동시성 개선)
if "sqlite" in settings.database_url:
    from sqlalchemy import event
    
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # WAL 모드 활성화 (읽기/쓰기 동시성 개선)
        cursor.execute("PRAGMA journal_mode=WAL")
        # 외래키 제약조건 활성화
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    event.listen(engine, "connect", set_sqlite_pragma)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모든 모델의 부모)
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()