import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createUnitSchema } from "@/lib/validations";
import type { PaginatedResponse } from "@/types";
import type { Unit } from "@prisma/client";

// 获取单位列表（支持分页和搜索）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 20)
    );
    const search = searchParams.get("search")?.trim() || "";

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.unit.count({ where }),
    ]);

    const result: PaginatedResponse<Unit> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取单位列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取单位列表失败" },
      { status: 500 }
    );
  }
}

// 新增单位
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { code, name } = parsed.data;

    // 检查编码和名称是否已存在
    const existing = await prisma.unit.findFirst({
      where: { OR: [{ code }, { name }] },
    });

    if (existing) {
      const field = existing.code === code ? "编码" : "名称";
      return NextResponse.json(
        { success: false, error: `单位${field}已存在` },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: { code, name },
    });

    // 记录操作日志
    await logOperation({
      action: "create",
      module: "unit",
      targetId: unit.id,
      detail: { code, name },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: unit,
      message: "单位创建成功",
    });
  } catch (error) {
    console.error("创建单位失败:", error);
    return NextResponse.json(
      { success: false, error: "创建单位失败" },
      { status: 500 }
    );
  }
}
