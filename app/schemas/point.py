from typing import Annotated

from pydantic import BaseModel, Field


# 地点请求体
class PointData(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=20, description="地点名称")]
    x: Annotated[float, Field(description="地点的x坐标")]
    y: Annotated[float, Field(description="地点的y坐标")]
    category: Annotated[str, Field(max_length=20, description="地点分类")] = None
    description: Annotated[str, Field(max_length=200, description="地点描述")] = None
    img: Annotated[str, Field(max_length=200, description="地点图片URL")] = None
    icon: Annotated[str, Field(max_length=200, description="地点图标URL")] = None
