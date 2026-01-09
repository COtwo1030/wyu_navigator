from typing import Annotated

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
    gender: Annotated[str, Field(..., description="性别")]
    year: Annotated[str, Field(..., description="入学年份")]

