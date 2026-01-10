from sqlalchemy import String, DateTime
from sqlalchemy.orm import mapped_column, Mapped
from .base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(100), nullable=False)
    create_time: Mapped[DateTime] = mapped_column(DateTime, nullable=False)

class EmailCode(Base):
    __tablename__ = "email_codes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(4), nullable=False)
    create_time: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
