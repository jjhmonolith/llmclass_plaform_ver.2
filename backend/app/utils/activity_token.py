"""
Activity Token utilities - JWT token for activity logging authorization
"""
import jwt
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_activity_token(run_id: int, enrollment_id: int, student_name: str) -> str:
    """
    Generate activity token for student session
    
    Args:
        run_id: Session run ID
        enrollment_id: Student enrollment ID
        student_name: Student name (normalized)
    
    Returns:
        JWT token string
    """
    payload = {
        "run_id": run_id,
        "enrollment_id": enrollment_id,
        "student_name": student_name,
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "activity_token"
    }
    
    token = jwt.encode(
        payload, 
        settings.activity_token_secret, 
        algorithm="HS256"
    )
    
    logger.info(f"Activity token generated: run_id={run_id}, enrollment_id={enrollment_id}, student={student_name}")
    return token


def verify_activity_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify activity token and extract payload
    
    Args:
        token: JWT token string
    
    Returns:
        Token payload dict or None if invalid
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(
            token, 
            settings.activity_token_secret, 
            algorithms=["HS256"]
        )
        
        # Validate token type
        if payload.get("type") != "activity_token":
            logger.warning(f"Invalid token type: {payload.get('type')}")
            return None
        
        # Extract required fields
        run_id = payload.get("run_id")
        enrollment_id = payload.get("enrollment_id")
        student_name = payload.get("student_name")
        
        if not all([run_id, enrollment_id, student_name]):
            logger.warning(f"Missing required fields in token payload")
            return None
        
        return {
            "run_id": run_id,
            "enrollment_id": enrollment_id,
            "student_name": student_name,
            "iat": payload.get("iat")
        }
        
    except jwt.ExpiredSignatureError:
        logger.warning("Activity token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid activity token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None


def extract_token_from_header(authorization_header: Optional[str]) -> Optional[str]:
    """
    Extract Bearer token from Authorization header
    
    Args:
        authorization_header: "Bearer <token>" format
    
    Returns:
        Token string or None
    """
    if not authorization_header:
        return None
    
    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]