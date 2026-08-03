import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { ApiError } from "@/lib/api-error";
import { updatePurchaseOrderSchema } from "@/lib/validations";

// 获取进货单详情（含明细与商品信息）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { sku: true, name: true, unit: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("获取进货单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取进货单详情失败" },
      { status: 500 }
    );
  }
}

// 更新进货单（仅待收货状态，重建明细）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "非待收货状态不可编辑" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updatePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    // 校验供应商存在
    const supplier = await prisma.supplier.findUnique({
      where: { id: parsed.data.supplierId },
      select: { id: true },
    });
    if (!supplier) {
      throw new ApiError("供应商不存在", 400);
    }

    // 校验商品存在
    const productIds = [...new Set(parsed.data.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new ApiError("部分商品不存在", 400);
    }

    const totalAmount = Number(
      parsed.data.items
        .reduce((sum, i) => sum + i.quantity * i.cost, 0)
        .toFixed(2)
    );

    // 明细行补充服务端计算的 subtotal
    const itemData = parsed.data.items.map((i) => ({
      ...i,
      subtotal: Number((i.quantity * i.cost).toFixed(2)),
    }));

    // 事务内重建明细（PurchaseOrderItem 配置了 onDelete: Cascade）
    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { orderId } });
      return tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          supplierId: parsed.data.supplierId,
          totalAmount,
          remark: parsed.data.remark ?? null,
          items: { create: itemData },
        },
      });
    }, { timeout: 10000 });

    await logOperation({
      action: "update",
      module: "purchase",
      targetId: orderId,
      detail: {
        orderNo: existing.orderNo,
        totalAmount,
        itemCount: parsed.data.items.length,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "进货单更新成功",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("更新进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新进货单失败" },
      { status: 500 }
    );
  }
}

// 删除进货单（仅管理员 + 仅待收货状态）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "非待收货状态不可删除" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({ where: { id: orderId } });

    await logOperation({
      action: "delete",
      module: "purchase",
      targetId: orderId,
      detail: { orderNo: existing.orderNo, totalAmount: existing.totalAmount },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "进货单删除成功",
    });
  } catch (error) {
    console.error("删除进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除进货单失败" },
      { status: 500 }
    );
  }
}
