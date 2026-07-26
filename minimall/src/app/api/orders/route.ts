import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { generateOrderNo } from "@/lib/utils";
import { getMembershipInfo } from "@/lib/membership";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/orders — 获取当前用户订单列表
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const data = orders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      originalAmount: order.originalAmount,
      discountRate: order.discountRate,
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
      productNames: order.items.map((i) => i.productName).join("、"),
      createdAt: order.createdAt,
    }));

    return apiSuccessResponse(data);
  } catch (error) {
    console.error("获取订单列表失败:", error);
    return apiErrorResponse(500, "获取订单列表失败");
  }
}

/**
 * POST /api/orders — 从购物车创建订单
 * 需登录 + CSRF 验证
 * 事务中：库存检查 → 创建订单 → 扣减库存 → 清空购物车
 * 用 updateMany + where 防并发超卖
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

    // 获取购物车商品
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.userId },
      include: {
        product: {
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (cartItems.length === 0) {
      return apiErrorResponse(400, "购物车为空");
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { membershipLevel: true },
    });
    if (!user) {
      return apiErrorResponse(401, "用户不存在");
    }

    // 计算原价总和（分）
    const originalAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // 应用心悦折扣
    const discountRateBps = getMembershipInfo(user.membershipLevel).discountRateBps;
    const totalAmount = Math.round((originalAmount * discountRateBps) / 10000);

    const orderNo = generateOrderNo();

    // 数据库事务
    const order = await prisma.$transaction(async (tx) => {
      // 1. 库存检查 + 原子扣减（updateMany where stock >= qty）
      for (const item of cartItems) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new Error(`库存不足：「${item.product.name}」`);
        }
      }

      // 2. 创建订单
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId: session.userId,
          status: "PENDING_PAYMENT",
          originalAmount,
          discountRate: discountRateBps,
          totalAmount,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
              subtotal: item.product.price * item.quantity,
              imageData: item.product.images?.[0]?.data || null,
            })),
          },
        },
      });

      // 3. 清空购物车
      await tx.cartItem.deleteMany({
        where: { userId: session.userId },
      });

      return newOrder;
    });

    return apiSuccessResponse(
      { id: order.id, orderNo: order.orderNo, totalAmount: order.totalAmount },
      201
    );
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("库存不足")) {
      return apiErrorResponse(400, msg);
    }
    console.error("创建订单失败:", error);
    return apiErrorResponse(500, "创建订单失败");
  }
}
