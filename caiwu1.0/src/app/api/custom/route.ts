import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { customerSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

const PAGE_SIZE = 15;

function generateCustomerCode(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(3).toString("hex").substring(0, 4).toUpperCase();
  return `CUS-${date}-${random}`;
}

/**
 * GET /api/custom — 客户列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const region = searchParams.get("region") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { shortName: { contains: search } },
        { contactPerson: { contains: search } },
      ];
    }

    if (region) {
      where.region = region;
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.customer.count({ where }),
    ]);

    return apiSuccessResponse({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("获取客户列表失败:", error);
    return apiErrorResponse(500, "获取客户列表失败");
  }
}

/**
 * POST /api/custom — 创建客户
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = customerSchema.omit({ code: true }).safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse(400, parsed.error.issues[0]?.message || "参数错误");
    }

    // 生成唯一编码（冲突时重试一次）
    let code = generateCustomerCode();
    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) code = generateCustomerCode();

    const customer = await prisma.customer.create({
      data: { ...parsed.data, code, updatedBy: "public" },
    });

  await auditLog({ action: "CREATE", entity: "Customer", entityId: customer.id, detail: `创建客户: ${customer.name || customer.code || ''}`, operator: "public" });
    return apiSuccessResponse(customer, 201);
  } catch (error) {
    console.error("创建客户失败:", error);
    return apiErrorResponse(500, "创建客户失败");
  }
}
