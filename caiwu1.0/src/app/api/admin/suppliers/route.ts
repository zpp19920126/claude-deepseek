import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    const suppliers = await prisma.supplier.findMany({
      select: { id: true, code: true, name: true, shortName: true },
      orderBy: { code: "asc" },
    });
    return apiSuccessResponse(suppliers);
  } catch (error) {
    console.error("获取供应商列表失败:", error);
    return apiErrorResponse(500, "获取供应商列表失败");
  }
}
