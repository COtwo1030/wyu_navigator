from pwdlib import PasswordHash
from app.database import AsyncSessionLocal

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
