import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { inventoryStatsQuerySchema } from "@/lib/validations";

// 库存预警：查询库存低于最低库存的商品
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    // H-4: 使用 zod 校验分页/筛选参数，防止非法输入
    const parsed = inventoryStatsQuerySchema.safeParse({
      onlyLowStock: searchParams.get("onlyLowStock") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }
    const onlyLowStock = parsed.data.onlyLowStock !== "false"; // 默认只看预警
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize;

    const where = onlyLowStock
      ? {
          stock: { lte: prisma.product.fields.minStock },
          status: "active" as const,
        }
      : { status: "active" as const };

    const [products, total, totalStockValue, lowStockCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { stock: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
      prisma.product.aggregate({
        where: { status: "active" },
        _sum: { stock: true },
      }),
      prisma.product.count({
        where: {
          stock: { lte: prisma.product.fields.minStock },
          status: "active",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryName: p.category.name,
          stock: p.stock,
          minStock: p.minStock,
          unit: p.unit.name,
          price: p.price,
          stockValue: p.stock * p.cost,
          isLowStock: p.stock <= p.minStock,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        summary: {
          totalStockQuantity: totalStockValue._sum.stock || 0,
          lowStockCount,
        },
      },
    });
  } catch (error) {
    console.error("获取库存统计失败:", error);
    return NextResponse.json(
      { success: false, error: "获取库存统计失败" },
      { status: 500 }
    );
  }
}
