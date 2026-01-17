from sqlalchemy.orm import mapped_column, Mapped

from datetime import datetime
from sqlalchemy import DateTime, String, func, Index

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

# 互动消息中心表（汇总所有用户收到的互动）
class InteractiveMessage(Base):
    __tablename__ = "interactive_messages"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="消息ID")
    # 被通知人ID（比如：谁的文章/评论收到了互动）
    receiver_id: Mapped[int] = mapped_column(nullable=False, comment="消息接收用户ID")
    # 被通知者的文章/评论内容
    receiver_content: Mapped[str] = mapped_column(String(5000), nullable=False, comment="被通知者的文章/评论内容")
    # 被通知者的内容图片
    receiver_img: Mapped[str] = mapped_column(String(200), nullable=True, comment="被通知者的内容图片")
    # 互动发起者ID（比如：谁点的赞/谁评论的）
    sender_id: Mapped[int] = mapped_column(nullable=False, comment="互动发起用户ID")
    # 互动发起者用户名（冗余存储，避免联表查询）
    sender_username: Mapped[str] = mapped_column(String(20), nullable=False, comment="发起者用户名")
    # 互动发起者头像URL（冗余存储，避免联表查询）
    sender_avatar: Mapped[str] = mapped_column(String(200), nullable=False, comment="发起者头像URL")
    # 互动类型：1=文章被点赞 2=文章被评论 3=评论被点赞 4=评论被回复 5=回复被点赞
    interact_type: Mapped[int] = mapped_column(nullable=False, comment="互动类型：1-文章点赞 2-文章评论 3-评论点赞 4-评论回复 5-回复点赞")
    # 文章ID
    article_id: Mapped[int] = mapped_column(nullable=False, comment="关联文章ID")
    # 关联的业务ID（根据interact_type对应不同表）：
    # - 类型1点赞：关联article_id；类型2评论文章：关联comment_id；类型3点赞评论：关联comment_id；类型4回复：关联parent_id/comment_id（层级）
    relate_id: Mapped[str] = mapped_column(String(50), nullable=False, comment="关联业务ID：点赞-文章ID 评论文章-评论ID 点赞评论-评论ID 回复-评论ID/父评论ID")
    # 消息内容预览（冗余存储，避免联表）：
    # - 类型1："XXX给你的文章点赞了"；类型2："XXX评论了你的文章：XXX"；类型3："XXX给你的评论点赞了"；类型4："XXX回复了你的评论：XXX"
    sender_content: Mapped[str] = mapped_column(String(5000), nullable=False, comment="发起者互动内容预览")
    # 图片URL
    sender_img: Mapped[str] = mapped_column(String(200), nullable=True, comment="发起者互动图片URL")
    # 消息状态：0=未读 1=已读
    status: Mapped[int] = mapped_column(default=0, comment="消息状态：0-未读 1-已读")
    # 时间相关
    create_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now(), comment="消息创建时间")
    
    # 索引优化（核心）
    __table_args__ = (
        # 核心索引：按接收人+状态查互动（比如“我收到的所有未读互动”）
        Index("idx_receiver_status", "receiver_id", "status"),
        # 辅助索引：按接收人查互动（比如“我收到的所有互动”）
        Index("idx_receiver_time", "receiver_id", "create_time"),
    )