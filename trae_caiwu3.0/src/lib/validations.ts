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
