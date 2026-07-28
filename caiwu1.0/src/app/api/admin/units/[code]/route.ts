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
    const { name } = body;

    const existing = await prisma.unit.findUnique({ where: { code } });
    if (!existing) {
      return apiErrorResponse(404, "单位不存在");
    }

    // 如果修改了编码 — 事务中更新关联商品 + 重建单位
    const newCode = body.code || code;
    if (newCode !== code) {
      const conflict = await prisma.unit.findUnique({ where: { code: newCode } });
      if (conflict) {
        return apiErrorResponse(409, `单位编码 ${newCode} 已存在`);
      }
      const unit = await prisma.$transaction(async (tx) => {
        await tx.product.updateMany({
          where: { unitCode: code },
          data: { unitCode: newCode },
        });
        await tx.unit.delete({ where: { code } });
        return tx.unit.create({ data: { code: newCode, name: name || existing.name } });
      });
      return apiSuccessResponse(unit);
    }

    const unit = await prisma.unit.update({
      where: { code },
      data: { name: name || existing.name },
    });
    return apiSuccessResponse(unit);
  } catch (error) {
    console.error("更新单位失败:", error);
    return apiErrorResponse(500, "更新单位失败");
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

    const existing = await prisma.unit.findUnique({ where: { code } });
    if (!existing) {
      return apiErrorResponse(404, "单位不存在");
    }

    // 检查是否有关联商品
    const productCount = await prisma.product.count({ where: { unitCode: code } });
    if (productCount > 0) {
      return apiErrorResponse(400, `该单位下有 ${productCount} 个商品，无法删除`);
    }

    await prisma.unit.delete({ where: { code } });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除单位失败:", error);
    return apiErrorResponse(500, "删除单位失败");
  }
}
