"""
PIN 생성 및 해시 유틸리티
"""
import random
import secrets
from passlib.context import CryptContext
from app.core.config import settings


# Argon2id 해시 컨텍스트
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def generate_rejoin_pin() -> str:
    """숫자로만 구성된 재참여 PIN 생성"""
    pin_length = settings.rejoin_pin_length
    # 숫자만 사용 (0-9)
    return ''.join(random.choices('0123456789', k=pin_length))


def hash_pin(pin: str) -> str:
    """PIN을 Argon2id로 해시"""
    return pwd_context.hash(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """PIN 검증"""
    return pwd_context.verify(plain_pin, hashed_pin)


def create_pin_hint(pin: str) -> str:
    """PIN 힌트 생성 (일부 문자를 *로 마스킹)"""
    if len(pin) <= 2:
        # 2자리 이하에서는 첫 번째 문자만 보여줌
        return pin[0] + "*" * (len(pin) - 1)
    
    # 3자리 이상에서는 첫 번째와 마지막 문자만 보여주고 나머지는 *로 마스킹
    masked = pin[0] + "*" * (len(pin) - 2) + pin[-1]
    return masked


def normalize_student_name(name: str) -> str:
    """학생 이름 정규화 (소문자 + 공백 제거)"""
    return name.strip().lower()


def validate_student_name(name: str) -> tuple[bool, str]:
    """학생 이름 유효성 검사"""
    if not name or not name.strip():
        return False, "이름을 입력해주세요."
    
    normalized = normalize_student_name(name)
    
    if len(normalized) > 20:
        return False, "이름은 20자 이하로 입력해주세요."
    
    # 공백만 있거나 특수문자만 있는 경우 체크
    if not normalized or not normalized.replace(' ', '').isalnum():
        return False, "올바른 이름을 입력해주세요."
    
    return True, ""