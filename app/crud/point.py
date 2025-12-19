from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.point import Point

from app.shemas.point import PointData

class PointCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_point(self, data: PointData):
        point = Point(name=data.name, x=data.x, y=data.y)
        self.session.add(point)
        await self.session.commit()
        return point
    