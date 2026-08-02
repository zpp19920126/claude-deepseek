import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { productSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
    });
    if (!product) return apiErrorResponse(404, "商品不存在");

    return apiSuccessResponse(product);
  } catch (error) {
    console.error("获取商品详情失败:", error);
    return apiErrorResponse(500, "获取商品详情失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "商品不存在");

    // 如果改编码，检查唯一性
    if (body.code && body.code !== existing.code) {
      const conflict = await prisma.product.findUnique({ where: { code: body.code } });
      if (conflict) return apiErrorResponse(409, `商品编码 ${body.code} 已存在`);
    }

    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const product = await prisma.product.update({
      where: { id },
      data: parsed.data,
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
    });

  await auditLog({ action: "UPDATE", entity: "Product", entityId: product.id, detail: `更新商品: ${product.name || product.code || ''}`, operator: "admin" });
    return apiSuccessResponse(product);
  } catch (error) {
    console.error("更新商品失败:", error);
    return apiErrorResponse(500, "更新商品失败");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "商品不存在");

    // 检查是否有关联销售单
    const orderCount = await prisma.salesOrder.count({ where: { productCode: existing.code } });
    if (orderCount > 0) {
      return apiErrorResponse(400, `该商品有 ${orderCount} 条销售单记录，无法删除`);
    }

    await prisma.product.delete({ where: { id } });
  await auditLog({ action: "DELETE", entity: "Product", entityId: existing.id, detail: `删除商品: ${existing.name || existing.code}`, operator: "admin" });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除商品失败:", error);
    return apiErrorResponse(500, "删除商品失败");
  }
}
