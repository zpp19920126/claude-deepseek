import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createSupplierSchema } from "@/lib/validations";
import type { PaginatedResponse } from "@/types";
import type { Supplier } from "@prisma/client";

// 获取供应商列表
// - 选择器模式（无 page 参数）：返回 { success, data: [{id,name}] }，供 EntityPicker 使用
// - 列表模式（带 page 参数）：返回 PaginatedResponse<Supplier>
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

      const suppliers = await prisma.supplier.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ success: true, data: suppliers });
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
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);

    const result: PaginatedResponse<Supplier> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取供应商列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取供应商列表失败" },
      { status: 500 }
    );
  }
}

// 新增供应商
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { code, name, shortName, phone, address, contact, remark } =
      parsed.data;

    const created = await prisma.supplier.create({
      data: {
        code,
        name,
        shortName: shortName ?? null,
        phone: phone ?? null,
        address: address ?? null,
        contact: contact ?? null,
        remark: remark ?? null,
      },
    });

    await logOperation({
      action: "create",
      module: "supplier",
      targetId: created.id,
      detail: { code, name, shortName, phone, address, contact, remark },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "供应商创建成功",
    });
  } catch (error) {
    // 识别 P2002 唯一约束冲突（code 重复）
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "供应商编码已存在" },
        { status: 400 }
      );
    }
    console.error("创建供应商失败:", error);
    return NextResponse.json(
      { success: false, error: "创建供应商失败" },
      { status: 500 }
    );
  }
}
