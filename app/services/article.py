from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.crud.article import ArticleCRUD
from app.schemas.article import ArticleData

class ArticleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 创建文章
    async def create(self, article: ArticleData, user_id: int):
        """
        创建文章
        参数:
            article: 文章数据
        返回:
            文章模型
        """
        logger.info(f"用户 {user_id} 创建文章: {article}")
        return await ArticleCRUD(self.session).create(article, user_id)
