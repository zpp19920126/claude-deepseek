import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createSalesOrderSchema } from "@/lib/validations";
import { generateSalesOrderNo } from "@/lib/order-no";
import type { PaginatedResponse } from "@/types";

// 获取销售单列表（分页 + 搜索 salesNo）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 20)
    );

    const where = search ? { salesNo: { contains: search } } : undefined;

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, code: true, shortName: true },
          },
          deliveryOrder: {
            select: {
              id: true,
              orderNo: true,
              status: true,
              items: {
                select: {
                  reservedQuantity: true,
                  deliveryQuantity: true,
                  receivedQuantity: true,
                  unitPrice: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    const items = orders.map((o) => {
      const orderAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.receivedQuantity * it.unitPrice,
        0
      );
      const reservedAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.reservedQuantity * it.unitPrice,
        0
      );
      const deliveryAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.deliveryQuantity * it.unitPrice,
        0
      );
      return {
        id: o.id,
        salesNo: o.salesNo,
        deliveryOrderId: o.deliveryOrderId,
        deliveryOrderNo: o.deliveryOrder.orderNo,
        deliveryStatus: o.deliveryOrder.status,
        customerId: o.customerId,
        customerCode: o.customer.code,
        customerName: o.customer.name,
        customerShortName: o.customer.shortName,
        orderAmount,
        reservedAmount,
        deliveryAmount,
        remark: o.remark,
        createdAt: o.createdAt,
      };
    });

    const result: PaginatedResponse<(typeof items)[number]> = {
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

// 创建销售单（1:1 绑定配送单，自动生成 salesNo）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

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

    const { deliveryOrderId, customerId, remark } = parsed.data;

    // 校验配送单存在
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      select: { id: true, orderNo: true },
    });
    if (!deliveryOrder) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    // 校验客户存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    });
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "客户不存在" },
        { status: 404 }
      );
    }

    // 事务内生成编号 + 创建销售单；P2002 时重试
    let created: Prisma.SalesOrderGetPayload<{}> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const salesNo = await generateSalesOrderNo(tx);
          return tx.salesOrder.create({
            data: {
              salesNo,
              deliveryOrderId,
              customerId,
              userId: user.id,
              remark: remark ?? null,
            },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue; // 编号或 deliveryOrderId 冲突，重试
        }
        throw err;
      }
    }

    await logOperation({
      action: "create",
      module: "sales_order",
      targetId: created!.id,
      detail: {
        salesNo: created!.salesNo,
        deliveryOrderId,
        deliveryOrderNo: deliveryOrder.orderNo,
        customerId,
        customerName: customer.name,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "销售单创建成功",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // 判断是 salesNo 冲突还是 deliveryOrderId 冲突
      const target =
        (error.meta?.target as string[] | undefined)?.[0] === "deliveryOrderId"
          ? "该配送单已存在销售单"
          : "销售单编号生成冲突，请重试";
      return NextResponse.json(
        { success: false, error: target },
        { status: 409 }
      );
    }
    console.error("创建销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建销售单失败" },
      { status: 500 }
    );
  }
}
