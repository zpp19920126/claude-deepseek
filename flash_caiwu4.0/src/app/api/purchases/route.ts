import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { ApiError } from "@/lib/api-error";
import { createPurchaseOrderSchema } from "@/lib/validations";
import {
  buildOrderNo,
  formatDateStr,
  parseOrderSeq,
  MAX_DAILY_SEQ,
} from "@/lib/order-number";
import type { PaginatedResponse } from "@/types";

// 进货单列表（分页 + 订单号/供应商/状态/日期筛选）
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
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (orderNo) where.orderNo = { contains: orderNo };
    if (supplierId) where.supplierId = Number(supplierId);
    if (status) where.status = status;
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as object), lte: end };
    }

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, shortName: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
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
    console.error("获取进货单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取进货单列表失败" },
      { status: 500 }
    );
  }
}

// 在事务内创建进货单（生成订单号 + 校验 + 主从表写入）
async function createOrderInTransaction(
  data: { supplierId: number; remark?: string | null; items: { productId: number; quantity: number; cost: number }[] },
  userId: number
) {
  const dateStr = formatDateStr(new Date());

  const last = await prisma.purchaseOrder.findFirst({
    where: { orderNo: { startsWith: `PO-${dateStr}-` } },
    orderBy: { orderNo: "desc" },
  });
  const seq = last ? parseOrderSeq(last.orderNo, "PO", dateStr) + 1 : 1;
  if (seq > MAX_DAILY_SEQ) {
    throw new ApiError("当日订单数量已达上限", 400);
  }
  const orderNo = buildOrderNo("PO", new Date(), seq);

  // 校验供应商存在
  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
    select: { id: true },
  });
  if (!supplier) {
    throw new ApiError("供应商不存在", 400);
  }

  // 校验商品存在
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
      .reduce((sum, i) => sum + i.quantity * i.cost, 0)
      .toFixed(2)
  );

  // 明细行补充服务端计算的 subtotal
  const itemData = data.items.map((i) => ({
    ...i,
    subtotal: Number((i.quantity * i.cost).toFixed(2)),
  }));

  return prisma.purchaseOrder.create({
    data: {
      orderNo,
      supplierId: data.supplierId,
      userId,
      totalAmount,
      remark: data.remark ?? null,
      items: { create: itemData },
    },
  });
}

// 创建进货单
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = createPurchaseOrderSchema.safeParse(body);
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
          continue;
        }
        throw error;
      }
    }
    if (!order) {
      throw new ApiError("创建失败，请重试", 409);
    }

    await logOperation({
      action: "create",
      module: "purchase",
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
      message: "进货单创建成功",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2028" || error.code === "P1008")
    ) {
      return NextResponse.json(
        { success: false, error: "系统繁忙，请重试" },
        { status: 500 }
      );
    }
    console.error("创建进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建进货单失败" },
      { status: 500 }
    );
  }
}
