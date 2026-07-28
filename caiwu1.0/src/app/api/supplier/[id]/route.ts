import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return apiErrorResponse(404, "供应商不存在");
    return apiSuccessResponse(supplier);
  } catch (error) {
    console.error("获取供应商详情失败:", error);
    return apiErrorResponse(500, "获取供应商详情失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, shortName, pinyin, contactPerson, phone, mobile, email, address, orderStartTime, orderStopTime } = body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "供应商不存在");

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(shortName !== undefined && { shortName: shortName || null }),
        ...(pinyin !== undefined && { pinyin: pinyin || null }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(mobile !== undefined && { mobile: mobile || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(orderStartTime !== undefined && { orderStartTime: orderStartTime || null }),
        ...(orderStopTime !== undefined && { orderStopTime: orderStopTime || null }),
        updatedBy: "public",
      },
    });

    return apiSuccessResponse(supplier);
  } catch (error) {
    console.error("更新供应商失败:", error);
    return apiErrorResponse(500, "更新供应商失败");
  }
}
