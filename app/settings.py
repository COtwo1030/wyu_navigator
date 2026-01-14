import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

# 数据库配置
ASYNC_DB_URL = os.getenv("ASYNC_DB_URL")

# 邮箱配置
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_SERVER = os.getenv("MAIL_SERVER")
MAIL_PORT = int(os.getenv("MAIL_PORT"))
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME")
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "False").lower() == "true"
VALIDATE_CERTS = os.getenv("VALIDATE_CERTS", "False").lower() == "true"

# JWT 配置
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# S3 配置
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
S3_REGION = os.getenv("S3_REGION", "cn-east-1")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("S3_BUCKET")

# 默认头像URL
DEFAULT_AVATAR = [
    "https://wuyu.s3.bitiful.net/Wilson_Build.webp",
    "https://wuyu.s3.bitiful.net/Wendy_Build.webp",
]