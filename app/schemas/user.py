from typing import Annotated, Optional

from pydantic import BaseModel, Field, ConfigDict

# 用户请求体
class UserData(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: Annotated[int, Field(..., description="用户ID", alias="user_id")]
    username: Annotated[str, Field("", description="用户名")]
    gender: Annotated[str, Field("", description="性别")]
    year: Annotated[str, Field("", description="入学年份")]
    avatar: Annotated[str, Field("", description="头像URL")]

# 用户详情请求体
class UserDetailData(BaseModel):
    username: Annotated[str, Field(..., description="用户名")]
    gender: Annotated[str, Field(..., description="性别")]
    year: Annotated[str, Field(..., description="入学年份")]

# 互动消息数据
class InteractData(BaseModel):
    """
    互动消息数据
    """
    # 接收者ID
    receiver_id: Annotated[int, Field(description="接收者ID")]
    # 接收者内容
    receiver_content: Annotated[str, Field(min_length=1, max_length=5000, description="接收者内容")]
    # 接收者图片URL
    receiver_img: Annotated[Optional[str], Field(description="接收者图片URL")] = None
    # 发送者ID
    sender_id: Annotated[int, Field(description="发送者ID")]
    # 发送者用户名
    sender_username: Annotated[str, Field(min_length=1, max_length=20, description="发送者用户名")]
    # 发送者头像URL（冗余存储，避免联表查询）
    sender_avatar: Annotated[str, Field(min_length=1, max_length=200, description="发送者头像URL")]
    # 互动类型（文章点赞1/文章评论2/评论点赞3/评论回复4）
    interact_type: Annotated[int, Field(description="互动类型")]
    # 关联文章ID
    article_id: Annotated[int, Field(description="关联文章ID")]
    # 关联业务id
    relate_id: Annotated[str, Field(description="关联业务ID")]
    # 互动消息内容
    sender_content: Annotated[str, Field(min_length=0, max_length=5000, description="互动消息内容")]
    # 图片URL
    sender_img: Annotated[Optional[str], Field(description="互动消息图片")] = None
