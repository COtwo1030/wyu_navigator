from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.article import ArticleData
from app.services.article import ArticleService
from app.dependencies import get_session

router = APIRouter(prefix="/article",tags=["article"])

# 创建文章
@router.post("/create", status_code=200,description="创建文章")
async def create_article(data: ArticleData, session: AsyncSession = Depends(get_session)):
    return await ArticleService(session).create(data)
