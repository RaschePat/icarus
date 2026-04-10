"""
auth.py — 회원가입 / 로그인 (JWT 토큰 반환)
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt
import jwt

from database import get_db
from models import UserRole
from core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7일


# ── 스키마 ────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"  # student / instructor / admin / mentor


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str


# ── 헬퍼 ──────────────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: str, role: str, name: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "name": name,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    secret = getattr(settings, "SECRET_KEY", "icarus-dev-secret")
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


# ── 엔드포인트 ────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 이메일 중복 체크
    stmt = select(UserRole).where(UserRole.email == body.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user_id = f"user-{uuid.uuid4().hex[:8]}"
    row = UserRole(
        user_id=user_id,
        email=body.email,
        name=body.name,
        role=body.role,
        hashed_password=_hash_password(body.password),
    )
    db.add(row)
    await db.commit()

    token = _create_token(user_id, body.role, body.name)
    return AuthResponse(access_token=token, user_id=user_id, role=body.role, name=body.name)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(UserRole).where(UserRole.email == body.email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = _create_token(user.user_id, user.role, user.name)
    return AuthResponse(
        access_token=token,
        user_id=user.user_id,
        role=user.role,
        name=user.name,
    )
