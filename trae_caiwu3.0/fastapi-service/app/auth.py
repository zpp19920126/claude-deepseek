"""认证路由 - 服务账号登录/登出"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from .client import nextjs_client

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login", summary="服务账号登录")
async def login():
    """使用配置的服务账号登录 Next.js 系统，获取 session

    Returns:
        {"success": true, "message": "登录成功"} 或错误信息
    """
    ok = await nextjs_client.login()
    if ok:
        return {"success": True, "message": "登录成功"}
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"success": False, "error": "登录失败，请检查服务账号配置"},
    )


@router.post("/logout", summary="登出")
async def logout():
    """登出 Next.js 系统"""
    resp = await nextjs_client.request("POST", "/api/auth/logout")
    nextjs_client._authenticated = False
    return {
        "success": resp.status_code == 200,
        "message": "已登出" if resp.status_code == 200 else "登出失败",
    }


@router.get("/status", summary="检查认证状态")
async def auth_status():
    """检查当前 session 是否有效"""
    # 通过访问需要认证的接口（如 /api/units）判断 session 是否有效
    resp = await nextjs_client.request("GET", "/api/units")
    return {
        "authenticated": resp.status_code == 200,
    }
