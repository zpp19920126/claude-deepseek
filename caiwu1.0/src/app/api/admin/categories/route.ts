import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { categorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
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
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const { code } = parsed.data;
    const existing = await prisma.category.findUnique({ where: { code } });
    if (existing) {
      return apiErrorResponse(409, `分类编码 ${code} 已存在`);
    }

    const category = await prisma.category.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
        costSharingMethod: parsed.data.costSharingMethod ?? null,
        sharingCount: parsed.data.sharingCount ?? null,
        sorter: parsed.data.sorter ?? null,
      },
    });
  await auditLog({ action: "CREATE", entity: "Category", entityId: category.code, detail: `创建分类: ${category.name || category.code || ''}`, operator: "admin" });
    return apiSuccessResponse(category, 201);
  } catch (error) {
    console.error("创建分类失败:", error);
    return apiErrorResponse(500, "创建分类失败");
  }
}
