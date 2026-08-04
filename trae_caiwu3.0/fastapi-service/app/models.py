"""Pydantic 模型定义"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ==================== 通用模型 ====================
class StandardResponse(BaseModel):
    """Next.js API 标准响应"""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[str] = None


class PaginatedData(BaseModel):
    """分页数据"""
    items: List[Any]
    total: int
    page: int
    pageSize: int
    totalPages: int


# ==================== 商品 ====================
class ProductCreate(BaseModel):
    sku: str = Field(..., description="商品编码")
    name: str = Field(..., description="商品名称")
    shortName: Optional[str] = None
    categoryId: int
    unitId: int
    supplierId: Optional[int] = None
    price: float = 0
    cost: float = 0
    minStock: float = 0
    status: str = "active"
    remark: Optional[str] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    shortName: Optional[str] = None
    categoryId: Optional[int] = None
    unitId: Optional[int] = None
    supplierId: Optional[int] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    minStock: Optional[float] = None
    status: Optional[str] = None
    remark: Optional[str] = None


# ==================== 分类 ====================
class CategoryCreate(BaseModel):
    code: str
    name: str
    shortName: Optional[str] = None
    parentId: Optional[int] = None
    sortOrder: int = 0


class CategoryUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    shortName: Optional[str] = None
    parentId: Optional[int] = None
    sortOrder: Optional[int] = None


# ==================== 客户 ====================
class CustomerCreate(BaseModel):
    code: str
    name: str
    shortName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None


class CustomerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    shortName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None


# ==================== 供应商 ====================
class SupplierCreate(BaseModel):
    code: str
    name: str
    shortName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None


class SupplierUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    shortName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None


# ==================== 配送单 ====================
class DeliveryOrderItemCreate(BaseModel):
    productId: int
    reservedUnitId: int
    reservedQuantity: float
    deliveryUnitId: int
    deliveryQuantity: float
    receivedQuantity: float
    unitPrice: float


class DeliveryOrderCreate(BaseModel):
    status: str = "pending"
    remark: Optional[str] = None
    items: List[DeliveryOrderItemCreate]


class DeliveryOrderUpdate(BaseModel):
    status: Optional[str] = None
    remark: Optional[str] = None
    items: Optional[List[DeliveryOrderItemCreate]] = None


# ==================== 销售单 ====================
class SalesOrderCreate(BaseModel):
    deliveryOrderId: int
    customerId: int
    remark: Optional[str] = None


class SalesOrderUpdate(BaseModel):
    remark: Optional[str] = None


# ==================== 进货单 ====================
class PurchaseOrderItemCreate(BaseModel):
    productId: int
    reservedQuantity: float
    receivedQuantity: float
    reservedUnitId: int
    receivedUnitId: int
    unitPrice: float


class PurchaseOrderCreate(BaseModel):
    supplierId: int
    status: str = "pending"
    remark: Optional[str] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    supplierId: Optional[int] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None
