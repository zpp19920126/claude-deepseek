import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updatePurchaseOrderSchema } from "@/lib/validations";

// 获取进货单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const purchaseId = Number(id);

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            reservedUnit: { select: { id: true, name: true } },
            receivedUnit: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
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

// 更新进货单（status/remark/items 可改）
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
    const purchaseId = Number(id);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
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

    const { supplierId, status, remark, items } = parsed.data;

    const updated = await prisma.purchaseOrder.update({
      where: { id: purchaseId },
      data: {
        ...(supplierId !== undefined && { supplierId }),
        ...(status !== undefined && { status }),
        ...(remark !== undefined && { remark: remark ?? null }),
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            create: items.map((it) => ({
              productId: it.productId,
              reservedQuantity: it.reservedQuantity,
              receivedQuantity: it.receivedQuantity,
              reservedUnitId: it.reservedUnitId,
              receivedUnitId: it.receivedUnitId,
              unitPrice: it.unitPrice,
            })),
          },
        }),
      },
      include: { items: true },
    });

    await logOperation({
      action: "update",
      module: "purchase",
      targetId: purchaseId,
      detail: {
        orderNo: existing.orderNo,
        fields: Object.keys(parsed.data),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "进货单更新成功",
    });
  } catch (error) {
    console.error("更新进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新进货单失败" },
      { status: 500 }
    );
  }
}

// 删除进货单（仅管理员，级联删除明细）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const purchaseId = Number(id);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "进货单不存在" },
        { status: 404 }
      );
    }

    await prisma.purchaseOrder.delete({ where: { id: purchaseId } });

    await logOperation({
      action: "delete",
      module: "purchase",
      targetId: purchaseId,
      detail: { deleted: existing.orderNo },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "进货单删除成功" });
  } catch (error) {
    console.error("删除进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除进货单失败" },
      { status: 500 }
    );
  }
}
