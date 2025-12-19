from sqlalchemy.ext.asyncio import AsyncSession

from loguru import logger
from app.crud.point import PointCRUD
from app.shemas.point import PointData

class PointService:
    def __init__(self, session: AsyncSession):
        self.session = session
    async def add_point(self, data: PointData):
        await PointCRUD(self.session).create_point(data)
        logger.info(f"地点 {data.name} 添加成功")
        return {"message": "地点添加成功"}
    
