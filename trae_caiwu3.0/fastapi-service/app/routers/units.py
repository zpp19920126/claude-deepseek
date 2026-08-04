"""单位路由 - 转发到 Next.js /api/units"""
from fastapi import APIRouter, Query
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client

router = APIRouter()


@router.get("", summary="单位列表")
async def list_units(
    page: Optional[int] = None,
    pageSize: Optional[int] = None,
    search: Optional[str] = None,
):
    """获取单位列表（支持分页和搜索）"""
    params = {}
    if page:
        params["page"] = page
    if pageSize:
        params["pageSize"] = pageSize
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/units", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/export", summary="导出单位列表")
async def export_units(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/units/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{unit_id}", summary="单位详情")
async def get_unit(unit_id: int):
    resp = await nextjs_client.request("GET", f"/api/units/{unit_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
