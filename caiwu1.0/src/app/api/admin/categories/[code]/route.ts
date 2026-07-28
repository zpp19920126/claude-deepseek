import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const { code } = await params;
    const body = await request.json();
    const { name, icon, costSharingMethod, sharingCount, sorter, newCode } = body;

    const existing = await prisma.category.findUnique({ where: { code } });
    if (!existing) {
      return apiErrorResponse(404, "分类不存在");
    }

    const targetCode = newCode || code;
    if (targetCode !== code) {
      const conflict = await prisma.category.findUnique({ where: { code: targetCode } });
      if (conflict) {
        return apiErrorResponse(409, `分类编码 ${targetCode} 已存在`);
      }
      await prisma.category.delete({ where: { code } });
      const category = await prisma.category.create({
        data: {
          code: targetCode,
          name: name ?? existing.name,
          icon: icon !== undefined ? icon : existing.icon,
          costSharingMethod: costSharingMethod !== undefined ? costSharingMethod : existing.costSharingMethod,
          sharingCount: sharingCount !== undefined ? sharingCount : existing.sharingCount,
          sorter: sorter !== undefined ? sorter : existing.sorter,
        },
      });
      return apiSuccessResponse(category);
    }

    const category = await prisma.category.update({
      where: { code },
      data: {
        name: name ?? existing.name,
        icon: icon !== undefined ? icon : undefined,
        costSharingMethod: costSharingMethod !== undefined ? costSharingMethod : undefined,
        sharingCount: sharingCount !== undefined ? sharingCount : undefined,
        sorter: sorter !== undefined ? sorter : undefined,
      },
    });
    return apiSuccessResponse(category);
  } catch (error) {
    console.error("更新分类失败:", error);
    return apiErrorResponse(500, "更新分类失败");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const { code } = await params;

    const existing = await prisma.category.findUnique({ where: { code } });
    if (!existing) {
      return apiErrorResponse(404, "分类不存在");
    }

    const productCount = await prisma.product.count({ where: { categoryCode: code } });
    if (productCount > 0) {
      return apiErrorResponse(400, `该分类下有 ${productCount} 个商品，无法删除`);
    }

    await prisma.category.delete({ where: { code } });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除分类失败:", error);
    return apiErrorResponse(500, "删除分类失败");
  }
}
