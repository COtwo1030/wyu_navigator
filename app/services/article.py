from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.article import ArticleCRUD
from app.schemas.article import ArticleData

class ArticleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 创建文章
    async def create(self, article: ArticleData):
        """
        创建文章
        参数:
            article: 文章数据
        返回:
            文章模型
        """
        return await ArticleCRUD.create(self.session, article)
