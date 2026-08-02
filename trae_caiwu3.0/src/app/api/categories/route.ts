import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createCategorySchema } from "@/lib/validations";
import type { PaginatedResponse } from "@/types";
import type { Category } from "@prisma/client";

// 获取分类列表
// - 选择器模式（无 page 参数）：返回 { success, data: [{id,name}] }，供 EntityPicker 使用
// - 列表模式（带 page 参数）：返回 PaginatedResponse<Category>
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const pageParam = searchParams.get("page");

    // 选择器模式：无 page 参数时返回精简列表
    if (pageParam === null) {
      const where = search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { shortName: { contains: search } },
            ],
          }
        : undefined;

      const categories = await prisma.category.findMany({
        where,
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return NextResponse.json({ success: true, data: categories });
    }

    // 列表模式：分页 + 搜索（编码、名称、简称）
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 20)
    );

    const where = search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
            { shortName: { contains: search } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.category.count({ where }),
    ]);

    const result: PaginatedResponse<Category> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取分类列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取分类列表失败" },
      { status: 500 }
    );
  }
}

// 新增分类
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { code, name, shortName, parentId, sortOrder } = parsed.data;

    const created = await prisma.category.create({
      data: {
        code,
        name,
        shortName: shortName ?? null,
        parentId: parentId ?? null,
        sortOrder,
      },
    });

    await logOperation({
      action: "create",
      module: "category",
      targetId: created.id,
      detail: { code, name, shortName, parentId, sortOrder },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "分类创建成功",
    });
  } catch (error) {
    // I4: 识别 P2002 唯一约束冲突（code 或 name 重复）
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.[0];
      const field = target === "name" ? "分类名称" : "分类编码";
      return NextResponse.json(
        { success: false, error: `${field}已存在` },
        { status: 400 }
      );
    }
    console.error("创建分类失败:", error);
    return NextResponse.json(
      { success: false, error: "创建分类失败" },
      { status: 500 }
    );
  }
}
