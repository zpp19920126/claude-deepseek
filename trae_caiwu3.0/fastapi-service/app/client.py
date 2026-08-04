"""Next.js API 客户端 - 处理认证和请求转发"""
import httpx
from typing import Any, Optional
from .config import get_settings


class NextJSClient:
    """Next.js API 客户端，管理 session 并转发请求"""

    def __init__(self):
        self.settings = get_settings()
        # 使用 httpx.AsyncClient 维护 cookie
        self._client: Optional[httpx.AsyncClient] = None
        self._authenticated = False

    async def get_client(self) -> httpx.AsyncClient:
        """获取 httpx 客户端（惰性创建）"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.settings.NEXTJS_BASE_URL,
                timeout=self.settings.REQUEST_TIMEOUT,
                follow_redirects=False,
            )
        return self._client

    async def login(self) -> bool:
        """使用服务账号登录 Next.js，获取 session cookie"""
        client = await self.get_client()
        try:
            resp = await client.post(
                "/api/auth/login",
                json={
                    "username": self.settings.HERMES_USERNAME,
                    "password": self.settings.HERMES_PASSWORD,
                },
            )
            if resp.status_code == 200:
                self._authenticated = True
                return True
            return False
        except Exception:
            return False

    async def ensure_authenticated(self) -> bool:
        """确保已认证，session 过期则重新登录"""
        if not self._authenticated:
            return await self.login()
        return True

    async def request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json: Optional[Any] = None,
        data: Optional[Any] = None,
        files: Optional[Any] = None,
        retry_on_auth: bool = True,
    ) -> httpx.Response:
        """发送请求到 Next.js API，401 时自动重新登录重试一次"""
        await self.ensure_authenticated()
        client = await self.get_client()

        resp = await client.request(
            method=method,
            url=path,
            params=params,
            json=json,
            data=data,
            files=files,
        )

        # 401 表示 session 过期，重新登录后重试一次
        if resp.status_code == 401 and retry_on_auth:
            self._authenticated = False
            if await self.login():
                return await self.request(
                    method=method,
                    path=path,
                    params=params,
                    json=json,
                    data=data,
                    files=files,
                    retry_on_auth=False,
                )
        return resp

    async def close(self):
        """关闭客户端"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# 全局客户端实例
nextjs_client = NextJSClient()
