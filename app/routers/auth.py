from fastapi import APIRouter, Depends
from app.services.auth import UserService

from app.shemas.auth import RegisterData

router = APIRouter(prefix="/auth",tags=["auth"])

@router.post("/register", status_code=201)
async def register(data: RegisterData, service: UserService = Depends()):
    return await service.register_user(data)
