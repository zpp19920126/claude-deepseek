import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { ApiError } from "@/lib/api-error";
import { createSalesOrderSchema } from "@/lib/validations";
import {
  buildOrderNo,
  formatDateStr,
  parseOrderSeq,
  MAX_DAILY_SEQ,
} from "@/lib/order-number";
import type { PaginatedResponse } from "@/types";

// 销售单列表（分页 + 订单号/客户/状态/日期筛选）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 20)
    );

    const orderNo = searchParams.get("orderNo")?.trim();
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    const where: Prisma.SalesOrderWhereInput = {};
    if (orderNo) where.orderNo = { contains: orderNo };
    if (customerId) where.customerId = Number(customerId);
    if (status) where.status = status;
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) {
      // 结束日期包含当天，转为当天 23:59:59
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object), lte: end };
    }

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, shortName: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    const result: PaginatedResponse<typeof items[number]> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取销售单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售单列表失败" },
      { status: 500 }
    );
  }
}

// 在事务内创建销售单（生成订单号 + 校验 + 主从表写入）
async function createOrderInTransaction(
  data: { customerId: number; remark?: string | null; items: { productId: number; quantity: number; price: number }[] },
  userId: number
) {
  // 订单号并发兜底：unique 约束冲突（P2002）时由调用方重试
  const dateStr = formatDateStr(new Date());

  // 查询当天最大订单号（事务内串行 await，避免 SQLite 单连接死锁）
  const last = await prisma.salesOrder.findFirst({
    where: { orderNo: { startsWith: `SO-${dateStr}-` } },
    orderBy: { orderNo: "desc" },
  });
  const seq = last ? parseOrderSeq(last.orderNo, "SO", dateStr) + 1 : 1;
  if (seq > MAX_DAILY_SEQ) {
    throw new ApiError("当日订单数量已达上限", 400);
  }
  const orderNo = buildOrderNo("SO", new Date(), seq);

  // 校验客户存在
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new ApiError("客户不存在", 400);
  }

  // 校验商品存在（去重后数量一致）
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    throw new ApiError("部分商品不存在", 400);
  }

  const totalAmount = Number(
    data.items
      .reduce((sum, i) => sum + i.quantity * i.price, 0)
      .toFixed(2)
  );

  // 明细行补充服务端计算的 subtotal
  const itemData = data.items.map((i) => ({
    ...i,
    subtotal: Number((i.quantity * i.price).toFixed(2)),
  }));

  return prisma.salesOrder.create({
    data: {
      orderNo,
      customerId: data.customerId,
      userId,
      totalAmount,
      remark: data.remark ?? null,
      items: { create: itemData },
    },
  });
}

// 创建销售单
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createSalesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    // 订单号冲突时重试（最多 3 次）
    let order;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        order = await prisma.$transaction(
          () => createOrderInTransaction(parsed.data, auth.userId),
          { timeout: 10000 }
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue; // 订单号并发冲突，重试
        }
        throw error;
      }
    }
    if (!order) {
      throw new ApiError("创建失败，请重试", 409);
    }

    await logOperation({
      action: "create",
      module: "sales",
      targetId: order.id,
      detail: {
        orderNo: order.orderNo,
        totalAmount: order.totalAmount,
        itemCount: parsed.data.items.length,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "销售单创建成功",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    // SQLite 锁冲突（交互式事务超时/锁定）
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2028" || error.code === "P1008")
    ) {
      return NextResponse.json(
        { success: false, error: "系统繁忙，请重试" },
        { status: 500 }
      );
    }
    console.error("创建销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建销售单失败" },
      { status: 500 }
    );
  }
}
