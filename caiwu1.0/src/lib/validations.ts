import { z } from "zod";

// ============== 单位 ==============

export const unitSchema = z.object({
  code: z.string().min(1, "单位编码不能为空"),
  name: z.string().min(1, "单位名称不能为空"),
});

// ============== 分类 ==============

export const categorySchema = z.object({
  code: z.string().min(1, "分类编码不能为空"),
  name: z.string().min(1, "分类名称不能为空"),
  icon: z.string().optional().nullable(),
  costSharingMethod: z.string().optional().nullable(),
  sharingCount: z.number().int().optional().nullable(),
  sorter: z.string().optional().nullable(),
});

// ============== 供应商 ==============

export const supplierSchema = z.object({
  code: z.string().min(1, "单位编码不能为空"),
  name: z.string().min(1, "单位名称不能为空"),
  shortName: z.string().optional().nullable(),
  priceMode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),
  contractStartDate: z.string().datetime().optional().nullable(),
  contractEndDate: z.string().datetime().optional().nullable(),
});

// ============== 客户 ==============

export const customerSchema = z.object({
  code: z.string().min(1, "单位编码不能为空"),
  name: z.string().min(1, "单位名称不能为空"),
  shortName: z.string().optional().nullable(),
  priceMode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),
  contractStartDate: z.string().datetime().optional().nullable(),
  contractEndDate: z.string().datetime().optional().nullable(),
});

// ============== 商品 ==============

export const productSchema = z.object({
  code: z.string().min(1, "商品编码不能为空"),
  name: z.string().min(1, "商品名称不能为空"),
  shortName: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  mainImage: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
  unitCode: z.string().optional().nullable(),
  isRawVeg: z.boolean().optional(),
  isCleanVeg: z.boolean().optional(),
  yieldRate: z.number().min(0).max(1).optional().nullable(),
  defaultSupplierId: z.string().optional().nullable(),
  defaultSupplierShortName: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  categoryCode: z.string().optional().nullable(),
  sorter: z.string().optional().nullable(),
  shelfLife: z.number().int().optional().nullable(),
  operator: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

// ============== 销售单 ==============

export const salesOrderSchema = z.object({
  deliveryDate: z.string().datetime().optional().nullable(),
  documentNo: z.string().min(1, "单据序号不能为空"),
  productCode: z.string().optional().nullable(),
  productName: z.string().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerShortName: z.string().optional().nullable(),
  productionDate: z.string().datetime().optional().nullable(),
  orderUnit: z.string().optional().nullable(),
  orderQuantity: z.number().optional().nullable(),
  deliveryUnit: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  deliveryQuantity: z.number().optional().nullable(),
  receivedQuantity: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  discountUnitPrice: z.number().optional().nullable(),
  discountAmount: z.number().optional().nullable(),
  totalStock: z.number().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  categoryCode: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  sorter: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  lastModifiedBy: z.string().optional().nullable(),
  preparedBy: z.string().optional().nullable(),
});
