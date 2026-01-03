from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.article import Article

from app.schemas.article import ArticleData

# 文章CRUD
class ArticleCRUD:
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
        # 将文章数据转换为文章模型并写入关联的用户ID
        article_model = Article(**article.model_dump(), user_id=user_id)
        self.session.add(article_model)
        await self.session.commit()
        return article_model
