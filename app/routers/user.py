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

# 按页数查询用户互动记录
@router.get("/{user_id}/interacts", status_code=200, description="按页数查询用户互动记录")
async def get_user_interact(
    user_id: int = Depends(get_current_user_id),
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).get_user_interact(user_id, page, page_size)

# 查询未读互动记录数量
@router.get("/{user_id}/interacts/unread_count", status_code=200, description="查询未读互动记录数量")
async def get_unread_interact_count(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).get_unread_interact_count(user_id)

# 标记用户互动记录为已读
@router.post("/{user_id}/interacts/status", status_code=200, description="标记用户互动记录为已读")
async def read_user_interacts(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).read_user_interacts(user_id)

# 阅读用户互动记录
@router.post("/read_interact", status_code=200, description="阅读用户互动记录")
async def read_user_interact(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).read_user_interact(user_id)

# 查询用户信息
@router.get("/info", status_code=200, description="查询用户信息")
async def get_user_info(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).get_user_info(user_id)
