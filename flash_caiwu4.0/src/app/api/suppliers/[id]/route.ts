import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateSupplierSchema } from "@/lib/validations";

// 获取单个供应商详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id: Number(id) },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "供应商不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error("获取供应商详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取供应商详情失败" },
      { status: 500 }
    );
  }
}

// 更新供应商
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const supplierId = Number(id);

    const body = await request.json();
    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "供应商不存在" },
        { status: 404 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: parsed.data,
    });

    await logOperation({
      action: "update",
      module: "supplier",
      targetId: supplierId,
      detail: { before: existing, after: parsed.data },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "供应商更新成功",
    });
  } catch (error) {
    // 识别 P2002 唯一约束冲突
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "供应商编码已被其他供应商使用" },
        { status: 400 }
      );
    }
    console.error("更新供应商失败:", error);
    return NextResponse.json(
      { success: false, error: "更新供应商失败" },
      { status: 500 }
    );
  }
}

// 删除供应商（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const supplierId = Number(id);

    const existing = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "供应商不存在" },
        { status: 404 }
      );
    }

    // 检查是否被进货单或商品引用
    const [purchaseCount, productCount] = await Promise.all([
      prisma.purchaseOrder.count({ where: { supplierId } }),
      prisma.product.count({ where: { supplierId } }),
    ]);

    if (purchaseCount > 0 || productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该供应商已被进货单(${purchaseCount})或商品(${productCount})引用，无法删除`,
        },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({ where: { id: supplierId } });

    await logOperation({
      action: "delete",
      module: "supplier",
      targetId: supplierId,
      detail: { deleted: existing },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "供应商删除成功",
    });
  } catch (error) {
    console.error("删除供应商失败:", error);
    return NextResponse.json(
      { success: false, error: "删除供应商失败" },
      { status: 500 }
    );
  }
}
