import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/goods/[id] — 商品详情（公开）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
    });

    if (!product) {
      return apiErrorResponse(404, "商品不存在");
    }

    return apiSuccessResponse(product);
  } catch (error) {
    console.error("获取商品详情失败:", error);
    return apiErrorResponse(500, "获取商品详情失败");
  }
}

/**
 * PUT /api/goods/[id] — 更新商品（公开）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return apiErrorResponse(404, "商品不存在");
    }

    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    // 不允许修改编码
    const { code: _, ...data } = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: { ...data, operator: "public" },
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        defaultSupplier: { select: { id: true, name: true, shortName: true } },
      },
    });

  await auditLog({ action: "UPDATE", entity: "Product", entityId: product.id, detail: `更新商品: ${product.name || product.code || ''}`, operator: "public" });
    return apiSuccessResponse(product);
  } catch (error) {
    console.error("更新商品失败:", error);
    return apiErrorResponse(500, "更新商品失败");
  }
}
