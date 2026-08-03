import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateSalesOrderSchema } from "@/lib/validations";

// 获取销售单详情（含配送单明细 + 商品/单位）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const salesId = Number(id);

    const order = await prisma.salesOrder.findUnique({
      where: { id: salesId },
      include: {
        customer: {
          select: { id: true, name: true, code: true, shortName: true },
        },
        deliveryOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            remark: true,
            createdAt: true,
            items: {
              include: {
                product: { select: { id: true, sku: true, name: true } },
                reservedUnit: { select: { id: true, name: true } },
                deliveryUnit: { select: { id: true, name: true } },
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("获取销售单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售单详情失败" },
      { status: 500 }
    );
  }
}

// 更新销售单（仅备注可改）
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
    const salesId = Number(id);

    const existing = await prisma.salesOrder.findUnique({
      where: { id: salesId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSalesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { remark } = parsed.data;

    const updated = await prisma.salesOrder.update({
      where: { id: salesId },
      data: {
        ...(remark !== undefined && { remark: remark ?? null }),
      },
    });

    await logOperation({
      action: "update",
      module: "sales_order",
      targetId: salesId,
      detail: {
        salesNo: existing.salesNo,
        fields: Object.keys(parsed.data),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "销售单更新成功",
    });
  } catch (error) {
    console.error("更新销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新销售单失败" },
      { status: 500 }
    );
  }
}

// 删除销售单（仅管理员，不级联删除配送单）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const salesId = Number(id);

    const existing = await prisma.salesOrder.findUnique({
      where: { id: salesId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    await prisma.salesOrder.delete({ where: { id: salesId } });

    await logOperation({
      action: "delete",
      module: "sales_order",
      targetId: salesId,
      detail: { deleted: existing.salesNo },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "销售单删除成功" });
  } catch (error) {
    console.error("删除销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除销售单失败" },
      { status: 500 }
    );
  }
}
