import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateCustomerSchema } from "@/lib/validations";

// 获取单个客户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("获取客户详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取客户详情失败" },
      { status: 500 }
    );
  }
}

// 更新客户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const customerId = Number(id);

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: parsed.data,
    });

    await logOperation({
      action: "update",
      module: "customer",
      targetId: customerId,
      detail: { before: existing, after: parsed.data },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "客户更新成功",
    });
  } catch (error) {
    // 识别 P2002 唯一约束冲突
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "客户编码已被其他客户使用" },
        { status: 400 }
      );
    }
    console.error("更新客户失败:", error);
    return NextResponse.json(
      { success: false, error: "更新客户失败" },
      { status: 500 }
    );
  }
}

// 删除客户（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const customerId = Number(id);

    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    // 检查是否被销售单引用
    const salesCount = await prisma.salesOrder.count({
      where: { customerId },
    });

    if (salesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该客户已被 ${salesCount} 个销售单引用，无法删除`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id: customerId } });

    await logOperation({
      action: "delete",
      module: "customer",
      targetId: customerId,
      detail: { deleted: existing },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "客户删除成功",
    });
  } catch (error) {
    console.error("删除客户失败:", error);
    return NextResponse.json(
      { success: false, error: "删除客户失败" },
      { status: 500 }
    );
  }
}
