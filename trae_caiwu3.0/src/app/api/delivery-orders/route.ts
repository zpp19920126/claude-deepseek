import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createDeliveryOrderSchema } from "@/lib/validations";
import { generateDeliveryOrderNo } from "@/lib/order-no";
import type { PaginatedResponse } from "@/types";

// 获取配送单列表（分页 + 搜索 orderNo）
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

    const where = search ? { orderNo: { contains: search } } : undefined;

    const [orders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        include: {
          items: {
            select: {
              deliveryQuantity: true,
              unitPrice: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.deliveryOrder.count({ where }),
    ]);

    const items = orders.map((o) => {
      const itemCount = o.items.length;
      const totalDeliveryQty = o.items.reduce(
        (s, i) => s + i.deliveryQuantity,
        0
      );
      const totalAmount = o.items.reduce(
        (s, i) => s + i.deliveryQuantity * i.unitPrice,
        0
      );
      return {
        id: o.id,
        orderNo: o.orderNo,
        status: o.status,
        remark: o.remark,
        createdAt: o.createdAt,
        itemCount,
        totalDeliveryQty,
        totalAmount,
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
    console.error("获取配送单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配送单列表失败" },
      { status: 500 }
    );
  }
}

// 创建配送单（含明细），自动生成单据编号
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
    const parsed = createDeliveryOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { status, remark, items } = parsed.data;

    // 事务内生成编号 + 创建单据；P2002 时重试
    let created: Prisma.DeliveryOrderGetPayload<{
      include: { items: true };
    }> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const orderNo = await generateDeliveryOrderNo(tx);
          return tx.deliveryOrder.create({
            data: {
              orderNo,
              userId: user.id,
              status,
              remark: remark ?? null,
              items: {
                create: items.map((it) => ({
                  productId: it.productId,
                  reservedUnitId: it.reservedUnitId,
                  reservedQuantity: it.reservedQuantity,
                  deliveryUnitId: it.deliveryUnitId,
                  deliveryQuantity: it.deliveryQuantity,
                  receivedQuantity: it.receivedQuantity,
                  unitPrice: it.unitPrice,
                })),
              },
            },
            include: { items: true },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue; // 编号冲突，重试
        }
        throw err;
      }
    }

    await logOperation({
      action: "create",
      module: "delivery_order",
      targetId: created!.id,
      detail: {
        orderNo: created!.orderNo,
        itemCount: items.length,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "配送单创建成功",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "单据编号生成冲突，请重试" },
        { status: 409 }
      );
    }
    console.error("创建配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建配送单失败" },
      { status: 500 }
    );
  }
}
