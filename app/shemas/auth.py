from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Annotated

# 注册请求体
class RegisterData(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=20, description="用户名")]
    password: Annotated[str, Field(min_length=6, max_length=20, description="密码")]
    confirm_password: Annotated[str, Field(min_length=6, max_length=20, description="确认密码")]
    email: Annotated[EmailStr, Field(description="邮箱")]

    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("两次密码输入不一致")
        return self
