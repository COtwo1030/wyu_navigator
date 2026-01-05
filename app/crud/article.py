from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.models.article import Article, ArticleLike, ArticleComment, ArticleCommentLike
from app.schemas.article import ArticleData, ArticleLikeData, ArticleCommentData

# 文章CRUD
class ArticleCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 创建文章（异常处理+刷新模型）
    async def create(self, article: ArticleData, user_id: int):
        """
        创建文章
        参数:
            article: 文章数据
            user_id: 发布用户ID
        返回:
            文章模型
        异常:
            数据库错误时回滚并抛出异常
        """
        try:
            article_model = Article(**article.model_dump(), user_id=user_id)
            self.session.add(article_model)
            await self.session.commit()
            await self.session.refresh(article_model)  # 刷新获取完整模型（含ID/创建时间）
            return article_model
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise e

    # 按时间顺序分页获取文章
    async def get_by_page(self, offset: int, limit: int):
        """
        按创建时间倒序分页查询
        参数:
            offset: 偏移量
            limit: 每页数量
        返回:
            文章模型列表
        """
        stmt = select(Article).order_by(Article.id.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # 查询文章是否存在
    async def check_exists(self, article_id: int) -> bool:
        """
        查询文章是否存在
        参数:
            article_id: 文章ID
        返回:
            bool: 是否存在
        """
        # 优化：用get方法更高效
        article = await self.session.get(Article, article_id)
        return article is not None

    # 查询用户是否点赞了文章
    async def check_like(self, data: ArticleLikeData) -> bool:
        """
        查询用户是否点赞了文章
        参数:
            data: 文章点赞数据
        返回:
            bool: 是否点赞了文章
        """
        stmt = select(ArticleLike).where(
            ArticleLike.article_id == data.article_id,
            ArticleLike.user_id == data.user_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    # 记录文章点赞记录（移除独立commit，交给上层控制事务）
    async def record_like(self, data: ArticleLikeData) -> ArticleLike:
        """
        记录文章点赞记录
        参数:
            data: 文章点赞数据
        返回:
            文章点赞模型
        """
        like = ArticleLike(**data.model_dump())
        self.session.add(like)
        # 移除独立commit，由点赞主逻辑统一提交，保证事务原子性
        return like
    
    # 删除文章点赞记录（配合取消点赞）
    async def delete_like_record(self, data: ArticleLikeData) -> bool:
        """
        删除文章点赞记录
        参数:
            data: 文章点赞数据
        返回:
            bool: 是否删除成功
        """
        like_record = await self.session.scalar(
            select(ArticleLike).where(
                ArticleLike.article_id == data.article_id,
                ArticleLike.user_id == data.user_id
            )
        )
        if like_record:
            await self.session.delete(like_record)
            return True
        return False

    # 文章点赞数增加（移除独立commit，适配事务）
    async def like(self, data: ArticleLikeData):
        """
        文章点赞数增加（仅更新，不单独commit，适配事务）
        参数:
            data: 文章点赞数据
        返回:
            文章模型 | None
        """
        article = await self.session.get(Article, data.article_id)
        if article:
            article.like_count += 1
            self.session.add(article)
        return article

    # 文章点赞数减少（移除独立commit+防负数）
    async def unlike(self, data: ArticleLikeData):
        """
        文章点赞数减少（仅更新，不单独commit，适配事务）
        参数:
            data: 文章点赞数据
        返回:
            文章模型 | None
        """
        article = await self.session.get(Article, data.article_id)
        if article:
            article.like_count = max(0, article.like_count - 1)  # 防止负数
            self.session.add(article)
        return article
    
    # 检查父评论是否存在
    async def check_parent_exists(self, parent_id: int) -> bool:
        """
        检查父评论是否存在
        参数:
            parent_id: 父评论ID
        返回:
            bool: 是否存在
        """
        return await self.session.get(ArticleComment, parent_id) is not None

    # 增加文章评论内容
    async def comment(self, data: ArticleCommentData, user_id: int) -> ArticleComment:
        """
        直接增加文章评论内容
        参数:
            data: 文章评论数据
            user_id: 评论用户ID
        返回:
            ArticleComment: 新增的评论模型
        """
        try:
            comment = ArticleComment(**data.model_dump(), user_id=user_id)
            self.session.add(comment)
            await self.session.commit()
            return comment
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise e
    
    # 按时间顺序获取文章评论
    async def get_comments(self, article_id: int, offset: int = 0, limit: int = 5) -> list[ArticleComment]:
        """
        按时间顺序获取文章评论
        参数:
            article_id: 文章ID
        返回:
            list[ArticleComment]: 评论列表
        """
        stmt = select(ArticleComment).where(
            ArticleComment.article_id == article_id
        ).order_by(ArticleComment.id).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    # 增加评论计数
    async def increment_comment_count(self, article_id: int):
        """
        增加文章评论计数
        参数:
            article_id: 文章ID
        返回:
            None
        """
        article = await self.session.get(Article, article_id)
        if article:
            article.comment_count += 1
            self.session.add(article)
