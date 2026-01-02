from sqlalchemy.ext.asyncio import AsyncSession

from loguru import logger
from app.crud.point import PointCRUD
from app.shemas.point import PointData

class PointService:
    def __init__(self, session: AsyncSession):
        self.session = session
    async def add_point(self, data: PointData):
        # 检查地点是否存在
        if await PointCRUD(self.session).check_point_exist(data.name):
            logger.error(f"地点 {data.name} 已存在")
            return {"message": "地点已存在"}
        # 创建地点
        await PointCRUD(self.session).create_point(data)
        logger.info(f"地点 {data.name} 添加成功")
        return {"message": "地点添加成功"}
    
    async def get_points(self) -> list[PointData]:
        """
        获取所有地点
        参数：
            无
        返回值：
            json格式: {"message": "获取成功", 
            "points": [{"id": 5,"x": 113.086071,"y": 22.600429,"name": "北门","category": "入口","description": "北门入口","img": "https://example.com/bmen.jpg"}]
            }
        """
        # 获取所有地点（一定按id排序）
        points = await PointCRUD(self.session).get_points()
        points = [{"id": p.id, "x": p.x, "y": p.y, "name": p.name, "category": p.category, "description": p.description, "img": p.img, "icon": p.icon} for p in points]
        logger.info(f"地点获取成功，共 {len(points)} 个地点")
        return {"message": "获取成功", "points": points}
    
