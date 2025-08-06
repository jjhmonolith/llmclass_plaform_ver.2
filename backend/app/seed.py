"""
개발용 시드 데이터 생성 스크립트
"""
import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.core.security import hash_password, validate_password_strength
from app.models.teacher import Teacher

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_demo_teacher(db: Session) -> Teacher:
    """데모 교사 계정 생성"""
    demo_email = "demo@teacher.com"
    demo_password = "demo123"
    
    # 기존 계정 확인
    existing_teacher = db.query(Teacher).filter(Teacher.email == demo_email).first()
    if existing_teacher:
        logger.info(f"데모 교사 계정이 이미 존재합니다: {demo_email}")
        return existing_teacher
    
    # 비밀번호 강도 검증
    if not validate_password_strength(demo_password):
        raise ValueError(f"비밀번호가 너무 약합니다. 최소 6자 이상이어야 합니다.")
    
    # 새 교사 계정 생성
    hashed_password = hash_password(demo_password)
    teacher = Teacher(
        email=demo_email,
        password_hash=hashed_password
    )
    
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    
    logger.info(f"데모 교사 계정이 생성되었습니다: {demo_email}")
    logger.info(f"비밀번호: {demo_password}")
    
    return teacher


def main():
    """시드 데이터 생성 메인 함수"""
    logger.info("시드 데이터 생성을 시작합니다...")
    
    # 데이터베이스 연결 확인
    try:
        engine.connect()
        logger.info("데이터베이스 연결 성공")
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {e}")
        return
    
    # 데이터베이스 세션 생성
    db = SessionLocal()
    
    try:
        # 데모 교사 계정 생성
        teacher = create_demo_teacher(db)
        
        logger.info("시드 데이터 생성 완료!")
        logger.info("=" * 50)
        logger.info("데모 계정 정보:")
        logger.info(f"이메일: demo@teacher.com")
        logger.info(f"비밀번호: demo123")
        logger.info(f"생성일: {teacher.created_at}")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"시드 데이터 생성 중 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()