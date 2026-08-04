"""FastAPI 配置"""
import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    # Next.js 后端地址
    NEXTJS_BASE_URL: str = "http://localhost:3000"
    # FastAPI 监听
    FASTAPI_HOST: str = "127.0.0.1"  # H-1: 仅监听本地，生产环境用反向代理
    FASTAPI_PORT: int = 8000
    # hermes 服务账号（需在 Next.js 系统中存在）
    # C-3: 应使用专用服务账号，不要用 admin
    HERMES_USERNAME: str = "hermes_service"
    HERMES_PASSWORD: str = ""  # C-3: 必须通过环境变量配置强密码
    # C-1: hermes 调用 FastAPI 时需携带的 API Key
    HERMES_API_KEY: str = ""  # 必须通过环境变量配置
    # C-2: 允许的 CORS 来源（逗号分隔）
    CORS_ORIGINS: str = "http://localhost:3000"
    # H-2: 速率限制（每分钟请求数）
    RATE_LIMIT_PER_MINUTE: int = 60
    # H-3: 导入文件大小限制（字节）
    MAX_IMPORT_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    # 请求超时（秒）
    REQUEST_TIMEOUT: int = 30
    # 是否开启调试模式（生产环境关闭 docs）
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_prefix = ""


@lru_cache()
def get_settings() -> Settings:
    """单例配置"""
    return Settings()
