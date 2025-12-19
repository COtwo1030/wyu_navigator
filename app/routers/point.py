from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependences import get_session
from app.shemas.point import PointData
from app.services.point import PointService

router = APIRouter(prefix="/point",tags=["point"])

# 添加地点
@router.post("/point", status_code=200,description="添加地点")
async def add_point(data: PointData, session: AsyncSession = Depends(get_session)):
    return await PointService(session).add_point(data)