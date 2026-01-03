from fastapi import APIRouter, Depends
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_session
from app.schemas.auth import RegisterData, LoginData, ResetPasswordData
from app.services.auth import UserService, EmailCodeService

router = APIRouter(prefix="/auth",tags=["auth"])

# 登录
@router.post("/login", status_code=200,description="用户登录")
async def login(data: LoginData, session: AsyncSession = Depends(get_session)):
    return await UserService(session).user_login(data)

# 注册
@router.post("/register", status_code=200,description="用户注册")
async def register(data: RegisterData, session: AsyncSession = Depends(get_session)):
    return await UserService(session).user_register(data)

# 获取邮箱验证码
@router.post("/code", status_code=200,description="获取邮箱验证码")
async def get_code(email: EmailStr, session: AsyncSession = Depends(get_session)):
    return await EmailCodeService(session).send_and_stock_code(email)

# 重置密码
@router.post("/reset-password", status_code=200,description="重置密码")
async def reset_password(data: ResetPasswordData, session: AsyncSession = Depends(get_session)):
    return await UserService(session).reset_password(data)
