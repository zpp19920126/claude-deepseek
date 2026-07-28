import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
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
    const { name, shortName, pinyin, contactPerson, phone, mobile, email, address } = body;

    if (!name) {
      return apiErrorResponse(400, "单位名称不能为空");
    }

    const code = generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        code,
        name,
        shortName: shortName || null,
        pinyin: pinyin || null,
        contactPerson: contactPerson || null,
        phone: phone || null,
        mobile: mobile || null,
        email: email || null,
        address: address || null,
      },
    });

    return apiSuccessResponse(customer, 201);
  } catch (error) {
    console.error("创建客户失败:", error);
    return apiErrorResponse(500, "创建客户失败");
  }
}
