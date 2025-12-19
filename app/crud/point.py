from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.point import Point

from app.shemas.point import PointData

class PointCRUD:
    def __init__(self, session: AsyncSession) -> bool:
        self.session = session
    async def check_point_exist(self, name: str) -> bool:
        """
        检查地点是否存在
        参数：
            name: str
        返回值：
            存在：True
            不存在：False
        """
        result = await self.session.execute(select(Point).filter_by(name=name))
        return result.scalars().first() is not None
    
    async def create_point(self, data: PointData):
        """
        创建地点
        参数：
            data: PointData
        无返回值
        """
        point = Point(name=data.name, x=data.x, y=data.y)
        self.session.add(point)
        await self.session.commit()
    