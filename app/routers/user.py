from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.user import UserService
from app.schemas.user import UserDetailData
from app.dependencies import get_current_user_id, get_session

router = APIRouter(prefix="/user", tags=["用户"])

# 上传/更新用户头像
@router.post("/avatar", status_code=200, description="上传/更新用户头像")
async def upload_avatar(
    user_id: int = Depends(get_current_user_id),
    avatar_url: str = Query(..., description="头像URL"),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).upload_avatar(user_id, avatar_url)

# 上传用户详情
@router.post("/detail", status_code=200, description="上传用户详情")
async def upload_user_detail(
    user_id: int = Depends(get_current_user_id),
    user_detail: UserDetailData = Query(..., description="用户详情"),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).upload_user_detail(user_id, user_detail)

# 查询用户信息
@router.get("/info", status_code=200, description="查询用户信息")
async def get_user_info(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).get_user_info(user_id)
