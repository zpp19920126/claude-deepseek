import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { supplierSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "供应商不存在");

    if (body.code && body.code !== existing.code) {
      const conflict = await prisma.supplier.findUnique({ where: { code: body.code } });
      if (conflict) return apiErrorResponse(409, `供应商编码 ${body.code} 已存在`);
    }

    const parsed = supplierSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: parsed.data,
    });
    return apiSuccessResponse(supplier);
  } catch (error) {
    console.error("更新供应商失败:", error);
    return apiErrorResponse(500, "更新供应商失败");
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
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "供应商不存在");

    const orderCount = await prisma.salesOrder.count({ where: { supplierId: id } });
    if (orderCount > 0) {
      return apiErrorResponse(400, `该供应商有 ${orderCount} 条销售单记录，无法删除`);
    }

    await prisma.supplier.delete({ where: { id } });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除供应商失败:", error);
    return apiErrorResponse(500, "删除供应商失败");
  }
}
