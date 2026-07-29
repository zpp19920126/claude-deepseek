import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { salesOrderSchema } from "@/lib/validations";
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
    const parsed = salesOrderSchema.omit({ documentNo: true }).safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    let documentNo = generateDocumentNo();
    const existing = await prisma.salesOrder.findUnique({ where: { documentNo } });
    if (existing) documentNo = generateDocumentNo();

    const { deliveryDate, receiptDate, productionDate, ...rest } = parsed.data;
    const order = await prisma.salesOrder.create({
      data: {
        ...rest,
        documentNo,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        productionDate: productionDate ? new Date(productionDate) : null,
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
