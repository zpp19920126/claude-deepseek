import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { ApiError } from "@/lib/api-error";
import { purchaseStatusSchema } from "@/lib/validations";
import { canTransition } from "@/lib/order-status";

// 进货单状态流转
// pending → received：入库，商品库存增加 + 成本价更新为本次进价（最后进价法）
// pending → cancelled：不涉及库存
// received / cancelled 为终态
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const body = await request.json();
    const parsed = purchaseStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
      );
    }

    const from = order.status;
    const to = parsed.data.to;
    if (!canTransition("purchase", from, to)) {
      return NextResponse.json(
        {
          success: false,
          error: `不允许的状态流转：${from} → ${to}`,
        },
        { status: 400 }
      );
    }

    // 确认收货：库存增加 + 成本价更新为本次进价（事务内串行 await）
    if (to === "received") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true },
          });
          if (!product) {
            throw new ApiError(`商品(id=${item.productId})不存在`, 400);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              cost: item.cost, // 最后进价法：更新为本次进货单价
            },
          });
        }
        await tx.purchaseOrder.update({
          where: { id: orderId },
          data: { status: to },
        });
      }, { timeout: 10000 });
    } else {
      // pending → cancelled 仅更新状态
      await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: { status: to },
      });
    }

    await logOperation({
      action: "status",
      module: "purchase",
      targetId: orderId,
      detail: { orderNo: order.orderNo, from, to },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: { orderNo: order.orderNo, from, to },
      message: `状态已更新为「${to}」`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("进货单状态流转失败:", error);
    return NextResponse.json(
      { success: false, error: "状态流转失败，请重试" },
      { status: 500 }
    );
  }
}
