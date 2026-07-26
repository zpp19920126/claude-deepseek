import { z } from "zod";
import { ORDER_STATUS_VALUES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少8位"),
});

export const registerSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    password: z
      .string()
      .min(8, "密码至少8位")
      .max(100)
      .refine((pw) => /[a-z]/.test(pw), { message: "密码需包含小写字母" })
      .refine((pw) => /[A-Z]/.test(pw), { message: "密码需包含大写字母" })
      .refine((pw) => /\d/.test(pw), { message: "密码需包含数字" }),
    confirmPassword: z.string(),
    name: z.string().min(1, "请输入姓名").max(50),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  });

export const productSchema = z.object({
  name: z.string().min(1, "请输入商品名称").max(200),
  description: z.string().max(2000).optional(),
  price: z.number().int().positive("价格必须大于0"),
  stock: z.number().int().min(0, "库存不能为负数"),
  categoryId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "请输入分类名称").max(50),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  description: z.string().max(500).optional(),
});

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
});

export const cartSyncSchema = z.object({
  items: z.array(cartItemSchema),
});

// 从 OrderStatus 常量推导，避免硬编码重复
export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(9),
});
