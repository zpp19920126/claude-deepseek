import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

/**
 * GET /api/products
 * 公开商品列表，支持搜索、分类筛选、分页
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );

    // 使用 Prisma 生成的类型，编译期类型安全
    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
    };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return apiSuccessResponse({
      products,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("获取商品列表失败:", error);
    return apiErrorResponse(500, "获取商品列表失败");
  }
}
