from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from datetime import datetime

from app.crud.user import UserCRUD
from app.crud.auth import AuthCRUD
from app.schemas.user import UserDetailData
from app.crud.article import ArticleCRUD

# 用户服务类
class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 上传/更新用户头像
    async def upload_avatar(self, user_id: int, avatar_url: str):
        """
        上传用户头像
        参数:
            user_id (int): 用户ID
            avatar_url (str): 头像URL
        返回:
            dict: 包含上传成功消息的字典
        """
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            logger.error(f"用户 {user_id} 不存在")
            raise HTTPException(status_code=400, detail="用户不存在")

        # 更新用户头像
        await UserCRUD(self.session).upload_avatar(user_id, avatar_url)
        logger.info(f"用户 {user_id} 上传头像: {avatar_url}")
        return {"message": "头像上传成功"}
    # 上传用户详情
    async def upload_user_detail(self, user_id: int, user_detail: UserDetailData):
        """
        上传用户详情
        参数:
            user_id (int): 用户ID
            user_detail (dict): 用户详情
        返回:
            dict: 包含上传成功消息的字典
        """
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            logger.error(f"用户 {user_id} 不存在")
            raise HTTPException(status_code=400, detail="用户不存在")

        # 更新用户详情
        await UserCRUD(self.session).upload_user_detail(user_id, user_detail)
        logger.info(f"用户 {user_id} 上传详情: {user_detail}")
        return {"message": "详情上传成功"}
    # 查询用户信息
    async def get_user_info(self, user_id: int):
        """
        查询用户信息
        参数:
            user_id (int): 用户ID
        返回:
            UserData: 用户信息
        """
        # 判断用户是否存在
        if not await AuthCRUD(self.session).check_exists(user_id):
            logger.error(f"用户 {user_id} 不存在")
            raise HTTPException(status_code=400, detail="用户不存在")

        # 查询用户信息
        user_info = await UserCRUD(self.session).get_user_info(user_id)
        logger.info(f"用户 {user_id} 查询信息: {user_info}")
        return user_info
    # 按页数查询用户互动记录
    async def get_user_interact(self, user_id: int, page: int, page_size: int):
        """
        按页数时间倒序查询用户互动记录
        参数:
            user_id (int): 用户ID
            page (int): 页码
            page_size (int): 每页数量
        返回:
            list[dict]: 用户互动记录列表
        """
        # 查询用户互动记录
        interacts = await UserCRUD(self.session).get_user_interact(user_id, page, page_size)
        logger.info(f"用户 {user_id} 查询互动记录: {interacts}")
        return interacts
    # 阅读互动记录
    async def read_user_interacts(self, user_id: int):
        """
        阅读用户互动记录
        参数:
            user_id (int): 用户ID
        返回:
            dict: 包含阅读成功消息的字典
        """
        # 阅读用户互动记录
        await UserCRUD(self.session).read_user_interact(user_id)
        logger.info(f"用户 {user_id} 阅读互动记录")
        return {"message": "互动记录阅读成功"}
    # 查询未读互动记录数量
    async def get_unread_interact_count(self, user_id: int):
        """
        查询用户未读互动记录数量
        参数:
            user_id (int): 用户ID
        返回:
            int: 未读互动记录数量
        """
        # 查询未读互动记录数量
        count = await UserCRUD(self.session).get_unread_interact_count(user_id)
        logger.info(f"用户 {user_id} 查询未读互动记录数量: {count}")
        return count