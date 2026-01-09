from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_session
from app.schemas.point import PointData
from app.services.point import PointService

router = APIRouter(prefix="/point",tags=["地点"])

# 添加地点
@router.post("/add", status_code=200,description="添加地点")
async def add_point(data: PointData, session: AsyncSession = Depends(get_session)):
    return await PointService(session).add_point(data)

# 获取所有地点
@router.get("/list", status_code=200,description="获取所有地点")
async def get_points(session: AsyncSession = Depends(get_session)):
    return await PointService(session).get_points()