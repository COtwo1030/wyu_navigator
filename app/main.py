from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routers import auth
from app.loggers import setup_logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    setup_logger()
    yield
    # 关闭时执行（如果需要）

app = FastAPI(lifespan=lifespan)

app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"Hello": "World"}