from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Annotated

# 注册请求体
class RegisterData(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=20, description="用户名")]
    password: Annotated[str, Field(min_length=6, max_length=20, description="密码")]
    confirm_password: Annotated[str, Field(min_length=6, max_length=20, description="确认密码")]
    email: Annotated[EmailStr, Field(description="邮箱")]
    code: Annotated[str, Field(min_length=4, max_length=4, description="邮箱验证码")]

    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("两次密码输入不一致")
        return self

# 登录请求体
class LoginData(BaseModel):
    email: Annotated[EmailStr, Field(description="邮箱")]
    password: Annotated[str, Field(min_length=6, max_length=20, description="密码")]

# 重置密码请求体
class ResetPasswordData(BaseModel):
    password: Annotated[str, Field(min_length=6, max_length=20, description="密码")]
    confirm_password: Annotated[str, Field(min_length=6, max_length=20, description="确认密码")]
    email: Annotated[EmailStr, Field(description="邮箱")]
    code: Annotated[str, Field(min_length=4, max_length=4, description="邮箱验证码")]

    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("两次密码输入不一致")
        return self
