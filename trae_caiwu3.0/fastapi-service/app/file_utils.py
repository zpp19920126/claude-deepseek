"""文件上传校验工具"""
from fastapi import UploadFile, HTTPException
from .config import get_settings

# 允许的 Excel 文件类型
ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


async def validate_upload_file(file: UploadFile) -> bytes:
    """校验上传的文件：类型 + 大小

    H-3 修复：
    - 使用 UploadFile 正确接收 multipart/form-data
    - 校验文件扩展名（仅允许 .xlsx/.xls）
    - 校验文件大小（不超过配置的 MAX_IMPORT_FILE_SIZE）

    Args:
        file: FastAPI UploadFile 对象

    Returns:
        文件内容 bytes

    Raises:
        HTTPException: 校验失败时抛出 400 错误
    """
    settings = get_settings()

    # 校验文件扩展名
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx / .xls 格式文件")

    # 读取文件内容
    contents = await file.read()

    # 校验文件大小
    if len(contents) > settings.MAX_IMPORT_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 5MB")

    # 校验 Content-Type（如果提供了的话）
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="文件类型无效，仅支持 Excel 文件")

    return contents, filename
