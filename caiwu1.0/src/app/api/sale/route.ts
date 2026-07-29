import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

const PAGE_SIZE = 15;

function generateDocumentNo(): string {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  const random = randomBytes(3).toString("hex").substring(0, 4).toUpperCase();
  return `SAL-${date}-${random}`;
}

/**
 * GET /api/sale — 销售单列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.SalesOrderWhereInput = {};

    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { customerName: { contains: search } },
        { productName: { contains: search } },
        { selfNo: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { code: true, name: true, shortName: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return apiSuccessResponse({ items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (error) {
    console.error("获取销售单列表失败:", error);
    return apiErrorResponse(500, "获取销售单列表失败");
  }
}

/**
 * POST /api/sale — 创建销售单
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let documentNo = generateDocumentNo();
    const existing = await prisma.salesOrder.findUnique({ where: { documentNo } });
    if (existing) documentNo = generateDocumentNo();

    const order = await prisma.salesOrder.create({
      data: {
        documentNo,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        selfNo: body.selfNo || null,
        customerCode: body.customerCode || null,
        customerName: body.customerName || null,
        customerShortName: body.customerShortName || null,
        receiptAccount: body.receiptAccount || null,
        receiptAmount: body.receiptAmount ?? null,
        warehouse: body.warehouse || null,
        handler: body.handler || null,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : null,
        amount: body.amount ?? null,
        discountAmount: body.discountAmount ?? null,
        content: body.content || null,
        department: body.department || null,
        remark: body.remark || null,
        productCode: body.productCode || null,
        productName: body.productName || null,
        categoryCode: body.categoryCode || null,
        supplierId: body.supplierId || null,
        sorter: body.sorter || null,
        preparedBy: body.preparedBy || null,
        createdBy: "public",
      },
      include: { customer: { select: { code: true, name: true, shortName: true } } },
    });

    return apiSuccessResponse(order, 201);
  } catch (error) {
    console.error("创建销售单失败:", error);
    return apiErrorResponse(500, "创建销售单失败");
  }
}
