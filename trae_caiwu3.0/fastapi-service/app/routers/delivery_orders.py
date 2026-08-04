"""配送单路由 - 转发到 Next.js /api/delivery-orders"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..file_utils import validate_upload_file
from ..models import DeliveryOrderCreate, DeliveryOrderUpdate

router = APIRouter()


@router.get("", summary="配送单列表")
async def list_delivery_orders(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """获取配送单列表（分页 + 搜索 orderNo）"""
    params = {"page": page, "pageSize": pageSize}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/delivery-orders", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.post("", summary="创建配送单")
async def create_delivery_order(body: DeliveryOrderCreate):
    """创建配送单（含明细，自动生成单据编号）"""
    resp = await nextjs_client.request("POST", "/api/delivery-orders", json=body.model_dump())
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/template", summary="下载配送单导入模板")
async def download_template():
    resp = await nextjs_client.request("GET", "/api/delivery-orders/template")
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入配送单")
async def import_delivery_orders(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入配送单（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    contents, filename = await validate_upload_file(file)
    resp = await nextjs_client.request(
        "POST",
        "/api/delivery-orders/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出配送单列表")
async def export_delivery_orders(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/delivery-orders/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{order_id}", summary="配送单详情")
async def get_delivery_order(order_id: int):
    """获取配送单详情（含明细 + 商品/单位/客户）"""
    resp = await nextjs_client.request("GET", f"/api/delivery-orders/{order_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.put("/{order_id}", summary="更新配送单")
async def update_delivery_order(order_id: int, body: DeliveryOrderUpdate):
    """更新配送单（含明细整体替换）"""
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/delivery-orders/{order_id}", json=payload)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.delete("/{order_id}", summary="删除配送单")
async def delete_delivery_order(order_id: int):
    """删除配送单（仅管理员，级联删除明细）"""
    resp = await nextjs_client.request("DELETE", f"/api/delivery-orders/{order_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
