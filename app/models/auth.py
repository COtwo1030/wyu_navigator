from sqlalchemy import String, DateTime
from sqlalchemy.orm import mapped_column, Mapped
from .base import Base

# 用户表
class User(Base):
    __tablename__ = "users"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    username : Mapped[str] = mapped_column(String(20), nullable=False) # 用户名，非空
    hashed_password : Mapped[str] = mapped_column(String(100), nullable=False) # 密码，非空
    email : Mapped[str] = mapped_column(String(50), unique=True, nullable=False) # 邮箱，唯一，非空
    create_time : Mapped[DateTime] = mapped_column(DateTime, nullable=False) # 创建时间，非空
    
# 邮箱验证码表
class EmailCode(Base):
    __tablename__ = "email_codes"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    email : Mapped[str] = mapped_column(String(50), nullable=False) # 邮箱，非空
    code : Mapped[str] = mapped_column(String(4), nullable=False) # 验证码，非空
    create_time : Mapped[DateTime] = mapped_column(DateTime, nullable=False) # 创建时间，非空