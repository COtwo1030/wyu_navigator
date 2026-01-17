from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import UserDetail, InteractiveMessage
from app.schemas.user import UserDetailData, UserData, InteractData, InteractData

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
                .values(**user_detail.model_dump())
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
    # 查询用户id，昵称和头像
    async def get_user_username_avatar(self, user_id: int) -> dict:
        """
        根据用户ID查询用户名和头像
        参数:
            user_id (int): 用户ID
        返回:
            dict | None: {"username": str, "avatar": str}
        """
        result = await self.session.execute(
            select(UserDetail.username, UserDetail.avatar).where(UserDetail.user_id == user_id)
        )
        row = result.first()
        return {"username": row[0] or "", "avatar": row[1] or ""}
    # 创建互动消息
    async def create_interact(self, data: InteractData) -> bool:
        """
        创建互动消息
        参数:
            interact_data (InteractData): 互动消息数据
        返回:
            bool: 是否创建成功
        """
        try:
            msg = InteractiveMessage(
                receiver_id=data.receiver_id,
                receiver_content=data.receiver_content,
                receiver_img=data.receiver_img,
                sender_id=data.sender_id,
                sender_username=data.sender_username,
                sender_avatar=data.sender_avatar,
                interact_type=data.interact_type,
                article_id=data.article_id,
                relate_id=data.relate_id,
                sender_content=data.sender_content,
                sender_img=data.sender_img
            )
            self.session.add(msg)
            await self.session.commit()
            return True
        except Exception as e:
            await self.session.rollback()
            return False
    # 查询用户互动记录
    async def get_user_interact(self, user_id: int, page: int, page_size: int) -> list[dict]:
        """
        按页数时间倒序查询用户互动记录
        参数:
            user_id (int): 用户ID
            page (int): 页码
            page_size (int): 每页数量
        返回:
            list[dict]: 互动记录列表
        """
        result = await self.session.execute(
            select(InteractiveMessage)
            .where(InteractiveMessage.receiver_id == user_id)
            .order_by(InteractiveMessage.create_time.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        records = result.scalars().all()
        return [
            {
                "sender_username": r.sender_username,
                "sender_avatar": r.sender_avatar,
                "sender_content": r.sender_content,
                "sender_img": r.sender_img,
                "receiver_content": r.receiver_content,
                "receiver_img": r.receiver_img,
                "interact_type": r.interact_type,
                "article_id": r.article_id,
                "relate_id": r.relate_id,
                "status": r.status,
                "create_time": r.create_time.strftime("%Y-%m-%d %H:%M")
            }
            for r in records
        ]
    # 阅读用户互动记录
    async def read_user_interact(self, user_id: int) -> bool:
        """
        将所有互动记录的status字段设为1
        参数:
            user_id (int): 用户ID
        返回:
            bool: 是否阅读成功
        """
        # 阅读用户互动记录
        try:
            await self.session.execute(
                InteractiveMessage.__table__.update()
                .where(InteractiveMessage.receiver_id == user_id)
                .values(status=1)
            )
            await self.session.commit()
            return True
        except:
            await self.session.rollback()
            return False
    # 查询用户未读互动记录数量
    async def get_unread_interact_count(self, user_id: int) -> int:
        """
        查询用户未读互动记录数量
        参数:
            user_id (int): 用户ID
        返回:
            int: 未读互动记录数量
        """
        # 查询未读互动记录数量
        result = await self.session.execute(
            select(func.count(InteractiveMessage.id))
            .where(InteractiveMessage.receiver_id == user_id)
            .where(InteractiveMessage.status == 0)
        )
        count = result.scalar()
        return count