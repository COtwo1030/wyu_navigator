from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.crud.article import ArticleCRUD
from app.crud.auth import AuthCRUD
from app.crud.user import UserCRUD
from app.schemas.article import ArticleData, ArticleCommentData
from app.schemas.user import InteractData
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
        # 获取用户详情
        user = await UserCRUD(self.session).get_user_info(user_id)
        username = user.username
        avatar = user.avatar
        gender = user.gender
        year = user.year
        return await ArticleCRUD(self.session).create(article, user_id, username, avatar, gender, year)
    # 删除文章
    async def delete(self, article_id: int, user_id: int) -> bool:
        """
        删除文章
        参数:
            article_id: 文章ID
            user_id: 从 token 解析出的用户ID
        返回:
            bool: 是否删除成功
        """
        logger.info(f"用户 {user_id} 删除文章 {article_id}")
        return await ArticleCRUD(self.session).delete(article_id, user_id)
    # 按标签倒序分页获取最新的文章（一页十条）
    async def get_by_tag(self, tag: str, page: int = 1, page_size: int = 10) -> list[dict]:
        """
        业务层：按标签倒序分页获取最新的文章（一页十条）
        参数:
            tag: 标签
            page: 页码，默认第一页
            page_size: 每页数量，默认十条
        返回:
            list[dict] 
        """
        articles = await ArticleCRUD(self.session).get_by_tag(tag, page, page_size)
        logger.info(f"按标签 {tag} 获取第 {page} 页，每页 {page_size} 条文章: {articles}")
        return articles
    
    # 按时间倒序分页获取最新的文章（一页十条）
    async def get_by_page(self, page: int = 1, page_size: int = 10) -> list[dict]:
        """
        业务层：计算分页参数，查询文章并补充用户名，返回列表
        参数:
            page: 页码，默认第一页
            page_size: 每页数量，默认十条
        返回:
            list[dict] 
        """
        articles = await ArticleCRUD(self.session).get_by_page(page, page_size)
        logger.info(f"获取第 {page} 页，每页 {page_size} 条文章: {articles}")
        return articles
    # 查询指定文章详情
    async def get_by_articleid(self, article_id: int) -> dict:
        """
        查询指定文章详情
        参数:
            article_id: 文章ID
        返回:
            dict: 文章详情
        """
        logger.info(f"查询文章 {article_id} 详情")
        return await ArticleCRUD(self.session).get_by_articleid(article_id)
    # 增加文章评论
    async def comment(self, article_id: int, data: ArticleCommentData, user_id: int) -> ArticleComment:
        """
        增加文章评论内容
        参数:
            article_id: 文章ID
            data: 文章评论数据
            user_id: 从 token 解析出的用户ID
        返回:
            ArticleComment: 评论模型
        """
        # 增加评论计数
        success = await ArticleCRUD(self.session).increment_comment_count(article_id)
        if not success:
            logger.warning(f"增加文章 {article_id} 评论计数失败")
        # 生成互动消息
        # 获取文章作者id，内容，图片
        article = await ArticleCRUD(self.session).get_userid_content_img_from_article(article_id)
        article_user_id = article["user_id"]
        article_content = article["content"]
        article_img = (article.get("img") or "").split(',')[0]  # 安全获取第一张图片，允许 img 为空
        # 获取评论用户的昵称，头像
        comment_user = await UserCRUD(self.session).get_user_username_avatar(user_id)
        comment_user_username = comment_user["username"]
        comment_user_avatar = comment_user["avatar"]
        # 互动类型（文章评论2/评论回复4）
        interact_type = 2 if data.parent_id == 0 else 4
        # 关联业务id
        relate_id = article_id if data.parent_id == 0 else data.parent_id
        # 互动消息内容
        content = data.content
        # 图片URL（只获取评论时的第一张图片）
        sender_img = data.img.split(',')[0] if data.img else ""
        # 互动消息数据
        interact_data = InteractData(
            receiver_id=article_user_id,
            receiver_content=article_content,
            receiver_img=article_img,
            sender_id=user_id,
            sender_username=comment_user_username,
            sender_avatar=comment_user_avatar,
            interact_type=interact_type,
            relate_id=relate_id,
            sender_content=content,
            sender_img=sender_img
        )
        print(interact_data)
        # 增加互动消息
        success = await UserCRUD(self.session).create_interact(interact_data)
        if not success:
            logger.warning("创建互动消息失败，但继续创建评论")
        # 增加评论
        # 获取评论用户的昵称，头像
        comment_user = await UserCRUD(self.session).get_user_username_avatar(user_id)
        comment_user_username = comment_user["username"]
        comment_user_avatar = comment_user["avatar"]
        logger.info(f"用户 {user_id} 评论文章 {article_id}，父评论ID {data.parent_id}，内容 {data.content}")
        return await ArticleCRUD(self.session).comment(article_id, data, user_id, comment_user_username, comment_user_avatar)
    # 删除文章评论
    async def delete_comment(self, comment_id: int, user_id: int) -> bool:
        """
        删除文章评论
        参数:
            comment_id: 评论ID
            user_id: 从 token 解析出的用户ID
        返回:
            bool: 是否删除成功
        """
        # 判断评论是否存在
        if not await ArticleCRUD(self.session).check_comment_exists(comment_id):
            raise ValueError("评论不存在")
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            raise ValueError("用户不存在")
        # 删除评论（status=0）
        return await ArticleCRUD(self.session).delete_comment(comment_id, user_id)
    # 按点赞量分页获取文章一级评论
    async def get_comments(self, article_id: int, page: int = 1, page_size: int = 10) -> list[ArticleComment]:
        """
        按点赞量分页获取文章一级评论
        参数:
            article_id: 文章ID
        返回:
            list[ArticleComment]: 评论列表
        """
        comments = await ArticleCRUD(self.session).get_comments(article_id, page, page_size)
        logger.info(f"获取文章 {article_id} 第 {page} 页一级评论")
        return comments
    # 按点赞量分页获取文章二级评论
    async def get_replies(self, parent_id: int, page: int = 1, page_size: int = 5) -> list[ArticleComment]:
        """
        按点赞量分页获取文章二级评论
        参数:
            parent_id: 父评论ID
        返回:
            list[ArticleComment]: 评论列表
        """
        comments = await ArticleCRUD(self.session).get_replies(parent_id, page, page_size)
        logger.info(f"获取文章 {parent_id} 第 {page} 页二级评论")
        return comments
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
            # 生成互动消息
            # 获取文章作者id，内容，图片
            article = await ArticleCRUD(self.session).get_userid_content_img_from_article(article_id)
            article_user_id = article["user_id"]
            article_content = article["content"]
            article_img = (article.get("img") or "").split(',')[0]  # 安全获取第一张图片，允许 img 为空
            # 获取评论用户的昵称，头像
            comment_user = await UserCRUD(self.session).get_user_username_avatar(user_id)
            comment_user_username = comment_user["username"]
            comment_user_avatar = comment_user["avatar"]
            # 互动类型（文章点赞1）
            interact_type = 1
            # 关联业务id
            relate_id = article_id
            # 互动消息内容
            sender_content = "点赞了你的文章"
            await UserCRUD(self.session).create_interact(InteractData(
                receiver_id=article_user_id,
                receiver_content=article_content,
                receiver_img=article_img,
                sender_id=user_id,
                sender_username=comment_user_username,
                sender_avatar=comment_user_avatar,
                interact_type=interact_type,
                relate_id=relate_id,
                sender_content=sender_content
            ))
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
            # 生成互动消息
            # 获取评论者id，内容，图片
            comment = await ArticleCRUD(self.session).get_userid_content_img_from_comment(comment_id)
            comment_user_id = comment["user_id"]
            comment_content = comment["content"]
            comment_img = comment["img"]
            # 获取点赞用户的昵称，头像
            comment_user = await UserCRUD(self.session).get_user_username_avatar(user_id)
            comment_user_username = comment_user["username"]
            comment_user_avatar = comment_user["avatar"]
            # 互动类型（评论点赞3）
            interact_type = 3
            # 关联业务id
            relate_id = comment_id
            # 互动消息内容
            sender_content = "点赞了你的评论"
            await UserCRUD(self.session).create_interact(InteractData(
                receiver_id=comment_user_id,
                receiver_content=comment_content,
                receiver_img=comment_img,
                sender_id=user_id,
                sender_username=comment_user_username,
                sender_avatar=comment_user_avatar,
                interact_type=interact_type,
                relate_id=relate_id,
                sender_content=sender_content
            ))
            return {"liked": True}
    # 查询用户是否点赞过文章
    async def check_like(self, article_id: int, user_id: int) -> bool:
        """
        查询用户是否点赞过文章
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            bool: 是否点赞过
        """
        return await ArticleCRUD(self.session).check_like(article_id, user_id)
    # 查询用户点赞的文章id列表（按时间倒序）
    async def get_liked_articles(self, user_id: int) -> list[int]:
        """
        查询用户点赞的文章id列表（按时间倒序）
        参数:
            user_id: 用户ID
        返回:
            list[int]: 文章id列表
        """
        articles = await ArticleCRUD(self.session).get_liked_articles(user_id)
        logger.info(f"用户 {user_id} 点赞的文章id列表（按时间倒序）：{articles}")
        return articles
    # 查询用户点赞的评论（按时间倒序）
    async def get_liked_comments(self, user_id: int) -> list[ArticleComment]:
        """
        查询用户点赞的评论id列表（按时间倒序）
        参数:
            user_id: 用户ID
        返回:
            list[ArticleComment]: 评论列表
        """
        comments = await ArticleCRUD(self.session).get_liked_comments(user_id)
        logger.info(f"用户 {user_id} 点赞的评论（按时间倒序）：{comments}")
        return comments
    # 查询用户是否评论过文章
    async def check_comment(self, article_id: int, user_id: int) -> bool:
        """
        查询用户是否评论过文章
        参数:
            article_id: 文章ID
            user_id: 用户ID
        返回:
            bool: 是否评论过
        """
        return await ArticleCRUD(self.session).check_comment(article_id, user_id)
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
    async def get_by_user(self, user_id: int, page: int, page_size: int) -> list[dict]:
        """
        查询用户发表的文章
        参数:
            user_id: 用户ID
        返回:
            list[dict]
        """
        # 查询文章
        articles = await ArticleCRUD(self.session).get_by_user(user_id, page, page_size)
        logger.info(f"用户 {user_id} 查询发表的文章，页码 {page}")
        return articles
    
    # 批量根据ID获取文章（返回精简字段）
    async def get_articles_by_article_ids(self, page: int, page_size: int, ids: list[int]) -> list[dict]:
        """
        批量根据ID获取文章
        参数:
            page: 页码
            page_size: 每页数量
            ids: 文章ID列表
        返回:
            list[dict]
        """
        # 分页处理
        ids = ids[(page-1)*page_size:page*page_size]
        articles = await ArticleCRUD(self.session).get_by_ids(ids)
        return articles
    
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
        logger.info(f"用户 {user_id} 查询发表的评论")
        return comments
