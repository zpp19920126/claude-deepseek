import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateProductSchema } from "@/lib/validations";

// 获取单个商品详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "商品不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("获取商品详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取商品详情失败" },
      { status: 500 }
    );
  }
}

// 更新商品
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const productId = Number(id);

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "商品不存在" },
        { status: 404 }
      );
    }

    // 如果修改了 SKU，检查唯一性
    if (parsed.data.sku && parsed.data.sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({
        where: { sku: parsed.data.sku },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: "商品编码已被其他商品使用" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: parsed.data,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    await logOperation({
      action: "update",
      module: "product",
      targetId: productId,
      detail: { before: existing, after: parsed.data },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "商品更新成功",
    });
  } catch (error) {
    // I4: 识别 P2002 唯一约束冲突
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "商品编码已被其他商品使用" },
        { status: 400 }
      );
    }
    console.error("更新商品失败:", error);
    return NextResponse.json(
      { success: false, error: "更新商品失败" },
      { status: 500 }
    );
  }
}

// 删除商品（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const productId = Number(id);

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "商品不存在" },
        { status: 404 }
      );
    }

    // 检查是否被销售单或进货单引用
    const [salesCount, purchaseCount] = await Promise.all([
      prisma.salesOrderItem.count({ where: { productId } }),
      prisma.purchaseOrderItem.count({ where: { productId } }),
    ]);

    if (salesCount > 0 || purchaseCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该商品已被销售单(${salesCount})或进货单(${purchaseCount})引用，无法删除`,
        },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id: productId } });

    await logOperation({
      action: "delete",
      module: "product",
      targetId: productId,
      detail: { deleted: existing },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "商品删除成功",
    });
  } catch (error) {
    console.error("删除商品失败:", error);
    return NextResponse.json(
      { success: false, error: "删除商品失败" },
      { status: 500 }
    );
  }
}
