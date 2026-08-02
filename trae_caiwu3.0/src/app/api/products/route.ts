import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createProductSchema } from "@/lib/validations";
import type { PaginatedResponse } from "@/types";

// 商品列表查询（支持通用 search + 多字段筛选 + 分页）
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

    // 通用 search：对 sku/name/shortName 做 OR 模糊匹配
    const search = searchParams.get("search")?.trim() || "";

    // 精确字段筛选
    const sku = searchParams.get("sku")?.trim();
    const name = searchParams.get("name")?.trim();
    const shortName = searchParams.get("shortName")?.trim();
    const categoryId = searchParams.get("categoryId");
    const supplierId = searchParams.get("supplierId");

    const where: Prisma.ProductWhereInput = {};
    if (sku) where.sku = { contains: sku };
    if (name) where.name = { contains: name };
    if (shortName) where.shortName = { contains: shortName };
    if (categoryId) where.categoryId = Number(categoryId);
    if (supplierId) where.supplierId = Number(supplierId);

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { name: { contains: search } },
        { shortName: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    const result: PaginatedResponse<typeof items[number]> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取商品列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取商品列表失败" },
      { status: 500 }
    );
  }
}

// 新增商品
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    // 检查 SKU 是否已存在
    const existing = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "商品编码已存在" },
        { status: 400 }
      );
    }

    // 验证分类、单位、供应商是否存在
    const [category, unit, supplier] = await Promise.all([
      prisma.category.findUnique({ where: { id: parsed.data.categoryId } }),
      prisma.unit.findUnique({ where: { id: parsed.data.unitId } }),
      parsed.data.supplierId
        ? prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } })
        : Promise.resolve(true),
    ]);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "商品分类不存在" },
        { status: 400 }
      );
    }
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "基本单位不存在" },
        { status: 400 }
      );
    }
    if (parsed.data.supplierId && !supplier) {
      return NextResponse.json(
        { success: false, error: "供应商不存在" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: parsed.data,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    await logOperation({
      action: "create",
      module: "product",
      targetId: product.id,
      detail: { sku: product.sku, name: product.name },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: "商品创建成功",
    });
  } catch (error) {
    // I4: 识别 P2002 唯一约束冲突（并发场景下 findUnique 检查可能被穿透）
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "商品编码已存在" },
        { status: 400 }
      );
    }
    console.error("创建商品失败:", error);
    return NextResponse.json(
      { success: false, error: "创建商品失败" },
      { status: 500 }
    );
  }
}
