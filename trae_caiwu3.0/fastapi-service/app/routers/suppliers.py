"""供应商路由 - 转发到 Next.js /api/suppliers"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..file_utils import validate_upload_file
from ..models import SupplierCreate, SupplierUpdate

router = APIRouter()


@router.get("", summary="供应商列表")
async def list_suppliers(
    page: Optional[int] = None,
    pageSize: Optional[int] = None,
    search: Optional[str] = None,
):
    """获取供应商列表（无 page 为选择器模式，带 page 为分页模式）"""
    params = {}
    if page:
        params["page"] = page
    if pageSize:
        params["pageSize"] = pageSize
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/suppliers", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.post("", summary="创建供应商")
async def create_supplier(body: SupplierCreate):
    resp = await nextjs_client.request("POST", "/api/suppliers", json=body.model_dump())
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/template", summary="下载供应商导入模板")
async def download_template():
    resp = await nextjs_client.request("GET", "/api/suppliers/template")
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入供应商")
async def import_suppliers(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入供应商（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    contents, filename = await validate_upload_file(file)
    resp = await nextjs_client.request(
        "POST",
        "/api/suppliers/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出供应商列表")
async def export_suppliers(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/suppliers/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{supplier_id}", summary="供应商详情")
async def get_supplier(supplier_id: int):
    resp = await nextjs_client.request("GET", f"/api/suppliers/{supplier_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.put("/{supplier_id}", summary="更新供应商")
async def update_supplier(supplier_id: int, body: SupplierUpdate):
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/suppliers/{supplier_id}", json=payload)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.delete("/{supplier_id}", summary="删除供应商")
async def delete_supplier(supplier_id: int):
    resp = await nextjs_client.request("DELETE", f"/api/suppliers/{supplier_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
