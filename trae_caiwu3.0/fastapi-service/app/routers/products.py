"""商品路由 - 转发到 Next.js /api/products"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import Response
from typing import Optional
from ..client import nextjs_client
from ..config import get_settings
from ..models import ProductCreate, ProductUpdate

router = APIRouter()
settings = get_settings()

# 允许的文件类型
ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


@router.get("", summary="商品列表")
async def list_products(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[int] = None,
    status: Optional[str] = None,
):
    """获取商品列表（分页 + 搜索 + 筛选）"""
    params = {"page": page, "pageSize": pageSize}
    if search:
        params["search"] = search
    if category:
        params["category"] = category
    if status:
        params["status"] = status
    resp = await nextjs_client.request("GET", "/api/products", params=params)
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.post("", summary="创建商品")
async def create_product(body: ProductCreate):
    """创建商品"""
    resp = await nextjs_client.request("POST", "/api/products", json=body.model_dump())
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/template", summary="下载商品导入模板")
async def download_template():
    """下载商品导入模板（Excel）"""
    resp = await nextjs_client.request("GET", "/api/products/template")
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.post("/import", summary="批量导入商品")
async def import_products(file: UploadFile = File(..., description="Excel 文件")):
    """批量导入商品（上传 Excel 文件，最大 5MB）

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件类型（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过 5MB）
    """
    # 校验文件扩展名
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx / .xls 格式文件")

    # 读取文件内容并校验大小
    contents = await file.read()
    if len(contents) > settings.MAX_IMPORT_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 5MB")

    # 校验 Content-Type（如果提供了的话）
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="文件类型无效，仅支持 Excel 文件")

    # 转发给 Next.js
    resp = await nextjs_client.request(
        "POST",
        "/api/products/import",
        files={"file": (filename, contents, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.get("/export", summary="导出商品列表")
async def export_products(search: Optional[str] = None):
    """导出商品列表为 Excel"""
    params = {}
    if search:
        params["search"] = search
    resp = await nextjs_client.request("GET", "/api/products/export", params=params)
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": resp.headers.get("Content-Disposition", "")},
    )


@router.get("/{product_id}", summary="商品详情")
async def get_product(product_id: int):
    """获取商品详情"""
    resp = await nextjs_client.request("GET", f"/api/products/{product_id}")
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.put("/{product_id}", summary="更新商品")
async def update_product(product_id: int, body: ProductUpdate):
    """更新商品"""
    payload = body.model_dump(exclude_none=True)
    resp = await nextjs_client.request("PUT", f"/api/products/{product_id}", json=payload)
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )


@router.delete("/{product_id}", summary="删除商品")
async def delete_product(product_id: int):
    """删除商品（仅管理员）"""
    resp = await nextjs_client.request("DELETE", f"/api/products/{product_id}")
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
    )
