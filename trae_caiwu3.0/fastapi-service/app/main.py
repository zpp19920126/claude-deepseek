"""FastAPI 应用入口 - hermes 智能客服数据操作中间层

安全设计：
- C-1: API Key 中间件认证（X-API-Key Header）
- C-2: CORS 白名单限制
- H-1: 仅监听 127.0.0.1（生产环境用反向代理）
- H-2: slowapi 速率限制（默认 60 次/分钟）
- M-5: 生产环境关闭 /docs
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings
from .client import nextjs_client
from .auth import router as auth_router
from .routers.products import router as products_router
from .routers.categories import router as categories_router
from .routers.units import router as units_router
from .routers.customers import router as customers_router
from .routers.suppliers import router as suppliers_router
from .routers.delivery_orders import router as delivery_orders_router
from .routers.sales import router as sales_router
from .routers.purchases import router as purchases_router
from .routers.stats import router as stats_router

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hermes-api")


# C-1: API Key 认证中间件
class APIKeyMiddleware(BaseHTTPMiddleware):
    """验证 X-API-Key Header，保护所有业务端点"""

    # 不需要认证的路径
    PUBLIC_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # 公开端点放行
        if path in self.PUBLIC_PATHS:
            return await call_next(request)

        # 验证 API Key
        settings = get_settings()
        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key != settings.HERMES_API_KEY:
            logger.warning(f"未授权访问: {request.method} {path}")
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "无效或缺失的 API Key"},
            )
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时预登录，关闭时释放客户端"""
    settings = get_settings()
    logger.info(f"服务启动，监听 {settings.FASTAPI_HOST}:{settings.FASTAPI_PORT}")
    logger.info(f"后端地址：{settings.NEXTJS_BASE_URL}")

    # C-1: 启动时校验 API Key 已配置
    if not settings.HERMES_API_KEY:
        logger.error("HERMES_API_KEY 未配置，请检查 .env 文件")
        raise RuntimeError("HERMES_API_KEY 未配置")

    ok = await nextjs_client.login()
    if ok:
        logger.info("服务账号预登录成功")
    else:
        logger.warning("服务账号预登录失败，将在首次请求时重试")
    yield
    await nextjs_client.close()
    logger.info("服务已关闭")


settings = get_settings()

app = FastAPI(
    title="hermes 数据操作 API",
    description="智能客服 hermes 通过本服务操作 lvliang 蔬菜配送管理系统的数据",
    version="1.0.0",
    lifespan=lifespan,
    # M-5: 生产环境关闭文档
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# C-2: CORS 白名单（不再用 * + credentials）
allowed_origins = [
    origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

# C-1: 注册 API Key 认证中间件
app.add_middleware(APIKeyMiddleware)

# H-2: 速率限制
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# 请求日志中间件（M-1）
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # 跳过健康检查和文档
    if request.url.path not in ("/", "/health", "/docs", "/openapi.json"):
        logger.info(f"{request.method} {request.url.path} -> {response.status_code}")
    return response


# 注册路由
app.include_router(auth_router)
app.include_router(products_router, prefix="/products", tags=["商品管理"])
app.include_router(categories_router, prefix="/categories", tags=["分类管理"])
app.include_router(units_router, prefix="/units", tags=["单位管理"])
app.include_router(customers_router, prefix="/customers", tags=["客户管理"])
app.include_router(suppliers_router, prefix="/suppliers", tags=["供应商管理"])
app.include_router(delivery_orders_router, prefix="/delivery-orders", tags=["配送单管理"])
app.include_router(sales_router, prefix="/sales", tags=["销售单管理"])
app.include_router(purchases_router, prefix="/purchases", tags=["进货单管理"])
app.include_router(stats_router, prefix="/stats", tags=["数据统计"])


@app.get("/", tags=["健康检查"])
async def root():
    """健康检查"""
    return {"status": "running"}


@app.get("/health", tags=["健康检查"])
async def health():
    """健康检查"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.FASTAPI_HOST,  # H-1: 127.0.0.1
        port=settings.FASTAPI_PORT,
        reload=settings.DEBUG,
    )
