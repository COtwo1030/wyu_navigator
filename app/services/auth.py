from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.dependences import get_hash_password
from app.shemas.auth import RegisterData
from app.crud.auth import UserCRUD

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_crud = UserCRUD(session)

    async def register_user(self, data: RegisterData):
        """
        处理用户注册
        参数:
            data: RegisterData
        返回:
            User: 注册的用户
        """
        logger.info(f"开始处理用户注册: email={data.email}, username={data.username}")
        
        # 邮箱验证码是否正确
        # 邮箱是否已注册
        if await self.user_crud.is_email_registered(email=data.email):
            logger.warning(f"注册失败: 邮箱已存在 - {data.email}")
            raise HTTPException(status_code=400, detail="邮箱已注册")
        # 创建用户
        data.password = await get_hash_password(data.password) # 对密码进行哈希处理
        new_user = await self.user_crud.create_user(data)
        
        logger.success(f"用户注册成功: email={data.email}, id={new_user.id}")
        return {"message": "注册成功"}