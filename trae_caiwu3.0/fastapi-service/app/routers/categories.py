"""分类路由 - 转发到 Next.js /api/categories"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..file_utils import validate_upload_file
from ..models import CategoryCreate, CategoryUpdate

router = APIRouter()


@router.get("", summary="分类列表")
async def list_categories(
    page: Optional[int] = None,
    pageSize: Optional[int] = None,
    search: Optional[str] = None,
):
    """获取分类列表（无 page 参数为选择器模式，带 page 为分页模式）"""
    params = {}
    if page:
        params["page"] = page
    if pageSize:
        params["pageSize"] = pageSize
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/categories", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.post("", summary="创建分类")
async def create_category(body: CategoryCreate):
    resp = await nextjs_client.request("POST", "/api/categories", json=body.model_dump())
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.get("/template", summary="下载分类导入模板")
async def download_template():
    resp = await nextjs_client.request("GET", "/api/categories/template")
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入分类")
async def import_categories(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入分类（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    contents, filename = await validate_upload_file(file)
    resp = await nextjs_client.request(
        "POST",
        "/api/categories/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出分类列表")
async def export_categories(search: Optional[str] = None):
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/categories/export", params=params)
    return Response(
        content=resp.content, status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{category_id}", summary="分类详情")
async def get_category(category_id: int):
    resp = await nextjs_client.request("GET", f"/api/categories/{category_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.put("/{category_id}", summary="更新分类")
async def update_category(category_id: int, body: CategoryUpdate):
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/categories/{category_id}", json=payload)
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")


@router.delete("/{category_id}", summary="删除分类")
async def delete_category(category_id: int):
    resp = await nextjs_client.request("DELETE", f"/api/categories/{category_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
