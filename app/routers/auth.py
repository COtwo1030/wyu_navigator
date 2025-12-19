from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependences import get_session
from app.shemas.auth import RegisterData
from app.services.auth import UserService

router = APIRouter(prefix="/auth",tags=["auth"])

@router.post("/register", status_code=201)
async def register(data: RegisterData, session: AsyncSession = Depends(get_session)):
    return await UserService(session).register_user(data)
