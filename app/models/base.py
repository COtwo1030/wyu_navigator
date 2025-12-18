from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

database_naming_convention = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}
class Base(DeclarativeBase):
    # 数据库命名约定
    metadata = MetaData(naming_convention=database_naming_convention)
