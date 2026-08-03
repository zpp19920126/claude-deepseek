import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateUnitSchema } from "@/lib/validations";

// 获取单个单位详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const unit = await prisma.unit.findUnique({
      where: { id: Number(id) },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "单位不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error("获取单位详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取单位详情失败" },
      { status: 500 }
    );
  }
}

// 更新单位
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const unitId = Number(id);

    const body = await request.json();
    const parsed = updateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "单位不存在" },
        { status: 404 }
      );
    }

    // 检查编码/名称是否与其他单位冲突
    if (parsed.data.code || parsed.data.name) {
      const conflict = await prisma.unit.findFirst({
        where: {
          AND: [
            { id: { not: unitId } },
            {
              OR: [
                ...(parsed.data.code ? [{ code: parsed.data.code }] : []),
                ...(parsed.data.name ? [{ name: parsed.data.name }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        const field =
          conflict.code === parsed.data.code ? "编码" : "名称";
        return NextResponse.json(
          { success: false, error: `单位${field}已被其他单位使用` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.unit.update({
      where: { id: unitId },
      data: parsed.data,
    });

    // 记录操作日志
    await logOperation({
      action: "update",
      module: "unit",
      targetId: unitId,
      detail: { before: existing, after: parsed.data },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "单位更新成功",
    });
  } catch (error) {
    console.error("更新单位失败:", error);
    return NextResponse.json(
      { success: false, error: "更新单位失败" },
      { status: 500 }
    );
  }
}

// 删除单位
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const unitId = Number(id);

    const existing = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "单位不存在" },
        { status: 404 }
      );
    }

    // 检查是否有关联商品
    const productCount = await prisma.product.count({
      where: { unitId },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该单位已被 ${productCount} 个商品使用，无法删除`,
        },
        { status: 400 }
      );
    }

    await prisma.unit.delete({ where: { id: unitId } });

    // 记录操作日志
    await logOperation({
      action: "delete",
      module: "unit",
      targetId: unitId,
      detail: { deleted: existing },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "单位删除成功",
    });
  } catch (error) {
    console.error("删除单位失败:", error);
    return NextResponse.json(
      { success: false, error: "删除单位失败" },
      { status: 500 }
    );
  }
}
