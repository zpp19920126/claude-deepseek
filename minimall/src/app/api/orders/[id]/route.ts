import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMembershipLevel } from "@/lib/membership";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/orders/[id] — 订单详情
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "请先登录");
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, userId: session.userId },
      include: {
        items: true,
        payment: {
          select: { id: true, amount: true, status: true, createdAt: true, paidAt: true },
        },
      },
    });

    if (!order) {
      return apiErrorResponse(404, "订单不存在");
    }

    return apiSuccessResponse(order);
  } catch (error) {
    console.error("获取订单详情失败:", error);
    return apiErrorResponse(500, "获取订单详情失败");
  }
}

/**
 * PUT /api/orders/[id] — 模拟支付
 * 需登录 + CSRF 验证
 * 事务内二次校验订单状态防 TOCTOU
 */
export async function PUT(
  request: Request,
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
    const now = new Date();

    // 事务内二次校验状态 + 原子更新
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });

      if (!order || order.userId !== session.userId) {
        throw new Error("订单不存在");
      }
      if (order.status !== "PENDING_PAYMENT") {
        throw new Error("当前订单状态不可支付");
      }

      await tx.order.update({
        where: { id },
        data: { status: "PAID", paidAt: now },
      });

      await tx.payment.create({
        data: {
          orderId: id,
          amount: order.totalAmount,
          status: "SUCCESS",
          paidAt: now,
        },
      });

      // 更新累计消费 + 会员等级（只升不降）
      const user = await tx.user.update({
        where: { id: session.userId },
        data: { totalSpent: { increment: order.totalAmount } },
      });

      const newLevel = getMembershipLevel(user.totalSpent);
      if (newLevel > user.membershipLevel) {
        await tx.user.update({
          where: { id: session.userId },
          data: { membershipLevel: newLevel },
        });
      }
    });

    return apiSuccessResponse({ status: "PAID" });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "当前订单状态不可支付" || msg === "订单不存在") {
      return apiErrorResponse(400, msg);
    }
    console.error("支付失败:", error);
    return apiErrorResponse(500, "支付失败");
  }
}
