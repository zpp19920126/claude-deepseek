import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { ApiError } from "@/lib/api-error";
import { salesStatusSchema } from "@/lib/validations";
import { canTransition } from "@/lib/order-status";

// 销售单状态流转
// pending → confirmed：校验库存充足并扣减
// pending → cancelled：不涉及库存
// confirmed → delivered / cancelled：cancelled 时回补库存
// delivered → paid
// 已取消/已收款为终态
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
    const parsed = salesStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    const from = order.status;
    const to = parsed.data.to;
    if (!canTransition("sales", from, to)) {
      return NextResponse.json(
        {
          success: false,
          error: `不允许的状态流转：${from} → ${to}`,
        },
        { status: 400 }
      );
    }

    // 确认：校验库存并扣减（事务内串行 await）
    if (to === "confirmed") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, stock: true },
          });
          if (!product) {
            throw new ApiError(`商品(id=${item.productId})不存在`, 400);
          }
          if (product.stock < item.quantity) {
            throw new ApiError(
              `${product.name} 库存不足（当前 ${product.stock}）`,
              400
            );
          }
        }
        // 全部校验通过后统一扣减（串行，避免 SQLite 单连接锁）
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await tx.salesOrder.update({
          where: { id: orderId },
          data: { status: to },
        });
      }, { timeout: 10000 });
    }

    // 取消：已确认的单回补库存
    if (to === "cancelled" && from === "confirmed") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.salesOrder.update({
          where: { id: orderId },
          data: { status: to },
        });
      }, { timeout: 10000 });
    }

    // 其余流转（confirmed→delivered、delivered→paid、pending→cancelled）仅更新状态
    if (to !== "confirmed" && !(to === "cancelled" && from === "confirmed")) {
      await prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: to },
      });
    }

    await logOperation({
      action: "status",
      module: "sales",
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
    console.error("销售单状态流转失败:", error);
    return NextResponse.json(
      { success: false, error: "状态流转失败，请重试" },
      { status: 500 }
    );
  }
}
