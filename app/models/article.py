from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base
from datetime import datetime


# 文章表
class Article(Base):
    __tablename__ = "articles"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    tag : Mapped[str] = mapped_column(String(20), nullable=False) # 文章标签，非空
    content : Mapped[str] = mapped_column(String(500), nullable=False) # 文章内容，非空
    img : Mapped[str] = mapped_column(String(200), nullable=True) # 文章图片URL，可空
    view_count : Mapped[int] = mapped_column(default=0) # 文章阅读次数，默认0
    like_count : Mapped[int] = mapped_column(default=0) # 文章点赞次数，默认0
    comment_count : Mapped[int] = mapped_column(default=0) # 文章评论次数，默认0
    status : Mapped[int] = mapped_column(default=0) # 文章状态，默认0
    create_time : Mapped[datetime] = mapped_column(default=datetime.now) # 创建时间，默认当前时间
    update_time : Mapped[datetime] = mapped_column(default=datetime.now, onupdate=datetime.now) # 更新时间，默认当前时间，更新时自动更新
    # 关联用户ID
    user_id : Mapped[int] = mapped_column(nullable=False) # 用户ID，非空
