import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

const PAGE_SIZE = 15;

function generateSupplierCode(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(3).toString("hex").substring(0, 4).toUpperCase();
  return `SUP-${date}-${random}`;
}

/**
 * GET /api/supplier — 供应商列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const region = searchParams.get("region") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.SupplierWhereInput = {};

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
      prisma.supplier.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.supplier.count({ where }),
    ]);

    return apiSuccessResponse({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("获取供应商列表失败:", error);
    return apiErrorResponse(500, "获取供应商列表失败");
  }
}

/**
 * POST /api/supplier — 创建供应商
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, shortName, pinyin, contactPerson, phone, mobile, email, address, orderStartTime, orderStopTime } = body;

    if (!name) {
      return apiErrorResponse(400, "单位名称不能为空");
    }

    // 生成唯一编码（冲突时重试一次）
    let code = generateSupplierCode();
    const existing = await prisma.supplier.findUnique({ where: { code } });
    if (existing) code = generateSupplierCode();

    const supplier = await prisma.supplier.create({
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
        orderStartTime: orderStartTime || null,
        orderStopTime: orderStopTime || null,
        updatedBy: "public",
      },
    });

    return apiSuccessResponse(supplier, 201);
  } catch (error) {
    console.error("创建供应商失败:", error);
    return apiErrorResponse(500, "创建供应商失败");
  }
}
