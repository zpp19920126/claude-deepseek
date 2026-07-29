import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

const PAGE_SIZE = 15;

/**
 * GET /api/goods — 商品列表（公开）
 * ?search=白菜    模糊搜索（名称/编码）
 * ?category=LS01   按分类编码筛选
 * ?page=1          分页，默认第 1 页，每页 15 条
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (category) {
      where.categoryCode = category;
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          unit: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]);

    return apiSuccessResponse({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("获取商品列表失败:", error);
    return apiErrorResponse(500, "获取商品列表失败");
  }
}

/**
 * POST /api/goods — 创建商品（公开）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    // 检查编码唯一性
    const existing = await prisma.product.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return apiErrorResponse(409, `商品编码 ${parsed.data.code} 已存在`);
    }

    const product = await prisma.product.create({
      data: { ...parsed.data, createdBy: "public", operator: "public" },
      include: {
        unit: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
      },
    });

    return apiSuccessResponse(product, 201);
  } catch (error) {
    console.error("创建商品失败:", error);
    return apiErrorResponse(500, "创建商品失败");
  }
}
