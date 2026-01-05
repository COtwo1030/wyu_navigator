from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.crud.article import ArticleCRUD
from app.crud.auth import UserCRUD
from app.schemas.article import ArticleData, ArticleCommentData
from app.models.auth import User
from app.models.article import ArticleComment

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
                "create_time": a.create_time.strftime("%Y-%m-%d %H:%M"),
                "view_count": a.view_count,
                "like_count": a.like_count,
                "comment_count": a.comment_count
            }
            for a in articles
        ]
    
    # 增加文章评论
    async def comment(self, data: ArticleCommentData, user_id: int) -> ArticleComment:
        """
        增加文章评论内容
        参数:
            data: 文章评论数据
            user_id: 从 token 解析出的用户ID
        返回:
            ArticleComment: 评论模型
        """
        # 判断文章是否存在
        if not await ArticleCRUD(self.session).check_exists(data.article_id):
            raise ValueError("文章不存在")
        # 判断用户是否存在
        if not await UserCRUD(self.session).check_exists(user_id):
            raise ValueError("用户不存在")
        # 判断父评论是否存在（如果不是一级评论）
        if data.parent_id != 0 and not await ArticleCRUD(self.session).check_parent_exists(data.parent_id):
            raise ValueError("父评论不存在")
        # 增加评论计数
        await ArticleCRUD(self.session).increment_comment_count(data.article_id)
        # 增加评论
        logger.info(f"用户 {user_id} 评论文章 {data.article_id}，父评论ID {data.parent_id}，内容 {data.content}")
        return await ArticleCRUD(self.session).comment(data, user_id)
    
    # 按时间顺序获取文章评论
    async def get_comments(self, article_id: int, page: int = 1) -> list[ArticleComment]:
        """
        按时间顺序获取文章评论
        参数:
            article_id: 文章ID
        返回:
            list[ArticleComment]: 评论列表
        """
        page_size = 5
        offset = max(page - 1, 0) * page_size
        comments = await ArticleCRUD(self.session).get_comments(article_id, offset, page_size)
        user_ids = list({c.user_id for c in comments})
        id_to_name = {}
        if user_ids:
            res = await self.session.execute(select(User.id, User.username).where(User.id.in_(user_ids)))
            id_to_name = {row[0]: row[1] for row in res.all()}
        return [
            {
                "id": c.id,
                "username": id_to_name.get(c.user_id, ""),
                "parent_id": c.parent_id,
                "content": c.content,
                "create_time": c.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for c in comments
        ]
