from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.models.article import Article, ArticleLike, ArticleComment, ArticleCommentLike, ArticleView
from app.schemas.article import ArticleData, ArticleCommentData

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
    # 删除文章
    async def delete(self, article_id: int, user_id: int) -> bool:
        """
        删除文章（文章status设置为1）
        参数:
            article_id: 文章ID
            user_id: 发布用户ID
        返回:
            bool: 是否删除成功
        """
        try:
            # 检查文章是否存在
            article = await self.session.get(Article, article_id)
            if not article:
                return False
            # 检查用户是否有权限删除
            if article.user_id != user_id:
                return False
            # 删除文章
            article.status = 1
            await self.session.commit()
            return True
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise e

    # 按时间顺序分页获取文章
    async def get_by_page(self, offset: int, limit: int):
        """
        按创建时间倒序分页查询文章（status为0）
        参数:
            offset: 偏移量
            limit: 每页数量
        返回:
            文章模型列表
        """
        stmt = select(Article).filter(Article.status == 0).order_by(Article.id.desc()).offset(offset).limit(limit)
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
    
    # 查询评论是否存在
    async def check_comment_exists(self, comment_id: int) -> bool:
        """
        查询评论是否存在
        参数:
            comment_id: 评论ID
        返回:
            bool: 是否存在
        """
        comment = await self.session.get(ArticleComment, comment_id)
        return comment is not None

    # 查询用户是否点赞了文章
    async def check_like(self, article_id: int, user_id: int) -> bool:
        """
        查询用户是否点赞了文章
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            bool: 是否点赞了文章
        """
        stmt = select(ArticleLike).where(
            ArticleLike.article_id == article_id,
            ArticleLike.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None
    
    # 查询用户是否点赞了评论
    async def check_comment_like(self, comment_id: int, user_id: int) -> bool:
        """
        查询用户是否点赞了评论
        参数:
            comment_id: 评论ID
            user_id: 用户ID
        返回:
            bool: 是否点赞了评论
        """
        stmt = select(ArticleCommentLike).where(
            ArticleCommentLike.comment_id == comment_id,
            ArticleCommentLike.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    # 记录文章点赞记录（移除独立commit，交给上层控制事务）
    async def record_like(self, article_id: int, user_id: int) -> ArticleLike:
        """
        记录文章点赞记录
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            文章点赞模型
        """
        like = ArticleLike(article_id=article_id, user_id=user_id)
        self.session.add(like)
        await self.session.commit()
        return like
    
    # 删除文章点赞记录（配合取消点赞）
    async def delete_like_record(self, article_id: int, user_id: int) -> bool:
        """
        删除文章点赞记录
        参数:
            data: 文章点赞数据
        返回:
            bool: 是否删除成功
        """
        like_record = await self.session.scalar(
            select(ArticleLike).where(
                ArticleLike.article_id == article_id,
                ArticleLike.user_id == user_id
            )
        )
        if like_record:
            await self.session.delete(like_record)
            await self.session.commit()
            return True
        return False

    # 文章点赞数增加（移除独立commit，适配事务）
    async def increment_like_count(self, article_id: int):
        """
        文章点赞数增加（仅更新，不单独commit，适配事务）
        参数:
            data: 文章点赞数据
        返回:
            文章模型 | None
        """
        article = await self.session.get(Article, article_id)
        if article:
            article.like_count += 1
            self.session.add(article)
        return article

    # 文章点赞数减少（移除独立commit+防负数）
    async def decrement_like_count(self, article_id: int):
        """
        文章点赞数减少（仅更新，不单独commit，适配事务）
        参数:
            data: 文章点赞数据
        返回:
            文章模型 | None
        """
        article = await self.session.get(Article, article_id)
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
    
    # 增加评论点赞计数
    async def increment_comment_like_count(self, comment_id: int):
        """
        增加评论点赞计数
        参数:
            comment_id: 评论ID
        返回:
            None
        """
        comment = await self.session.get(ArticleComment, comment_id)
        if comment:
            comment.like_count += 1
            self.session.add(comment)
    
    # 减少评论点赞计数
    async def decrement_comment_like_count(self, comment_id: int):
        """
        减少评论点赞计数
        参数:
            comment_id: 评论ID
        返回:
            None
        """
        comment = await self.session.get(ArticleComment, comment_id)
        if comment:
            comment.like_count = max(0, comment.like_count - 1)  # 防止负数
            self.session.add(comment)

    # 记录评论点赞
    async def record_comment_like(self, comment_id: int, user_id: int):
        """
        记录评论点赞
        参数:
            comment_id: 评论ID
            user_id: 用户ID
        返回:
            None
        """
        like_record = ArticleCommentLike(comment_id=comment_id, user_id=user_id)
        self.session.add(like_record)
        await self.session.commit()
    
    # 删除评论点赞记录
    async def delete_comment_like_record(self, comment_id: int, user_id: int):
        """
        删除评论点赞记录
        参数:
            comment_id: 评论ID
            user_id: 用户ID
        返回:
            None
        """
        like_record = await self.session.scalar(
            select(ArticleCommentLike).where(
                ArticleCommentLike.comment_id == comment_id,
                ArticleCommentLike.user_id == user_id
            )
        )
        if like_record:
            await self.session.delete(like_record)
            await self.session.commit()
    
    # 查询用户点赞的文章id列表
    async def get_liked_articles(self, user_id: int) -> list[int]:
        """
        查询用户点赞的文章id列表
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表（Article.id）
        """
        stmt = select(ArticleLike.article_id).where(ArticleLike.user_id == user_id)
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
    
    # 查询用户点赞的评论
    async def get_liked_comments(self, user_id: int) -> list[int]:
        """
        查询用户点赞的评论id列表
        参数:
            user_id: 用户ID
        返回:
            list[int]: 评论id列表（Comment.id）
        """
        stmt = select(ArticleCommentLike.comment_id).where(ArticleCommentLike.user_id == user_id)
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
    
    # 查询用户评论过的文章id列表
    async def get_commented_articles(self, user_id: int) -> list[int]:
        """
        查询用户评论过的文章id列表（status为0）
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表（Article.id）
        """
        # 先查该用户评论过的文章id（去重）
        sub_stmt = select(ArticleComment.article_id).where(ArticleComment.user_id == user_id).distinct()
        sub_result = await self.session.execute(sub_stmt)
        commented_ids = [row[0] for row in sub_result.all()]
        if not commented_ids:
            return []
        # 再过滤掉已删除的文章（status==0）
        stmt = select(Article.id).where(Article.id.in_(commented_ids), Article.status == 0)
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
    
    # 增加文章浏览量
    async def increment_view_count(self, article_id: int):
        """
        增加文章浏览量
        参数:
            article_id: 文章ID
        返回:
            None
        """
        article = await self.session.get(Article, article_id)
        if article:
            article.view_count += 1
            self.session.add(article)
    
    # 记录文章浏览
    async def record_view(self, article_id: int, user_id: int):
        """
        记录文章浏览
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            None
        """
        view_record = ArticleView(article_id=article_id, user_id=user_id)
        self.session.add(view_record)
        await self.session.commit()
    
    # 查询用户发表的文章
    async def get_by_user(self, user_id: int) -> list[Article]:
        """
        查询用户发表的文章（status为0）
        参数:
            user_id: 用户ID
        返回:
            list[Article]: 文章列表
        """
        # 查询文章
        result = await self.session.execute(
            select(Article).filter(Article.user_id == user_id, Article.status == 0)
        )
        return result.scalars().all()

    # 批量根据ID查询文章
    async def get_by_ids(self, ids: list[int]) -> list[Article]:
        """
        批量根据ID查询文章（status为0）
        参数:
            ids: 文章ID列表
        返回:
            list[Article]: 文章列表
        """
        if not ids:
            return []
        stmt = select(Article).where(Article.id.in_(ids), Article.status == 0).order_by(Article.id.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # 查询用户的评论
    async def get_comments_by_user_id(self, user_id: int) -> list[ArticleComment]:
        """
        查询用户的评论
        参数:
            user_id: 用户ID
        返回:
            list[ArticleComment]: 评论列表
        """
        stmt = select(ArticleComment).where(ArticleComment.user_id == user_id).order_by(ArticleComment.id.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
