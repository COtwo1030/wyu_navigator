from datetime import datetime 
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.schemas.auth import RegisterData
from app.models.auth import User, EmailCode

class AuthCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def is_email_registered(self, email: str) -> bool:
        """
        检查邮箱是否已注册
        参数:
            email: 邮箱
        返回:
            bool
        """
        user = await self.session.execute(
            select(User).filter(User.email == email)
        )
        return user.scalar() is not None
    
    async def create_user(self, data: RegisterData):
        """
        创建用户
        参数:
            data: RegisterData
        返回:
            User: 创建的用户, 包含用户ID
        """
        user = User(
            email=data.email,
            hashed_password=data.password,
            create_time=datetime.now()
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
    async def reset_user_password(self, email: str, hashed_password: str):
        """
        重置用户密码
        参数:
            email: 邮箱
            hashed_password: 新哈希密码
        返回:
            None
        """
        # 根据邮箱更新用户密码
        try:
            await self.session.execute(
                User.__table__.update()
                .where(User.email == email)
                .values(hashed_password=hashed_password)
            )
            await self.session.commit()
        except:
            return None

    async def search_user_hashed_password(self, email: str) -> str|None:
        """
        查询用户哈希密码
        参数:
            email: 邮箱
        返回:
            存在：用户哈希密码
            不存在：None
        """
        # 根据邮箱查询对应用户哈希密码
        user = await self.session.execute(
            select(User).filter(User.email == email)
        )
        user_obj = user.scalar()
        return user_obj.hashed_password if user_obj else None
    async def search_username(self, email: str) -> str|None:
        """
        查询邮箱对应的用户名
        参数:
            email: 邮箱
        返回:
            存在：用户名
            不存在：None
        """
        # 根据邮箱查询对应用户名
        user = await self.session.execute(
            select(User.username).filter(User.email == email)
        )
        return user.scalar()

    async def search_user_id_by_email(self, email: str) -> int|None:
        """
        查询邮箱对应的用户ID
        参数:
            email: 邮箱
        返回:
            存在：用户ID
            不存在：None
        """
        user = await self.session.execute(
            select(User.id).filter(User.email == email)
        )
        return user.scalar()
    # 检查用户是否存在
    async def check_exists(self, user_id: int) -> bool:
        """
        检查用户是否存在
        参数:
            user_id: 用户ID
        返回:
            bool
        """
        user = await self.session.execute(
            select(User).filter(User.id == user_id)
        )
        return user.scalar() is not None

class EmailCodeCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session
    async def create_verification_code(self, email: str, code: str):
        """
        发送验证码：不查询，直接覆盖
        参数:
            email: 邮箱
            code: 验证码
        返回:
            None
        """
        try:
            now = datetime.now()
            stmt = insert(EmailCode).values(email=email, code=code, create_time=now).on_conflict_do_update(
                index_elements=[EmailCode.email],
                set_={"code": code, "create_time": now}
            )
            await self.session.execute(stmt)
            await self.session.commit()
        except:
            return None
    
    async def search_code(self, email: str, code: str) -> EmailCode|None:
        """
        查询验证码是否存在
        参数:
            email: 邮箱
            code: 验证码
        返回:
            存在：EmailCode
            不存在：None
        """
        try:
            email_code = await self.session.execute(
                select(EmailCode).filter(EmailCode.email == email, EmailCode.code == code)
            )
        except:
            return None
        return email_code.scalar()
    
    async def get_latest_code_time(self, email: str):
        """
        获取该邮箱最近一次验证码的创建时间
        返回：datetime 或 None
        """
        result = await self.session.execute(
            select(EmailCode)
            .filter(EmailCode.email == email)
            .order_by(EmailCode.create_time.desc())
        )
        latest = result.scalars().first()
        return latest.create_time if latest else None
