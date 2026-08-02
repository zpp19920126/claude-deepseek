import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { supplierSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    const suppliers = await prisma.supplier.findMany({ orderBy: { updatedAt: "desc" } });
    return apiSuccessResponse(suppliers);
  } catch (error) {
    console.error("获取供应商列表失败:", error);
    return apiErrorResponse(500, "获取供应商列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const existing = await prisma.supplier.findUnique({ where: { code: parsed.data.code } });
    if (existing) return apiErrorResponse(409, `供应商编码 ${parsed.data.code} 已存在`);

    const supplier = await prisma.supplier.create({ data: parsed.data });
  await auditLog({ action: "CREATE", entity: "Supplier", entityId: supplier.id, detail: `创建供应商: ${supplier.name || supplier.code || ''}`, operator: "admin" });
    return apiSuccessResponse(supplier, 201);
  } catch (error) {
    console.error("创建供应商失败:", error);
    return apiErrorResponse(500, "创建供应商失败");
  }
}
