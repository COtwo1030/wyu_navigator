from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.crud.article import ArticleCRUD
from app.schemas.article import ArticleData
from app.models.auth import User

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
    # 按时间顺序分页获取最新的文章（一页十条）
    async def get_by_page(self, page: int = 1):
        """
        业务层：计算分页参数，查询文章并补充用户名，返回列表
        参数:
            page: 页码，默认第一页
        返回:
            list[dict]
        """
        page_size = 5
        offset = max(page - 1, 0) * page_size
        logger.info(f"获取第 {page} 页最新的文章，offset={offset}, limit={page_size}")
        articles = await ArticleCRUD(self.session).get_by_page(offset, page_size)
        user_ids = list({a.user_id for a in articles})
        id_to_name = {}
        if user_ids:
            res = await self.session.execute(select(User.id, User.username).where(User.id.in_(user_ids)))
            id_to_name = {row[0]: row[1] for row in res.all()}
        return [
            {
                "id": a.id,
                "username": id_to_name.get(a.user_id, ""),
                "tag": a.tag or "",
                "content": a.content,
                "create_time": a.create_time.strftime("%Y-%m-%d %H:%M")
            }
            for a in articles
        ]
