import datetime
from unittest import result
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.exc import SQLAlchemyError
from app.models.article import Article, ArticleLike, ArticleComment, ArticleCommentLike, ArticleView
from app.schemas.article import ArticleData, ArticleCommentData

# 文章CRUD
class ArticleCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 创建文章（异常处理+刷新模型）
    async def create(self, article: ArticleData, user_id: int, username: str, avatar: str, gender: str, year: str):
        """
        创建文章
        参数:
            article: 文章数据
            user_id: 发布用户ID
            user_name: 发布用户名
            user_avatar: 发布用户头像URL
            gender: 发布用户性别
            year: 发布用户年份
        返回:
            文章模型
        异常:
            数据库错误时回滚并抛出异常
        """
        try:
            article_model = Article(**article.model_dump(), user_id=user_id, username=username, avatar=avatar, gender=gender, year=year)
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
    # 按标签倒序分页获取最新的文章（一页十条）
    async def get_by_tag(self, tag: str, page: int = 1, page_size: int = 10) -> list[dict]:
        """
        按标签倒序分页查询文章（status为0）
        参数:
            tag: 标签
            page: 页码，默认第一页
            page_size: 每页数量，默认十条
        返回:
            list[dict]: 文章模型列表（字典形式）
        """
        result = await self.session.execute(
            select(Article)
            .filter(Article.status == 0, Article.tag == tag)
            .order_by(Article.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        articles = result.scalars().all()
        return [
            {
                "id": article.id,
                "user_id": article.user_id,
                "username": article.username,
                "avatar": article.avatar,
                "gender": article.gender,
                "year": article.year,
                "tag": article.tag,
                "content": article.content,
                "img": article.img,
                "view_count": article.view_count,
                "like_count": article.like_count,
                "comment_count": article.comment_count,
                "create_time": article.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for article in articles
        ]
    # 按时间顺序分页获取文章
    async def get_by_page(self, page: int, page_size: int) -> list[dict]:
        """
        按创建时间倒序分页查询文章（status为0）
        参数:
            page: 页码
            page_size: 每页数量
        返回:
            list[dict]: 文章模型列表（字典形式）
        """
        result = await self.session.execute(
            select(Article)
            .filter(Article.status == 0)
            .order_by(Article.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        articles = result.scalars().all()
        return [
            {
                "id": article.id,
                "user_id": article.user_id,
                "username": article.username,
                "avatar": article.avatar,
                "gender": article.gender,
                "year": article.year,
                "tag": article.tag,
                "content": article.content,
                "img": article.img,
                "view_count": article.view_count,
                "like_count": article.like_count,
                "comment_count": article.comment_count,
                "create_time": article.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for article in articles
        ]
    # 查询指定文章详情
    async def get_by_articleid(self, article_id: int) -> dict:
        """
        查询指定文章详情
        参数:
            article_id: 文章ID
        返回:
            dict: 文章详情
        """
        article = await self.session.get(Article, article_id)
        return {
            "id": article.id,
            "user_id": article.user_id,
            "username": article.username,
            "avatar": article.avatar,
            "gender": article.gender,
            "year": article.year,
            "tag": article.tag,
            "content": article.content,
            "img": article.img,
            "view_count": article.view_count,
            "like_count": article.like_count,
            "comment_count": article.comment_count,
            "create_time": article.create_time.strftime("%Y-%m-%d %H:%M"),
        }
    # 查询评论是否存在
    async def check_comment_exists(self, comment_id: int) -> bool:
        """
        查询评论是否存在（status为0）
        参数:
            comment_id: 评论ID
        返回:
            bool: 是否存在
        """
        comment = await self.session.get(ArticleComment, comment_id)
        return comment is not None and comment.status == 0
    # 删除评论
    async def delete_comment(self, comment_id: int, user_id: int) -> bool:
        """
        删除评论（评论status设置为1）
        参数:
            comment_id: 评论ID
            user_id: 发布用户ID
        返回:
            bool: 是否删除成功
        """
        try:
            # 检查评论是否存在
            comment = await self.session.get(ArticleComment, comment_id)
            if not comment:
                return False
            # 检查用户是否有权限删除
            if comment.user_id != user_id:
                return False
            # 删除评论
            comment.status = 1
            await self.session.commit()
            return True
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise e
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
    # 查询用户是否评论了文章
    async def check_comment(self, article_id: int, user_id: int) -> bool:
        """
        查询用户是否评论了文章
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            bool: 是否评论了文章
        """
        stmt = select(ArticleComment).where(
            ArticleComment.article_id == article_id,
            ArticleComment.user_id == user_id
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
        stmt = delete(ArticleLike).where(
            ArticleLike.article_id == article_id,
            ArticleLike.user_id == user_id
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return True
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
    # 增加文章评论数（仅更新，不单独commit，适配事务）
    async def increment_comment_count(self, article_id: int) -> bool:
        """
        增加文章评论数（仅更新，不单独commit，适配事务）
        参数:
            article_id: 文章ID
        返回:
            bool: 是否增加成功
        """
        article = await self.session.get(Article, article_id)
        if article:
            article.comment_count += 1
            self.session.add(article)
        return article is not None
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
    async def comment(self, article_id: int, data: ArticleCommentData, user_id: int, username: str, avatar: str) -> ArticleComment:
        """
        直接增加文章评论内容
        参数:
            article_id: 文章ID
            data: 文章评论数据
            user_id: 评论用户ID
            username: 评论用户昵称
            avatar: 评论用户头像
        返回:
            ArticleComment: 新增的评论模型
        """
        try:
            comment = ArticleComment(article_id=article_id, **data.model_dump(), user_id=user_id, username=username, avatar=avatar)
            self.session.add(comment)
            await self.session.commit()
            return comment
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise e
    # 按点赞量分页获取文章一级评论
    async def get_comments(self, article_id: int, page: int = 1, page_size: int = 5) -> list[dict]:
        """
        按点赞量分页获取文章一级评论（status为0）
        参数:
            article_id: 文章ID
        返回:
            list[dict]: 评论列表
        """
        stmt = (
            select(ArticleComment)
            .where(
                ArticleComment.article_id == article_id, 
                ArticleComment.parent_id == 0, 
                ArticleComment.status == 0)
            .order_by(ArticleComment.like_count.desc(), ArticleComment.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        comments = result.scalars().all()
        # 批量统计每条一级评论的二级评论数（核心：补充reply_count）
        reply_counts = {}
        if comments:
            # 提取所有一级评论的ID
            parent_ids = [c.id for c in comments]
            # 聚合查询：统计每个parent_id对应的二级评论数
            count_stmt = (
                select(
                    ArticleComment.parent_id, # 一级评论ID
                    func.count(ArticleComment.id).label("reply_count")  # 二级评论数
                )
                .where(
                    ArticleComment.parent_id.in_(parent_ids),  # 只统计当前页的一级评论
                    ArticleComment.status == 0  # 只统计正常状态的二级评论
                )
                .group_by(ArticleComment.parent_id) # 按一级评论ID分组
            )
            count_result = await self.session.execute(count_stmt)
            # 转换为 {parent_id: 回复数} 的字典
            reply_counts = {row.parent_id: row.reply_count for row in count_result.all()}
        # 组装返回数据（映射reply_count）
        return [
            {
                "id": c.id,
                "username": c.username,
                "avatar": c.avatar,
                "parent_id": c.parent_id,
                "content": c.content,
                "create_time": c.create_time.strftime("%Y-%m-%d %H:%M"),
                "like_count": c.like_count,
                "img": c.img or "",
                "reply_count": reply_counts.get(c.id, 0)  # 从统计结果中获取，无则为0
            }
            for c in comments
        ]
    # 按点赞量分页获取文章二级评论
    async def get_replies(self, parent_id: int, page: int = 1, page_size: int = 5) -> list[dict]:
        """
        按点赞量分页获取文章二级评论（status为0）
        参数:
            parent_id: 父评论ID
        返回:
            list[dict]: 评论列表
        """
        stmt = (
            select(ArticleComment)
            .where(
                ArticleComment.parent_id == parent_id, 
                ArticleComment.status == 0)
            .order_by(ArticleComment.like_count.desc(), ArticleComment.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        comments = result.scalars().all()
        return [
            {
                "id": c.id,
                "username": c.username,
                "avatar": c.avatar,
                "parent_id": c.parent_id,
                "content": c.content,
                "create_time": c.create_time.strftime("%Y-%m-%d %H:%M"),
                "like_count": c.like_count,
                "img": c.img or ""
            }
            for c in comments
        ]
    
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
    
    # 查询用户点赞的文章id列表（按时间倒序）
    async def get_liked_articles(self, user_id: int) -> list[int]:
        """
        查询用户点赞的文章id列表（按时间倒序）
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表（Article.id）
        """
        result = await self.session.execute(
            select(ArticleLike.article_id)
            .where(ArticleLike.user_id == user_id)
            .order_by(ArticleLike.create_time.desc())
        )
        return [row[0] for row in result.all()]
    
    # 查询用户点赞的评论（按时间倒序）
    async def get_liked_comments(self, user_id: int) -> list[int]:
        """
        查询用户点赞的评论id列表（按时间倒序）
        参数:
            user_id: 用户ID
        返回:
            list[int]: 评论id列表（Comment.id）
        """
        result = await self.session.execute(
            select(ArticleCommentLike.comment_id)
            .where(ArticleCommentLike.user_id == user_id)
            .order_by(ArticleCommentLike.create_time.desc())
        )
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
    async def get_by_user(self, user_id: int, page: int, page_size: int) -> list[dict]:
        """
        查询用户发表的文章（status为0）
        参数:
            user_id: 用户ID
            page: 页码
            page_size: 每页数量
        返回:
            list[dict]: 文章列表
        """
        # 查询文章
        result = await self.session.execute(
            select(Article).filter(Article.user_id == user_id, Article.status == 0)
            .order_by(Article.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        articles = result.scalars().all()
        return [
            {
                "id": article.id,
                "user_id": article.user_id,
                "username": article.username,
                "avatar": article.avatar,
                "gender": article.gender,
                "year": article.year,
                "tag": article.tag,
                "content": article.content,
                "img": article.img,
                "view_count": article.view_count,
                "like_count": article.like_count,
                "comment_count": article.comment_count,
                "create_time": article.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for article in articles
        ]

    # 批量根据ID查询文章
    async def get_by_ids(self, ids: list[int]) -> list[Article]:
        """
        批量根据ID查询文章（status为0）
        参数:
            ids: 文章ID列表
        返回:
            list[Article]: 文章列表
        """
        result = await self.session.execute(
            select(Article)
            .filter(Article.id.in_(ids), Article.status == 0)
            .order_by(Article.id.desc())
        )
        articles = result.scalars().all()
        return [
            {
                "id": article.id,
                "user_id": article.user_id,
                "username": article.username,
                "avatar": article.avatar,
                "gender": article.gender,
                "year": article.year,
                "tag": article.tag,
                "content": article.content,
                "img": article.img,
                "view_count": article.view_count,
                "like_count": article.like_count,
                "comment_count": article.comment_count,
                "create_time": article.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for article in articles
        ]

    # 查询用户的评论
    async def get_comments_by_user_id(self, user_id: int) -> list[dict]:
        """
        查询互动表获取用户的评论
        参数:
            user_id: 用户ID
        返回:
            list[dict]: 评论列表
        """
        stmt = (
            select(ArticleComment)
            .where(ArticleComment.user_id == user_id, ArticleComment.status == 0)
            .order_by(ArticleComment.id.desc())
        )
        result = await self.session.execute(stmt)
        comments = result.scalars().all()
        return [
            {
                "id": comment.id,
                "username": comment.username,
                "avatar": comment.avatar,
                "article_id": comment.article_id,
                "parent_id": comment.parent_id,
                "content": comment.content,
                "img": comment.img,
                "create_time": comment.create_time.strftime("%Y-%m-%d %H:%M"),
            }
            for comment in comments
        ]
    
    # 查询用户文章收到的评论：返回 comment_id、content、点赞数、评论时间（自上次查看以来）
    async def get_received_comments_since(self, author_user_id: int, last_seen: datetime) -> list[dict]:
        stmt = (
            select(ArticleComment.id, ArticleComment.content, func.count(ArticleCommentLike.id))
            .join(Article, ArticleComment.article_id == Article.id)
            .join(ArticleCommentLike, ArticleCommentLike.comment_id == ArticleComment.id, isouter=True)
            .where(Article.user_id == author_user_id, ArticleComment.status == 0, ArticleComment.create_time > last_seen)
            .group_by(ArticleComment.id, ArticleComment.content, ArticleComment.create_time)
            .order_by(ArticleComment.id.desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [{"id": r[0], "content": r[1], "count": r[2] or 0, "create_time": r[3]} for r in rows]

    # 收到的评论点赞按评论聚合：返回 comment_id、点赞数,点赞时间（自上次查看以来）
    async def get_received_comment_likes_since(self, author_user_id: int, last_seen: datetime) -> list[dict]:
        stmt = (
            select(ArticleCommentLike.comment_id, func.count(ArticleCommentLike.id))
            .join(ArticleComment, ArticleCommentLike.comment_id == ArticleComment.id)
            .join(Article, ArticleComment.article_id == Article.id)
            .where(Article.user_id == author_user_id, ArticleCommentLike.create_time > last_seen)
            .group_by(ArticleCommentLike.comment_id, ArticleCommentLike.create_time)
            .order_by(ArticleCommentLike.comment_id.desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [{"comment_id": r[0], "count": r[1] or 0, "create_time": r[2]} for r in rows]
    # 获取作者id
    async def get_user_id(self, article_id: int) -> int:
        """
        获取文章作者ID
        参数:
            article_id: 文章ID
        返回:
            int: 作者ID
        """
        result = await self.session.execute(
            select(Article.user_id).filter(Article.id == article_id)
        )
        return result.scalar_one_or_none()
    
    # 获取文章作者id、内容、图片
    async def get_userid_content_img_from_article(self, article_id: int) -> dict:
        """
        获取文章作者id、内容、图片
        参数:
            article_id: 文章ID
        返回:
            dict: 文章作者id、内容、图片URL
        """
        result = await self.session.execute(
            select(Article.user_id, Article.content, Article.img).filter(Article.id == article_id)
        )
        return result.mappings().one_or_none()
    # 获取评论者id、内容、图片
    async def get_userid_content_img_from_comment(self, comment_id: int) -> dict:
        """
        获取评论者id、内容、图片
        参数:
            comment_id: 评论ID
        返回:
            dict: 评论者id、内容、图片URL
        """
        result = await self.session.execute(
            select(ArticleComment.user_id, ArticleComment.content, ArticleComment.img).filter(ArticleComment.id == comment_id)
        )
        return result.mappings().one_or_none()