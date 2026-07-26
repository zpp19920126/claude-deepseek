import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/cart — 获取当前用户购物车
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: session.userId },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sortOrder: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      price: item.product.price,
      stock: item.product.stock,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
      image: item.product.images[0]?.data || null,
    }));

    return apiSuccessResponse(data);
  } catch (error) {
    console.error("获取购物车失败:", error);
    return apiErrorResponse(500, "获取购物车失败");
  }
}

/**
 * POST /api/cart — 加入购物车
 * 需登录 + CSRF 验证，自动合并已有商品，检查库存
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }
    if (!(await validateCsrf(request))) {
      return apiErrorResponse(403, "CSRF 验证失败");
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return apiErrorResponse(400, "缺少商品 ID");
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return apiErrorResponse(400, "数量不合法");
    }

    // 验证商品存在且上架
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.status !== "ACTIVE") {
      return apiErrorResponse(404, "商品不存在或已下架");
    }

    // upsert（原子操作 + 库存检查）
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { userId_productId: { userId: session.userId, productId } },
      });
      const newQuantity = existing ? existing.quantity + quantity : quantity;

      if (newQuantity > product.stock) {
        throw new Error(`库存不足，当前库存 ${product.stock} 件`);
      }

      return tx.cartItem.upsert({
        where: { userId_productId: { userId: session.userId, productId } },
        create: { userId: session.userId, productId, quantity },
        update: { quantity: newQuantity },
      });
    });

    return apiSuccessResponse({
      id: result.id,
      productId: result.productId,
      quantity: result.quantity,
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("库存不足")) {
      return apiErrorResponse(400, msg);
    }
    console.error("加入购物车失败:", error);
    return apiErrorResponse(500, "加入购物车失败");
  }
}
