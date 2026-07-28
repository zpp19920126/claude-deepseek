import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");

    const categories = await prisma.category.findMany({
      orderBy: { code: "asc" },
    });

    return apiSuccessResponse(categories);
  } catch (error) {
    console.error("获取分类列表失败:", error);
    return apiErrorResponse(500, "获取分类列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const { code, name, icon, costSharingMethod, sharingCount, sorter } = body;

    if (!code || !name) {
      return apiErrorResponse(400, "分类编码和名称不能为空");
    }

    const existing = await prisma.category.findUnique({ where: { code } });
    if (existing) {
      return apiErrorResponse(409, `分类编码 ${code} 已存在`);
    }

    const category = await prisma.category.create({
      data: {
        code,
        name,
        icon: icon || null,
        costSharingMethod: costSharingMethod || null,
        sharingCount: sharingCount || null,
        sorter: sorter || null,
      },
    });
    return apiSuccessResponse(category, 201);
  } catch (error) {
    console.error("创建分类失败:", error);
    return apiErrorResponse(500, "创建分类失败");
  }
}
