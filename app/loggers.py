import sys
from loguru import logger
import os

# 定义日志文件夹路径
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# 配置日志格式
# Time | Level | File:Line | Message
LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"

def setup_logger():
    # 移除默认的 handler（避免重复打印）
    logger.remove()

    # 1. 添加控制台输出
    logger.add(
        sys.stderr,
        format=LOG_FORMAT,
        level="INFO",
        colorize=True
    )

    # 2. 添加文件输出 (INFO级别)
    logger.add(
        os.path.join(LOG_DIR, "info.log"),
        rotation="500 MB",     # 文件达到 500MB 时轮转
        retention="10 days",   # 保留 10 天
        compression="zip",     # 压缩旧日志
        level="INFO",
        format=LOG_FORMAT,
        encoding="utf-8"
    )

    # 3. 添加文件输出 (ERROR级别 - 单独存放错误)
    logger.add(
        os.path.join(LOG_DIR, "error.log"),
        rotation="10 MB",
        retention="30 days",
        level="ERROR",
        format=LOG_FORMAT,
        encoding="utf-8"
    )

    logger.info("日志系统初始化完成")

# 导出 logger 供其他模块使用
__all__ = ["logger", "setup_logger"]