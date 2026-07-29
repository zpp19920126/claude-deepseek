import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";
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

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) return apiErrorResponse(404, "供应商不存在");

    const parsed = supplierSchema.omit({ code: true }).partial().safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { ...parsed.data, updatedBy: "public" },
    });

    return apiSuccessResponse(supplier);
  } catch (error) {
    console.error("更新供应商失败:", error);
    return apiErrorResponse(500, "更新供应商失败");
  }
}
