from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import auth, point
from app.loggers import setup_logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    setup_logger()
    yield
    # 关闭时执行（如果需要）

app = FastAPI(lifespan=lifespan)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境建议指定具体域名如 ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法 (GET, POST, etc.)
    allow_headers=["*"],  # 允许所有请求头
)

app.include_router(auth.router)
app.include_router(point.router)

@app.get("/")
def read_root():
    return {"Hello": "World"}