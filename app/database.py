from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.settings import ASYNC_DB_URL

# 创建异步数据库引擎
async_engine = create_async_engine(
    ASYNC_DB_URL, # 异步数据库URL
    echo=True, # 开启SQL语句打印
    pool_size=10, # 连接池大小
    max_overflow=20, # 最大溢出连接数
    pool_timeout=30, # 连接池超时时间
    pool_recycle=600, # 连接池回收时间
    pool_pre_ping=True, # 检查连接是否有效
)

# 创建异步数据库会话工厂
AsyncSessionLocal = sessionmaker(
    bind=async_engine, # 绑定异步数据库引擎
    class_=AsyncSession, # 异步数据库会话类
    autoflush=False, # 自动刷新
    expire_on_commit=False, # 提交后不过期
)