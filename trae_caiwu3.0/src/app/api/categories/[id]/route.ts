import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateCategorySchema } from "@/lib/validations";

// 获取单个分类详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("获取分类详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取分类详情失败" },
      { status: 500 }
    );
  }
}

// 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const categoryId = Number(id);

    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 404 }
      );
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
    });

    await logOperation({
      action: "update",
      module: "category",
      targetId: categoryId,
      detail: { before: existing, after: parsed.data },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "分类更新成功",
    });
  } catch (error) {
    // I4: 识别 P2002 唯一约束冲突
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.[0];
      const field = target === "name" ? "分类名称" : "分类编码";
      return NextResponse.json(
        { success: false, error: `${field}已被其他分类使用` },
        { status: 400 }
      );
    }
    console.error("更新分类失败:", error);
    return NextResponse.json(
      { success: false, error: "更新分类失败" },
      { status: 500 }
    );
  }
}

// 删除分类（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const categoryId = Number(id);

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "分类不存在" },
        { status: 404 }
      );
    }

    // 检查是否被商品引用
    const productsCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该分类已被 ${productsCount} 个商品引用，无法删除`,
        },
        { status: 400 }
      );
    }

    // 检查是否有子分类
    const childrenCount = await prisma.category.count({
      where: { parentId: categoryId },
    });

    if (childrenCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `该分类下有 ${childrenCount} 个子分类，请先删除子分类`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: categoryId } });

    await logOperation({
      action: "delete",
      module: "category",
      targetId: categoryId,
      detail: { deleted: existing },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: "分类删除成功",
    });
  } catch (error) {
    console.error("删除分类失败:", error);
    return NextResponse.json(
      { success: false, error: "删除分类失败" },
      { status: 500 }
    );
  }
}
