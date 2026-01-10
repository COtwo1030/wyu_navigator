from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.crud.article import ArticleCRUD
from app.crud.auth import AuthCRUD
from app.crud.user import UserCRUD
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
    async def get_by_page(self, page: int = 1) -> list[dict]:
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
        id_to_user = {}
        if user_ids:
            for uid in user_ids:
                info = await UserCRUD(self.session).get_user_info(uid)
                if info:
                    id_to_user[uid] = info
        return [
            {
                "id": a.id,
                "username": getattr(id_to_user.get(a.user_id), "username", "") or "",
                "avatar": getattr(id_to_user.get(a.user_id), "avatar", "") or "",
                "gender": getattr(id_to_user.get(a.user_id), "gender", "") or "",
                "year": getattr(id_to_user.get(a.user_id), "year", "") or "",
                "tag": a.tag or "",
                "content": a.content,
                "img": a.img or "",
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
        if not await AuthCRUD(self.session).check_exists(user_id):
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
        id_to_user = {}
        if user_ids:
            for uid in user_ids:
                info = await UserCRUD(self.session).get_user_info(uid)
                if info:
                    id_to_user[uid] = info
        return [
            {
                "id": c.id,
                "username": getattr(id_to_user.get(c.user_id), "username", "") or "",
                "avatar": getattr(id_to_user.get(c.user_id), "avatar", "") or "",
                "parent_id": c.parent_id,
                "content": c.content,
                "create_time": c.create_time.strftime("%Y-%m-%d %H:%M"),
                "like_count": c.like_count,
            }
            for c in comments
        ]
    
    # 文章点赞/取消点赞
    async def like(self, article_id: int, user_id: int) -> dict:
        """
        文章点赞/取消点赞
        参数:
            article_id: 文章ID
            user_id: 从 token 解析出的用户ID
        返回:
            dict: {"liked": bool}
        """
        # 判断文章是否存在
        if not await ArticleCRUD(self.session).check_exists(article_id):
            raise ValueError("文章不存在")
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            raise ValueError("用户不存在")
        # 检查是否已点赞
        if await ArticleCRUD(self.session).check_like(article_id, user_id):
            await ArticleCRUD(self.session).decrement_like_count(article_id)
            await ArticleCRUD(self.session).delete_like_record(article_id, user_id)
            logger.info(f"用户 {user_id} 取消点赞文章 {article_id}")
            return {"liked": False}
        else:
            await ArticleCRUD(self.session).increment_like_count(article_id)
            await ArticleCRUD(self.session).record_like(article_id, user_id)
            logger.info(f"用户 {user_id} 点赞文章 {article_id}")
            return {"liked": True}
    
    # 文章评论点赞/取消点赞
    async def like_comment(self, comment_id: int, user_id: int) -> dict:
        """
        文章评论点赞/取消点赞
        参数:
            comment_id: 评论ID
            user_id: 从 token 解析出的用户ID
        返回:
            dict: {"liked": bool}
        """
        # 判断评论是否存在
        if not await ArticleCRUD(self.session).check_comment_exists(comment_id):
            raise ValueError("评论不存在")
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            raise ValueError("用户不存在")
        # 检查是否已点赞
        if await ArticleCRUD(self.session).check_comment_like(comment_id, user_id):
            await ArticleCRUD(self.session).decrement_comment_like_count(comment_id)
            await ArticleCRUD(self.session).delete_comment_like_record(comment_id, user_id)
            logger.info(f"用户 {user_id} 取消点赞评论 {comment_id}")
            return {"liked": False}
        else:
            await ArticleCRUD(self.session).increment_comment_like_count(comment_id)
            await ArticleCRUD(self.session).record_comment_like(comment_id, user_id)
            logger.info(f"用户 {user_id} 点赞评论 {comment_id}")
            return {"liked": True}

    # 查询用户点赞的文章id列表
    async def get_liked_articles(self, user_id: int) -> list[int]:
        """
        查询用户点赞的文章id列表
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表
        """
        articles = await ArticleCRUD(self.session).get_liked_articles(user_id)
        return articles

    # 查询用户点赞的评论
    async def get_liked_comments(self, user_id: int) -> list[ArticleComment]:
        """
        查询用户点赞的评论id列表
        参数:
            user_id: 用户ID
        返回:
            list[ArticleComment]: 评论列表
        """
        comments = await ArticleCRUD(self.session).get_liked_comments(user_id)
        return comments

    # 查询用户评论过的文章id列表
    async def get_commented_articles(self, user_id: int) -> list[int]:
        """
        查询用户评论过的文章id列表
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表
        """
        articles = await ArticleCRUD(self.session).get_commented_articles(user_id)
        return articles

    # 浏览量增加
    async def increase_view_count(self, article_id: int, user_id: int) -> dict:
        """
        浏览量增加
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            dict: {"view_count": int}
        """
        # 判断文章是否存在
        if not await ArticleCRUD(self.session).check_exists(article_id):
            raise ValueError("文章不存在")
        # 判断用户是否存在（匿名用户用0表示，跳过校验）
        if user_id != 0:
            if not await AuthCRUD(self.session).check_exists(user_id):
                raise ValueError("用户不存在")
        # 增加浏览量
        await ArticleCRUD(self.session).increment_view_count(article_id)
        # 记录浏览记录
        await ArticleCRUD(self.session).record_view(article_id, user_id)
        logger.info(f"用户 {user_id} 浏览文章 {article_id}")
    
    # 查询用户发表的文章
    async def get_by_user(self, user_id: int) -> list[dict]:
        """
        查询用户发表的文章
        参数:
            user_id: 用户ID
        返回:
            list[Article]: 文章列表
        """
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            raise ValueError("用户不存在")
        # 查询文章
        articles = await ArticleCRUD(self.session).get_by_user(user_id)
        # 统一返回结构，补充用户信息
        id_to_user = {}
        info = await UserCRUD(self.session).get_user_info(user_id)
        if info:
            id_to_user[user_id] = info
        logger.info(f"用户 {user_id} 查询发表的文章")
        return [
            {
                "id": a.id,
                "username": getattr(id_to_user.get(a.user_id), "username", "") or "",
                "avatar": getattr(id_to_user.get(a.user_id), "avatar", "") or "",
                "gender": getattr(id_to_user.get(a.user_id), "gender", "") or "",
                "year": getattr(id_to_user.get(a.user_id), "year", "") or "",
                "tag": a.tag or "",
                "content": a.content,
                "img": a.img or "",
                "create_time": a.create_time.strftime("%Y-%m-%d %H:%M"),
                "view_count": a.view_count,
                "like_count": a.like_count,
                "comment_count": a.comment_count
            }
            for a in articles
        ]
    
    # 批量根据ID获取文章（返回精简字段）
    async def get_articles_by_article_ids(self, ids: list[int]) -> list[dict]:
        if not ids:
            return []
        articles = await ArticleCRUD(self.session).get_by_ids(ids)
        return [
            {
                "id": a.id,
                "tag": a.tag or "",
                "content": a.content,
                "img": a.img or ""
            }
            for a in articles
        ]
    
    # 查询用户的评论
    async def get_comments_by_user_id(self, user_id: int) -> list[dict]:
        """
        查询用户的评论
        参数:
            user_id: 用户ID
        返回:
            list[dict]: 评论列表
        """
        comments = await ArticleCRUD(self.session).get_comments_by_user_id(user_id)
        return [
            {
                "id": c.id,
                "article_id": c.article_id,
                "parent_id": c.parent_id,
                "content": c.content,
                "create_time": c.create_time.strftime("%Y-%m-%d %H:%M")
            }
            for c in comments
        ]
