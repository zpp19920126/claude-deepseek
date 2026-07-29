import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { salesOrderSchema } from "@/lib/validations";
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
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "销售单不存在");

    if (body.documentNo && body.documentNo !== existing.documentNo) {
      const conflict = await prisma.salesOrder.findUnique({ where: { documentNo: body.documentNo } });
      if (conflict) return apiErrorResponse(409, "单据编号已存在");
    }

    const parsed = salesOrderSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const order = await prisma.salesOrder.update({
      where: { id },
      data: parsed.data,
      include: {
        customer: { select: { code: true, name: true, shortName: true } },
        product: { select: { code: true, name: true } },
      },
    });

    return apiSuccessResponse(order);
  } catch (error) {
    console.error("更新销售单失败:", error);
    return apiErrorResponse(500, "更新销售单失败");
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
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "销售单不存在");

    await prisma.salesOrder.delete({ where: { id } });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除销售单失败:", error);
    return apiErrorResponse(500, "删除销售单失败");
  }
}
