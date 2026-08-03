import { z } from "zod";

// ==================== 基本单位 ====================
export const createUnitSchema = z.object({
  code: z
    .string()
    .min(1, "单位编码不能为空")
    .max(20, "单位编码最长 20 字符")
    .regex(/^[A-Za-z0-9_-]+$/, "单位编码只能包含字母、数字、下划线和连字符"),
  name: z
    .string()
    .min(1, "单位名称不能为空")
    .max(20, "单位名称最长 20 字符"),
});

export const updateUnitSchema = createUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

// ==================== 商品分类 ====================
export const createCategorySchema = z.object({
  code: z
    .string()
    .min(1, "分类编码不能为空")
    .max(20, "分类编码最长 20 字符")
    .regex(/^[A-Za-z0-9_-]+$/, "分类编码只能包含字母、数字、下划线和连字符"),
  name: z
    .string()
    .min(1, "分类名称不能为空")
    .max(50, "分类名称最长 50 字符"),
  shortName: z
    .string()
    .max(20, "分类简称最长 20 字符")
    .optional()
    .nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ==================== 客户 ====================
export const createCustomerSchema = z.object({
  code: z
    .string()
    .min(1, "客户编码不能为空")
    .max(20, "客户编码最长 20 字符")
    .regex(/^[A-Za-z0-9_-]+$/, "客户编码只能包含字母、数字、下划线和连字符"),
  name: z
    .string()
    .min(1, "客户名称不能为空")
    .max(50, "客户名称最长 50 字符"),
  shortName: z
    .string()
    .max(20, "客户简称最长 20 字符")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(30, "电话最长 30 字符")
    .optional()
    .nullable(),
  address: z
    .string()
    .max(200, "地址最长 200 字符")
    .optional()
    .nullable(),
  contact: z
    .string()
    .max(50, "联系人最长 50 字符")
    .optional()
    .nullable(),
  remark: z
    .string()
    .max(500, "备注最长 500 字符")
    .optional()
    .nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ==================== 供应商 ====================
export const createSupplierSchema = z.object({
  code: z
    .string()
    .min(1, "供应商编码不能为空")
    .max(20, "供应商编码最长 20 字符")
    .regex(/^[A-Za-z0-9_-]+$/, "供应商编码只能包含字母、数字、下划线和连字符"),
  name: z
    .string()
    .min(1, "供应商名称不能为空")
    .max(50, "供应商名称最长 50 字符"),
  shortName: z
    .string()
    .max(20, "供应商简称最长 20 字符")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(30, "电话最长 30 字符")
    .optional()
    .nullable(),
  address: z
    .string()
    .max(200, "地址最长 200 字符")
    .optional()
    .nullable(),
  contact: z
    .string()
    .max(50, "联系人最长 50 字符")
    .optional()
    .nullable(),
  remark: z
    .string()
    .max(500, "备注最长 500 字符")
    .optional()
    .nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ==================== 商品 ====================
export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, "商品编码不能为空")
    .max(50, "商品编码最长 50 字符"),
  name: z
    .string()
    .min(1, "商品名称不能为空")
    .max(100, "商品名称最长 100 字符"),
  shortName: z
    .string()
    .max(50, "商品简称最长 50 字符")
    .optional()
    .nullable(),
  categoryId: z.number().int().positive("请选择商品分类"),
  unitId: z.number().int().positive("请选择基本单位"),
  supplierId: z.number().int().positive().optional().nullable(),
  price: z.number().min(0, "销售价不能为负").default(0),
  cost: z.number().min(0, "进货价不能为负").default(0),
  minStock: z.number().min(0, "最低库存不能为负").default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ==================== 销售单 ====================
export const salesOrderItemSchema = z.object({
  productId: z.number().int().positive("请选择商品"),
  quantity: z.number().positive("数量必须大于 0"),
  price: z.number().min(0, "单价不能为负"),
});

export const createSalesOrderSchema = z.object({
  customerId: z.number().int().positive("请选择客户"),
  remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, "至少添加一条商品明细"),
});

// 编辑整单（重建明细），与创建同构
export const updateSalesOrderSchema = createSalesOrderSchema;

export const salesStatusSchema = z.object({
  to: z.enum(["confirmed", "delivered", "paid", "cancelled"]),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;

// ==================== 进货单 ====================
export const purchaseOrderItemSchema = z.object({
  productId: z.number().int().positive("请选择商品"),
  quantity: z.number().positive("数量必须大于 0"),
  cost: z.number().min(0, "单价不能为负"),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.number().int().positive("请选择供应商"),
  remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "至少添加一条商品明细"),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema;

export const purchaseStatusSchema = z.object({
  to: z.enum(["received", "cancelled"]),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

// ==================== 用户管理 ====================
export const createUserSchema = z.object({
  username: z
    .string()
    .min(1, "用户名不能为空")
    .max(20, "用户名最长 20 字符")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "用户名只能包含字母、数字、下划线和连字符"
    ),
  password: z.string().min(6, "密码至少 6 位").max(50, "密码最长 50 字符"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最长 50 字符"),
  role: z.enum(["admin", "user"]).default("user"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最长 50 字符").optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  newPassword: z
    .string()
    .min(6, "密码至少 6 位")
    .max(50, "密码最长 50 字符")
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
