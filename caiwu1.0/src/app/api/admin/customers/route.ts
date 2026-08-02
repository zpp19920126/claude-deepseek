import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { customerSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    const customers = await prisma.customer.findMany({ orderBy: { updatedAt: "desc" } });
    return apiSuccessResponse(customers);
  } catch (error) {
    console.error("获取客户列表失败:", error);
    return apiErrorResponse(500, "获取客户列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const existing = await prisma.customer.findUnique({ where: { code: parsed.data.code } });
    if (existing) return apiErrorResponse(409, `客户编码 ${parsed.data.code} 已存在`);

    const customer = await prisma.customer.create({ data: parsed.data });
  await auditLog({ action: "CREATE", entity: "Customer", entityId: customer.id, detail: `创建客户: ${customer.name || customer.code || ''}`, operator: "admin" });
    return apiSuccessResponse(customer, 201);
  } catch (error) {
    console.error("创建客户失败:", error);
    return apiErrorResponse(500, "创建客户失败");
  }
}
