from datetime import datetime

from pydantic import BaseModel, Field
from typing import Annotated, Optional

# 文章请求体
class ArticleData(BaseModel):
    tag: Annotated[Optional[str], Field(min_length=1, max_length=20, description="文章标签")] = None
    content: Annotated[str, Field(min_length=1, max_length=500, description="文章内容")]
    img: Annotated[Optional[str], Field(description="文章图片")] = None

# 文章评论请求体
class ArticleCommentData(BaseModel):
    """
    一级评论：parent_id 传 0
    二级评论：parent_id 传对应一级评论的ID
    """
    article_id: Annotated[int, Field(description="文章ID")]
    parent_id: Annotated[Optional[int], Field(description="父评论ID")] = 0
    content: Annotated[str, Field(min_length=1, max_length=200, description="评论内容")]
