import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...(body.deliveryDate !== undefined && { deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null }),
        ...(body.selfNo !== undefined && { selfNo: body.selfNo || null }),
        ...(body.customerCode !== undefined && { customerCode: body.customerCode || null }),
        ...(body.customerName !== undefined && { customerName: body.customerName || null }),
        ...(body.customerShortName !== undefined && { customerShortName: body.customerShortName || null }),
        ...(body.receiptAccount !== undefined && { receiptAccount: body.receiptAccount || null }),
        ...(body.receiptAmount !== undefined && { receiptAmount: body.receiptAmount ?? null }),
        ...(body.warehouse !== undefined && { warehouse: body.warehouse || null }),
        ...(body.handler !== undefined && { handler: body.handler || null }),
        ...(body.receiptDate !== undefined && { receiptDate: body.receiptDate ? new Date(body.receiptDate) : null }),
        ...(body.amount !== undefined && { amount: body.amount ?? null }),
        ...(body.discountAmount !== undefined && { discountAmount: body.discountAmount ?? null }),
        ...(body.content !== undefined && { content: body.content || null }),
        ...(body.department !== undefined && { department: body.department || null }),
        ...(body.remark !== undefined && { remark: body.remark || null }),
        ...(body.productCode !== undefined && { productCode: body.productCode || null }),
        ...(body.productName !== undefined && { productName: body.productName || null }),
        ...(body.sorter !== undefined && { sorter: body.sorter || null }),
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
