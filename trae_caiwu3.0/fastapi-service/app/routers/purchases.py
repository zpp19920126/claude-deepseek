"""进货单路由 - 转发到 Next.js /api/purchases"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..file_utils import validate_upload_file
from ..models import PurchaseOrderCreate, PurchaseOrderUpdate

router = APIRouter()


@router.get("", summary="进货单列表")
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """获取进货单列表（分页 + 多字段搜索：orderNo、供应商、商品）"""
    params = {"page": page, "pageSize": pageSize}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/purchases", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.post("", summary="创建进货单")
async def create_purchase_order(body: PurchaseOrderCreate):
    """创建进货单（事务内生成编号 + 创建主表 + 明细）"""
    resp = await nextjs_client.request("POST", "/api/purchases", json=body.model_dump())
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/template", summary="下载进货单导入模板")
async def download_template():
    resp = await nextjs_client.request("GET", "/api/purchases/template")
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入进货单")
async def import_purchase_orders(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入进货单（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    contents, filename = await validate_upload_file(file)
    resp = await nextjs_client.request(
        "POST",
        "/api/purchases/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出进货单列表")
async def export_purchase_orders(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/purchases/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{order_id}", summary="进货单详情")
async def get_purchase_order(order_id: int):
    resp = await nextjs_client.request("GET", f"/api/purchases/{order_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.put("/{order_id}", summary="更新进货单")
async def update_purchase_order(order_id: int, body: PurchaseOrderUpdate):
    """更新进货单（status/remark/items 可改）"""
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/purchases/{order_id}", json=payload)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.delete("/{order_id}", summary="删除进货单")
async def delete_purchase_order(order_id: int):
    """删除进货单（仅管理员，级联删除明细）"""
    resp = await nextjs_client.request("DELETE", f"/api/purchases/{order_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
