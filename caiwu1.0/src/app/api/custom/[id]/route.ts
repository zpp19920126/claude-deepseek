import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return apiErrorResponse(404, "客户不存在");
    return apiSuccessResponse(customer);
  } catch (error) {
    console.error("获取客户详情失败:", error);
    return apiErrorResponse(500, "获取客户详情失败");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, shortName, pinyin, contactPerson, phone, mobile, email, address } = body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "客户不存在");

    const customer = await prisma.customer.update({
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
        updatedBy: "public",
      },
    });

    return apiSuccessResponse(customer);
  } catch (error) {
    console.error("更新客户失败:", error);
    return apiErrorResponse(500, "更新客户失败");
  }
}
