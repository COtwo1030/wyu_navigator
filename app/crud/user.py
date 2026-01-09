from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import UserDetail
from app.schemas.user import UserDetailData, UserData

# 用户CRUD
class UserCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # 初始化用户详情
    async def init_user_detail(self, user_detail: dict) -> bool:
        """
        初始化用户详情
        参数:
            user_detail (dict): 用户详情，包含user_id, avatar, create_time
        返回:
            bool: 是否初始化成功
        """
        await self.session.execute(
            UserDetail.__table__.insert().values(**user_detail)
        )
        await self.session.commit()
        return True
    

    # 上传/更新头像
    async def upload_avatar(self, user_id: int, avatar_url: str) -> bool:
        """
        上传用户头像
        参数:
            user_id (int): 用户ID
            avatar_url (str): 头像URL
        返回:
            bool: 是否上传成功
        """
        # 根据用户ID更新头像URL
        try:
            await self.session.execute(
                UserDetail.__table__.update()
                .where(UserDetail.user_id == user_id)
                .values(avatar=avatar_url)
            )
            await self.session.commit()
            return True
        except:
            await self.session.rollback()
            return False
    
    # 上传用户详情
    async def upload_user_detail(self, user_id: int, user_detail: UserDetailData) -> bool:
        """
        上传用户详情
        参数:
            user_id (int): 用户ID
            user_detail (UserDetailData): 用户详情
        返回:
            bool: 是否上传成功
        """
        # 根据用户ID更新用户详情
        try:
            await self.session.execute(
                UserDetail.__table__.update()
                .where(UserDetail.user_id == user_id)
                .values(**user_detail.dict())
            )
            await self.session.commit()
            return True
        except:
            await self.session.rollback()
            return False
    
    # 查询用户信息
    async def get_user_info(self, user_id: int) -> UserData:
        """
        查询用户信息
        参数:
            user_id (int): 用户ID
        返回:
            UserData: 用户信息
        """
        # 根据用户ID查询用户信息
        result = await self.session.execute(
            select(UserDetail)
            .where(UserDetail.user_id == user_id)
        )
        user_detail = result.scalars().first()
        if user_detail:
            return UserData.model_validate(user_detail)
        else:
            return None