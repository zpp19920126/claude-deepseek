import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { salesOrderSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: { select: { code: true, name: true, shortName: true } } },
    });
    if (!order) return apiErrorResponse(404, "销售单不存在");
    return apiSuccessResponse(order);
  } catch (error) {
    console.error("获取销售单详情失败:", error);
    return apiErrorResponse(500, "获取销售单详情失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "销售单不存在");

    const parsed = salesOrderSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const { deliveryDate, receiptDate, productionDate, documentNo, ...rest } = parsed.data;
    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        ...(receiptDate !== undefined && { receiptDate: receiptDate ? new Date(receiptDate) : null }),
        ...(productionDate !== undefined && { productionDate: productionDate ? new Date(productionDate) : null }),
        ...(documentNo !== undefined && { documentNo }),
        lastModifiedBy: "public",
      },
      include: { customer: { select: { code: true, name: true, shortName: true } } },
    });

    return apiSuccessResponse(order);
  } catch (error) {
    console.error("更新销售单失败:", error);
    return apiErrorResponse(500, "更新销售单失败");
  }
}
