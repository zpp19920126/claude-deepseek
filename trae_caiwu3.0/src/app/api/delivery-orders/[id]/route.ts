import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateDeliveryOrderSchema } from "@/lib/validations";

// 获取配送单详情（含明细 + 商品/单位/客户）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            reservedUnit: { select: { id: true, name: true } },
            deliveryUnit: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("获取配送单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配送单详情失败" },
      { status: 500 }
    );
  }
}

// 更新配送单（含明细整体替换）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateDeliveryOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { customerId, status, remark, items } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      // 更新单据头
      await tx.deliveryOrder.update({
        where: { id: orderId },
        data: {
          ...(customerId !== undefined && { customerId }),
          ...(status !== undefined && { status }),
          ...(remark !== undefined && { remark: remark ?? null }),
        },
      });

      // 明细整体替换（先删后建）
      if (items !== undefined) {
        await tx.deliveryOrderItem.deleteMany({ where: { orderId } });
        await tx.deliveryOrderItem.createMany({
          data: items.map((it) => ({
            orderId,
            productId: it.productId,
            reservedUnitId: it.reservedUnitId,
            reservedQuantity: it.reservedQuantity,
            deliveryUnitId: it.deliveryUnitId,
            deliveryQuantity: it.deliveryQuantity,
            receivedQuantity: it.receivedQuantity,
            unitPrice: it.unitPrice,
          })),
        });
      }

      return tx.deliveryOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
    });

    await logOperation({
      action: "update",
      module: "delivery_order",
      targetId: orderId,
      detail: {
        orderNo: existing.orderNo,
        fields: Object.keys(parsed.data),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "配送单更新成功",
    });
  } catch (error) {
    console.error("更新配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新配送单失败" },
      { status: 500 }
    );
  }
}

// 删除配送单（仅管理员，级联删除明细）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    await prisma.deliveryOrder.delete({ where: { id: orderId } });

    await logOperation({
      action: "delete",
      module: "delivery_order",
      targetId: orderId,
      detail: { deleted: existing.orderNo },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "配送单删除成功" });
  } catch (error) {
    console.error("删除配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除配送单失败" },
      { status: 500 }
    );
  }
}
