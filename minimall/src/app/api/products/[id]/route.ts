import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/products/[id]
 * 商品详情，包含分类信息和所有图片
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return apiErrorResponse(404, "商品不存在");
    }

    return apiSuccessResponse(product);
  } catch (error) {
    console.error("获取商品详情失败:", error);
    return apiErrorResponse(500, "获取商品详情失败");
  }
}
