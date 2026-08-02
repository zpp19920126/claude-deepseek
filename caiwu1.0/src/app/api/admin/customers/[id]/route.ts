import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { customerSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
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
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "客户不存在");

    if (body.code && body.code !== existing.code) {
      const conflict = await prisma.customer.findUnique({ where: { code: body.code } });
      if (conflict) return apiErrorResponse(409, `客户编码 ${body.code} 已存在`);
    }

    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: parsed.data,
    });
  await auditLog({ action: "UPDATE", entity: "Customer", entityId: customer.id, detail: `更新客户: ${customer.name || customer.code || ''}`, operator: "admin" });
    return apiSuccessResponse(customer);
  } catch (error) {
    console.error("更新客户失败:", error);
    return apiErrorResponse(500, "更新客户失败");
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
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "客户不存在");

    const orderCount = await prisma.salesOrder.count({ where: { customerCode: existing.code } });
    if (orderCount > 0) {
      return apiErrorResponse(400, `该客户有 ${orderCount} 条销售单记录，无法删除`);
    }

    await prisma.customer.delete({ where: { id } });
  await auditLog({ action: "DELETE", entity: "Customer", entityId: existing.id, detail: `删除客户: ${existing.name || existing.code}`, operator: "admin" });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除客户失败:", error);
    return apiErrorResponse(500, "删除客户失败");
  }
}
