from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import DateTime, String

from .base import Base

# 用户详情表
class UserDetail(Base):
    __tablename__ = "user_details"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    user_id : Mapped[int] = mapped_column(unique=True, nullable=False) # 用户ID，唯一，非空
    username : Mapped[str] = mapped_column(String(20), nullable=False, default="") # 用户名，默认空字符串
    year : Mapped[str] = mapped_column(String(10), nullable=False, default="") # 入学年份，默认空字符串
    gender : Mapped[str] = mapped_column(String(10), nullable=False, default="") # 性别，默认空字符串
    avatar : Mapped[str] = mapped_column(String(200), nullable=False, default="") # 头像，默认空字符串
    create_time : Mapped[DateTime] = mapped_column(DateTime, nullable=False) # 创建时间，非空