"""
deps.py — FastAPI 공통 의존성 (JWT 인증 등)
"""
from fastapi import HTTPException, Header
from typing import Annotated
import jwt

from core.config import settings

JWT_ALGORITHM = "HS256"


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    """
    Authorization: Bearer <token> 헤더에서 사용자 정보를 추출합니다.
    Returns: {"user_id": str, "role": str, "name": str}
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise ValueError
        payload = jwt.decode(parts[1], settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {
            "user_id": payload["sub"],
            "role":    payload.get("role", "student"),
            "name":    payload.get("name", ""),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except Exception:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


def require_admin(current_user: dict = None) -> dict:
    """admin 역할 필수 체크."""
    if current_user and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user
