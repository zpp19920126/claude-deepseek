import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/categories
 * 分类列表，包含每个分类下的在售商品数量
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: cat._count.products,
    }));

    return apiSuccessResponse(data);
  } catch (error) {
    console.error("获取分类列表失败:", error);
    return apiErrorResponse(500, "获取分类列表失败");
  }
}
