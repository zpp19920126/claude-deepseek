import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
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
    const { code, name } = body;

    if (!code || !name) {
      return apiErrorResponse(400, "单位编码和名称不能为空");
    }

    const existing = await prisma.unit.findUnique({ where: { code } });
    if (existing) {
      return apiErrorResponse(409, `单位编码 ${code} 已存在`);
    }

    const unit = await prisma.unit.create({ data: { code, name } });
    return apiSuccessResponse(unit, 201);
  } catch (error) {
    console.error("创建单位失败:", error);
    return apiErrorResponse(500, "创建单位失败");
  }
}
