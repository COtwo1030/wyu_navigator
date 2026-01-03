from datetime import datetime

from pydantic import BaseModel
from typing import Annotated

# 文章请求体
class ArticleData(BaseModel):
    tag: Annotated[str, Field(min_length=3, max_length=20, description="文章标签")]
    content: Annotated[str, Field(min_length=3, max_length=500, description="文章内容")]
    img: Annotated[str, Field(description="文章图片")]
