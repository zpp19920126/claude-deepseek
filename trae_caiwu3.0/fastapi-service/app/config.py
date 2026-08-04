"""FastAPI 配置"""
import os
from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# 显式加载 .env（pydantic v2 的 BaseModel 不会自动读取 env_file）
# 从本文件向上查找 fastapi-service/.env
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)


class Settings(BaseModel):
    # Next.js 后端地址
    NEXTJS_BASE_URL: str = os.getenv("NEXTJS_BASE_URL", "http://localhost:3000")
    # FastAPI 监听
    FASTAPI_HOST: str = os.getenv("FASTAPI_HOST", "127.0.0.1")  # H-1: 仅监听本地
    FASTAPI_PORT: int = int(os.getenv("FASTAPI_PORT", "8000"))
    # hermes 服务账号（需在 Next.js 系统中存在）
    # C-3: 应使用专用服务账号，不要用 admin
    HERMES_USERNAME: str = os.getenv("HERMES_USERNAME", "hermes_service")
    HERMES_PASSWORD: str = os.getenv("HERMES_PASSWORD", "")  # C-3: 必须配置强密码
    # C-1: hermes 调用 FastAPI 时需携带的 API Key
    HERMES_API_KEY: str = os.getenv("HERMES_API_KEY", "")  # 必须配置
    # C-2: 允许的 CORS 来源（逗号分隔）
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    # H-2: 速率限制（每分钟请求数）
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    # H-3: 导入文件大小限制（字节）
    MAX_IMPORT_FILE_SIZE: int = int(os.getenv("MAX_IMPORT_FILE_SIZE", str(5 * 1024 * 1024)))
    # 请求超时（秒）
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    # 是否开启调试模式（生产环境关闭 docs）
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    """单例配置"""
    return Settings()
