import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { productSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");

    const products = await prisma.product.findMany({
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccessResponse(products);
  } catch (error) {
    console.error("获取商品列表失败:", error);
    return apiErrorResponse(500, "获取商品列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    // 检查编码唯一性
    const existing = await prisma.product.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return apiErrorResponse(409, `商品编码 ${parsed.data.code} 已存在`);
    }

    const product = await prisma.product.create({
      data: parsed.data,
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
    });

  await auditLog({ action: "CREATE", entity: "Product", entityId: product.id, detail: `创建商品: ${product.name || product.code || ''}`, operator: "admin" });
    return apiSuccessResponse(product, 201);
  } catch (error) {
    console.error("创建商品失败:", error);
    return apiErrorResponse(500, "创建商品失败");
  }
}
