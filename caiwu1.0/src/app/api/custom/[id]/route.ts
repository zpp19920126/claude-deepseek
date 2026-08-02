import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return apiErrorResponse(404, "客户不存在");
    return apiSuccessResponse(customer);
  } catch (error) {
    console.error("获取客户详情失败:", error);
    return apiErrorResponse(500, "获取客户详情失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "客户不存在");

    const parsed = customerSchema.omit({ code: true }).partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { ...parsed.data, updatedBy: "public" },
    });

  await auditLog({ action: "UPDATE", entity: "Customer", entityId: customer.id, detail: `更新客户: ${customer.name || customer.code || ''}`, operator: "public" });
    return apiSuccessResponse(customer);
  } catch (error) {
    console.error("更新客户失败:", error);
    return apiErrorResponse(500, "更新客户失败");
  }
}
