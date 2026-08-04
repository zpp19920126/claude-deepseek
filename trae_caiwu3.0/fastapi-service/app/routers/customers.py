"""客户路由 - 转发到 Next.js /api/customers"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..file_utils import validate_upload_file
from ..models import CustomerCreate, CustomerUpdate

router = APIRouter()


@router.get("", summary="客户列表")
async def list_customers(
    page: Optional[int] = None,
    pageSize: Optional[int] = None,
    search: Optional[str] = None,
):
    """获取客户列表（无 page 为选择器模式，带 page 为分页模式）"""
    params = {}
    if page:
        params["page"] = page
    if pageSize:
        params["pageSize"] = pageSize
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/customers", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.post("", summary="创建客户")
async def create_customer(body: CustomerCreate):
    resp = await nextjs_client.request("POST", "/api/customers", json=body.model_dump())
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/template", summary="下载客户导入模板")
async def download_template():
    resp = await nextjs_client.request("GET", "/api/customers/template")
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入客户")
async def import_customers(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入客户（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    contents, filename = await validate_upload_file(file)
    resp = await nextjs_client.request(
        "POST",
        "/api/customers/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出客户列表")
async def export_customers(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/customers/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{customer_id}", summary="客户详情")
async def get_customer(customer_id: int):
    resp = await nextjs_client.request("GET", f"/api/customers/{customer_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.put("/{customer_id}", summary="更新客户")
async def update_customer(customer_id: int, body: CustomerUpdate):
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/customers/{customer_id}", json=payload)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.delete("/{customer_id}", summary="删除客户")
async def delete_customer(customer_id: int):
    resp = await nextjs_client.request("DELETE", f"/api/customers/{customer_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
