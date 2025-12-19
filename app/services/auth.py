import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from aiosmtplib.errors import SMTPException

from app.dependences import get_hash_password, verify_password
from app.shemas.auth import RegisterData, LoginData, ResetPasswordData
from app.crud.auth import UserCRUD, EmailCodeCRUD
import app.settings as settings

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def user_login(self, data: LoginData):
        """
        处理用户登录
        参数:
            data: LoginData
        返回:
            dict: {"message": "登录成功"}
        """
        # 根据邮箱获取数据库中的密码
        db_hashed_password = await UserCRUD(self.session).search_user_hashed_password(email=data.email)
        if db_hashed_password is None:
            logger.warning(f"登录失败: 邮箱不存在 - {data.email}")
            raise HTTPException(status_code=400, detail="邮箱不存在")
        # 验证密码
        is_valid = await verify_password(data.password, db_hashed_password)
        if not is_valid:
            logger.warning(f"登录失败: 密码错误 - {data.email}")
            raise HTTPException(status_code=400, detail="密码错误")
        logger.success(f"用户登录成功: email={data.email}")
        return {"message": "登录成功"}

    async def user_register(self, data: RegisterData):
        """
        处理用户注册
        参数:
            data: RegisterData
        返回:
            User: 注册的用户
        """
        logger.info(f"开始处理用户注册: email={data.email}, username={data.username}")
        
        # 查询验证码
        EmailCode = await EmailCodeCRUD(self.session).search_code(email=data.email, code=data.code)
        if EmailCode is None:
            logger.warning(f"注册失败: 验证码错误或不存在 - {data.email}")
            raise HTTPException(status_code=400, detail="验证码错误或不存在")
        # 检查验证码是否过期
        if (datetime.now() - EmailCode.create_time).seconds > 600:
            logger.warning(f"注册失败: 验证码过期 - {data.email}")
            raise HTTPException(status_code=400, detail="验证码过期")
        # 邮箱是否已注册
        if await UserCRUD(self.session).is_email_registered(email=data.email):
            logger.warning(f"注册失败: 邮箱已存在 - {data.email}")
            raise HTTPException(status_code=400, detail="邮箱已注册")
        # 创建用户
        data.password = await get_hash_password(data.password) # 对密码进行哈希处理
        new_user = await UserCRUD(self.session).create_user(data)
        
        logger.success(f"用户注册成功: email={data.email}, id={new_user.id}")
        return {"message": "注册成功"}
    
    async def reset_password(self, data: ResetPasswordData):
        """
        重置用户密码
        参数:
            data: ResetPasswordData
        返回:
            dict: {"message": "密码重置成功"}
        """
        # 查询邮箱是否存在
        if not await UserCRUD(self.session).is_email_registered(email=data.email):
            logger.warning(f"重置密码失败: 邮箱不存在 - {data.email}")
            raise HTTPException(status_code=400, detail="邮箱不存在")
        # 查询验证码是否存在
        EmailCode = await EmailCodeCRUD(self.session).search_code(email=data.email, code=data.code)
        if EmailCode is None:
            logger.warning(f"重置密码失败: 验证码错误或不存在 - {data.email}")
            raise HTTPException(status_code=400, detail="验证码错误或不存在")
        # 检查验证码是否过期
        if (datetime.now() - EmailCode.create_time).seconds > 600:
            logger.warning(f"重置密码失败: 验证码过期 - {data.email}")
            raise HTTPException(status_code=400, detail="验证码过期")
        # 更新密码
        hashed_password = await get_hash_password(data.password)
        await UserCRUD(self.session).reset_user_password(email=data.email, hashed_password=hashed_password)
        logger.success(f"用户密码重置成功: email={data.email}")
        return {"message": "密码重置成功"}

class EmailCodeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.email_code_crud = EmailCodeCRUD(session)
    
    async def send_and_stock_code(self, email):
        """
        发送邮箱验证码并存储到数据库
        参数:
            email: EmailStr
        返回:
            dict: {"message": "验证码发送成功"}
        """
        # 生成四位验证码
        code = str(random.randint(1000, 9999))
        # 发送验证码
        mail_config = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        )
        fm = FastMail(mail_config)
        message = MessageSchema(
            subject="五邑大学校园导航邮箱验证码",
            recipients=[email],
            body=f"您的验证码为: {code}",
            subtype=MessageType.plain
        )
        try:
            await fm.send_message(message)
        except SMTPException as e:
            if e.code == -1: # bug: 邮箱验证码发送成功时，返回-1
                logger.warning(f"邮箱验证码发送成功: email={email}, error={e}")
            else:
                logger.error(f"邮箱验证码发送失败: email={email}, error={e}")
                raise HTTPException(status_code=500, detail="邮箱验证码发送失败")
        # 存储验证码到数据库
        await self.email_code_crud.create_verification_code(email=email, code=code)
        return {"message": "验证码发送成功"}