from datetime import datetime
from fastapi import Depends  
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependences import get_db
from app.shemas.auth import RegisterData
from app.models.auth import User

class UserCRUD:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db
    
    async def is_email_registered(self, email: str) -> bool:
        """
        检查邮箱是否已注册
        参数:
            email: 邮箱
        返回:
            bool
        """
        user = await self.db.execute(
            select(User).filter(User.email == email)
        )
        return user.scalar() is not None
    
    async def create_user(self, data: RegisterData):
        """
        创建用户
        参数:
            data: RegisterData
        返回:
            User: 创建的用户
        """
        user = User(
            username=data.username,
            email=data.email,
            hashed_password=data.password,
            create_time=datetime.now()
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user