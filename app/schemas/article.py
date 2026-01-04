from datetime import datetime

from pydantic import BaseModel, Field
from typing import Annotated, Optional

# 文章请求体
class ArticleData(BaseModel):
    tag: Annotated[Optional[str], Field(min_length=1, max_length=20, description="文章标签")] = None
    content: Annotated[str, Field(min_length=1, max_length=500, description="文章内容")]
    img: Annotated[Optional[str], Field(description="文章图片")] = None
