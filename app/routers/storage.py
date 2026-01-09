from fastapi import APIRouter, Query, HTTPException
import boto3
import app.settings as settings
from botocore.exceptions import ClientError

router = APIRouter(prefix="/storage", tags=["storage"])

# 创建S3客户端（核心配置保留）
def _s3_client():
    config = boto3.session.Config(
        signature_version='s3v4',
        s3={'addressing_style': 'virtual'}
    )
    return boto3.client(
        "s3",
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        endpoint_url=settings.S3_ENDPOINT,
        region_name=settings.S3_REGION,
        config=config,
    )

# 仅保留获取上传URL的核心路由
@router.get("/upload_url")
async def get_upload_url(
    key: str = Query(..., min_length=1, max_length=200),
    content_type: str = Query("image/png")
):
    client = _s3_client()
    params = {
        "Bucket": settings.S3_BUCKET,
        "Key": key,
    }
    try:
        url = client.generate_presigned_url(
            "put_object",
            Params=params,
            ExpiresIn=3600,
            HttpMethod='PUT'
        )
        return {"url": url, "key": key}
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成上传URL失败：{e.response['Error']['Message']}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务异常：{str(e)}")