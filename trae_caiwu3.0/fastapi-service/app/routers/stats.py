"""统计路由 - 转发到 Next.js /api/stats/*"""
from fastapi import APIRouter, Query
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client

router = APIRouter()


@router.get("/dashboard", summary="仪表盘汇总")
async def dashboard_stats():
    """获取仪表盘汇总数据

    返回：
    - 今日销售额/订单数
    - 今日进货额/订单数
    - 在售商品总数
    - 客户/供应商总数
    - 最近 5 笔销售单和进货单
    - 库存预警商品（前 10 个）
    """
    resp = await nextjs_client.request("GET", "/api/stats/dashboard")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/sales", summary="销售统计")
async def sales_stats(
    startDate: Optional[str] = Query(None, description="开始日期 YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD"),
):
    """获取销售统计（默认最近 30 天）

    返回：
    - 总销售额、订单数、客单价
    - 按日期聚合的销售额和订单数
    """
    params = {}
    if startDate:
        params["startDate"] = startDate
    if endDate:
        params["endDate"] = endDate
    resp = await nextjs_client.request("GET", "/api/stats/sales", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/purchases", summary="进货统计")
async def purchases_stats(
    startDate: Optional[str] = Query(None, description="开始日期 YYYY-MM-DD"),
    endDate: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD"),
):
    """获取进货统计（默认最近 30 天）

    返回：
    - 总进货额、订单数、平均单笔
    - 按日期聚合的进货额和订单数
    """
    params = {}
    if startDate:
        params["startDate"] = startDate
    if endDate:
        params["endDate"] = endDate
    resp = await nextjs_client.request("GET", "/api/stats/purchases", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/inventory", summary="库存统计")
async def inventory_stats(
    onlyLowStock: Optional[bool] = Query(True, description="True 仅看预警，False 查全部"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    """获取库存统计

    返回：
    - 商品库存列表（按库存升序）
    - 总库存数量、预警商品数
    - 每个商品的库存值（stock × cost）
    """
    params = {
        "onlyLowStock": str(onlyLowStock).lower() if onlyLowStock is not None else "true",
        "page": page,
        "pageSize": pageSize,
    }
    resp = await nextjs_client.request("GET", "/api/stats/inventory", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
