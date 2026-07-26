import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * 校验购物车项属于当前用户
 */
async function getOwnedCartItem(itemId: string, userId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { stock: true } } },
  });
  if (!item || item.userId !== userId) return null;
  return item;
}

/**
 * PUT /api/cart/[id] — 修改购物车项数量
 * 需登录 + CSRF 验证，检查库存
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }
    if (!(await validateCsrf(request))) {
      return apiErrorResponse(403, "CSRF 验证失败");
    }

    const { id } = await params;
    const { quantity } = await request.json();

    if (!Number.isInteger(quantity) || quantity < 1) {
      return apiErrorResponse(400, "数量不合法");
    }

    const item = await getOwnedCartItem(id, session.userId);
    if (!item) {
      return apiErrorResponse(404, "购物车项不存在");
    }

    if (quantity > item.product.stock) {
      return apiErrorResponse(400, `库存不足，当前库存 ${item.product.stock} 件`);
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    return apiSuccessResponse({ id: updated.id, quantity: updated.quantity });
  } catch (error) {
    console.error("更新购物车失败:", error);
    return apiErrorResponse(500, "更新购物车失败");
  }
}

/**
 * DELETE /api/cart/[id] — 删除购物车项
 * 需登录 + CSRF 验证，需属于当前用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }
    if (!(await validateCsrf(request))) {
      return apiErrorResponse(403, "CSRF 验证失败");
    }

    const { id } = await params;

    const item = await getOwnedCartItem(id, session.userId);
    if (!item) {
      return apiErrorResponse(404, "购物车项不存在");
    }

    await prisma.cartItem.delete({ where: { id } });
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("删除购物车项失败:", error);
    return apiErrorResponse(500, "删除购物车项失败");
  }
}
