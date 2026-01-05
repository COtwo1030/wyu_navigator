from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.article import ArticleData, ArticleCommentData
from app.services.article import ArticleService
from app.dependencies import get_session, get_current_user_id

router = APIRouter(prefix="/article",tags=["article"])

# 创建文章
@router.post("/create", status_code=200,description="创建文章")
async def create_article(
    data: ArticleData,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id), # token不放参数更安全
):
    return await ArticleService(session).create(data, user_id)

# 按时间顺序分页获取最新的文章（一页十条）
@router.get("/page", status_code=200,description="按时间顺序分页获取最新的文章（一页十条）")
async def get_articles_by_page(
    page: int = 1,
    session: AsyncSession = Depends(get_session),
):
    return await ArticleService(session).get_by_page(page)

# 文章评论
@router.post("/comment", status_code=200,description="文章评论")
async def comment_article(
    data: ArticleCommentData,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id), # token不放参数更安全
):
    return await ArticleService(session).comment(data, user_id)

# 按时间顺序获取文章评论
@router.get("/comments", status_code=200,description="按时间顺序获取文章评论（一页5条）")
async def get_article_comments(
    article_id: int,
    page: int = 1,
    session: AsyncSession = Depends(get_session),
):
    return await ArticleService(session).get_comments(article_id, page)
