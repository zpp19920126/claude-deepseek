import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { unitSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");

    const units = await prisma.unit.findMany({
      orderBy: { code: "asc" },
    });

    return apiSuccessResponse(units);
  } catch (error) {
    console.error("获取单位列表失败:", error);
    return apiErrorResponse(500, "获取单位列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const parsed = unitSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const { code } = parsed.data;
    const existing = await prisma.unit.findUnique({ where: { code } });
    if (existing) {
      return apiErrorResponse(409, `单位编码 ${code} 已存在`);
    }

    const unit = await prisma.unit.create({ data: parsed.data });
  await auditLog({ action: "CREATE", entity: "Unit", entityId: unit.code, detail: `创建单位: ${unit.name || unit.code || ''}`, operator: "admin" });
    return apiSuccessResponse(unit, 201);
  } catch (error) {
    console.error("创建单位失败:", error);
    return apiErrorResponse(500, "创建单位失败");
  }
}
