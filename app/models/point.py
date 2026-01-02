from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

# 地点表
class Point(Base):
    __tablename__ = "points"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    name : Mapped[str] = mapped_column(String(20), unique=True, nullable=False) # 地点名，非空
    x : Mapped[float] = mapped_column(nullable=False) # 经度，非空
    y : Mapped[float] = mapped_column(nullable=False) # 纬度，非空
    category : Mapped[str] = mapped_column(String(20), nullable=True) # 地点分类，可空
    description : Mapped[str] = mapped_column(String(200), nullable=True) # 地点描述，可空
    img : Mapped[str] = mapped_column(String(200), nullable=True) # 地点图片URL，可空
    icon : Mapped[str] = mapped_column(String(200), nullable=True) # 地点图标URL，可空
