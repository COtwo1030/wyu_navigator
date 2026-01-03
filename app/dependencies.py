from pwdlib import PasswordHash
from app.database import AsyncSessionLocal
from fastapi import Depends, HTTPException, status, Header

from datetime import datetime, timedelta, timezone
import jwt
from jwt.exceptions import InvalidTokenError
from app.settings import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# 数据库依赖项
async def get_session():
    session = AsyncSessionLocal()
    try:
        yield session
    finally:
        await session.close()

# 哈希依赖项
password_hash = PasswordHash.recommended()
async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否匹配哈希值
    参数:
        plain_password: 明文密码
        hashed_password: 哈希密码
    返回:
        bool
    """
    return password_hash.verify(plain_password, hashed_password)

async def get_hash_password(password: str) -> str:
    """
    对密码进行哈希处理
    参数:
        password: 明文密码
    返回:
        哈希密码
    """
    return password_hash.hash(password)


def create_access_token(user_id: int, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """
    创建访问令牌
    参数:
        user_id: 用户ID
        expires_minutes: 过期时间（分钟）
    返回:
        访问令牌
    """
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=expires_minutes)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未提供令牌或格式错误")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌无效或已过期")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="非法用户标识")
    try:
        return int(sub)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="非法用户标识")
