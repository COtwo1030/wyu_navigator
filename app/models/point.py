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