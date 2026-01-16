from sqlalchemy import String, func, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base
from datetime import datetime

# 文章表
class Article(Base):
    __tablename__ = "articles"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    user_id : Mapped[int] = mapped_column(nullable=False) # 用户ID，非空
    username : Mapped[str] = mapped_column(String(20), nullable=False) # 用户名，非空
    avatar : Mapped[str] = mapped_column(String(200), nullable=False) # 文章作者头像URL，可空
    gender : Mapped[str] = mapped_column(String(20), nullable=True) # 文章作者性别，可空
    year : Mapped[str] = mapped_column(String(20), nullable=True) # 文章作者年份，可空
    tag : Mapped[str] = mapped_column(String(20), nullable=True) # 文章标签，可空
    content : Mapped[str] = mapped_column(String(5000), nullable=False) # 文章内容，非空
    img : Mapped[str] = mapped_column(String(500), nullable=True) # 文章图片URL，可空
    view_count : Mapped[int] = mapped_column(default=0) # 文章阅读次数，默认0
    like_count : Mapped[int] = mapped_column(default=0) # 文章点赞次数，默认0
    comment_count : Mapped[int] = mapped_column(default=0) # 文章评论次数，默认0
    status : Mapped[int] = mapped_column(default=0) # 文章状态，默认0
    create_time : Mapped[datetime] = mapped_column(default=datetime.now) # 创建时间，默认当前时间
    update_time : Mapped[datetime] = mapped_column(default=datetime.now, onupdate=datetime.now) # 更新时间，默认当前时间，更新时自动更新

# 文章点赞表
class ArticleLike(Base):
    __tablename__ = "article_likes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="点赞记录ID")
    # 关联用户ID
    user_id: Mapped[int] = mapped_column(nullable=False, comment="点赞用户ID")
    # 关联文章ID
    article_id: Mapped[int] = mapped_column(nullable=False, comment="被点赞的文章ID")
    create_time: Mapped[datetime] = mapped_column(default=func.now(), comment="点赞时间")
    # 核心约束与索引
    __table_args__ = (
        # 唯一约束：一个用户只能给一篇文章点一次赞（避免重复点赞）
        UniqueConstraint("user_id", "article_id", name="uk_user_article"),
        # 索引1：按文章ID查点赞记录（比如统计点赞数、查谁给这篇文章点了赞）
        Index("idx_article_likes_article_id", "article_id"),
        # 索引2：按用户ID查点赞过的文章（比如“我的点赞”功能）
        Index("idx_article_likes_user_id", "user_id"),
    )

# 文章评论表
class ArticleComment(Base):
    __tablename__ = "comments"
    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键，自动递增
    user_id : Mapped[int] = mapped_column(nullable=False) # 用户ID，非空
    username : Mapped[str] = mapped_column(String(20), nullable=False) # 用户名，非空
    avatar : Mapped[str] = mapped_column(String(200), nullable=False) # 用户头像URL，非空
    article_id : Mapped[int] = mapped_column(nullable=False) # 文章ID，非空
    parent_id : Mapped[int] = mapped_column(default=0) # 父评论ID，0为一级评论，大于0为二级评论（值为一级评论ID）
    content : Mapped[str] = mapped_column(String(200), nullable=False) # 评论内容，非空
    img : Mapped[str] = mapped_column(String(500), nullable=True) # 评论图片URL，可空
    like_count : Mapped[int] = mapped_column(default=0) # 评论点赞次数，默认0
    status : Mapped[int] = mapped_column(default=0)
    create_time : Mapped[datetime] = mapped_column(default=func.now()) # 创建时间，默认当前时间
    update_time : Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now()) # 更新时间，默认当前时间，更新时自动更新
    # 索引
    __table_args__ = (
        # 联合索引，查某文章的一级评论：article_id + parent_id
        Index("idx_comments_article_parent", "article_id", "parent_id"),
        # 单列索引，查某一评论的二级评论：parent_id
        Index("idx_comments_parent_id", "parent_id"),
        # 联合索引，查某用户的所有评论，包括一级评论和二级评论
        Index("idx_comments_user_id", "user_id"),
    )

# 文章评论点赞表
class ArticleCommentLike(Base):
    __tablename__ = "comment_likes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="点赞记录ID")
    # 关联用户ID
    user_id: Mapped[int] = mapped_column(nullable=False, comment="点赞用户ID")
    # 关联评论ID
    comment_id: Mapped[int] = mapped_column(nullable=False, comment="被点赞的评论ID")
    create_time: Mapped[datetime] = mapped_column(default=func.now(), comment="点赞时间")
    # 核心约束与索引
    __table_args__ = (
        # 唯一约束：一个用户只能给一个评论点一次赞（避免重复点赞）
        UniqueConstraint("user_id", "comment_id", name="uk_user_comment"),
        # 索引1：按评论ID查点赞记录（比如统计点赞数、查谁给这条评论点了赞）
        Index("idx_comment_id", "comment_id"),
        # 索引2：按用户ID查点赞过的评论（比如“我的点赞”功能）
        Index("idx_user_id", "user_id"),
    )

# 文章浏览量表
class ArticleView(Base):
    __tablename__ = "article_views"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="浏览记录ID")
    user_id: Mapped[int] = mapped_column(nullable=False, comment="浏览用户ID（匿名用户可填0）")
    article_id: Mapped[int] = mapped_column(nullable=False, comment="被浏览的文章ID")
    view_time: Mapped[datetime] = mapped_column(default=func.now(), comment="浏览时间")

    # 索引设计
    __table_args__ = (
        # 联合索引：按文章+用户查浏览记录（防同一用户短时间重复统计）
        Index("idx_article_user", "article_id", "user_id"),
        # 单列索引：按文章ID查所有浏览记录（统计文章浏览明细）
        Index("idx_article_views_article_id", "article_id"),
        # 单列索引：按用户ID查浏览过的文章（“我的浏览历史”功能）
        Index("idx_article_views_user_id", "user_id"),
        # 可选：按时间索引（统计某时段的浏览量）
        Index("idx_article_views_view_time", "view_time"),
    )
