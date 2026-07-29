import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { validateCsrf } from "@/lib/csrf";
import { salesOrderSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");

    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { code: true, name: true, shortName: true } },
        product: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccessResponse(orders);
  } catch (error) {
    console.error("获取销售单列表失败:", error);
    return apiErrorResponse(500, "获取销售单列表失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");

    const body = await request.json();
    const parsed = salesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    // 检查单据号唯一性
    const existing = await prisma.salesOrder.findUnique({ where: { documentNo: parsed.data.documentNo } });
    if (existing) return apiErrorResponse(409, "单据编号已存在");

    const order = await prisma.salesOrder.create({
      data: parsed.data,
      include: {
        customer: { select: { code: true, name: true, shortName: true } },
        product: { select: { code: true, name: true } },
      },
    });

    return apiSuccessResponse(order, 201);
  } catch (error) {
    console.error("创建销售单失败:", error);
    return apiErrorResponse(500, "创建销售单失败");
  }
}
