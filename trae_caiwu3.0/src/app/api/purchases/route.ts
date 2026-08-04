import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { generatePurchaseOrderNo } from "@/lib/order-no";
import { createPurchaseOrderSchema } from "@/lib/validations";
import type { PaginatedResponse } from "@/types";

// 获取进货单列表（分页 + 多字段搜索）
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

    // 多字段 OR 搜索：orderNo、supplier.name、supplier.code、product.name、product.sku
    const where = search
      ? {
          OR: [
            { orderNo: { contains: search } },
            { supplier: { OR: [{ name: { contains: search } }, { code: { contains: search } }] } },
            { items: { some: { product: { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } } } },
          ],
        }
      : undefined;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              reservedUnit: { select: { id: true, name: true } },
              receivedUnit: { select: { id: true, name: true } },
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // 聚合金额
    const items = orders.map((o) => {
      const reservedAmount = o.items.reduce(
        (s, it) => s + it.reservedQuantity * it.unitPrice,
        0
      );
      const receivedAmount = o.items.reduce(
        (s, it) => s + it.receivedQuantity * it.unitPrice,
        0
      );
      return {
        id: o.id,
        orderNo: o.orderNo,
        supplierId: o.supplierId,
        supplierCode: o.supplier.code,
        supplierName: o.supplier.name,
        status: o.status,
        remark: o.remark,
        items: o.items,
        reservedAmount,
        receivedAmount,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
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
    console.error("获取进货单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取进货单列表失败" },
      { status: 500 }
    );
  }
}

// 创建进货单（事务内生成编号 + 创建主表 + 明细）
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

    const { supplierId, status, remark, items } = parsed.data;

    // 校验供应商存在
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "供应商不存在" },
        { status: 404 }
      );
    }

    // 事务内生成编号 + 创建
    let created: Prisma.PurchaseOrderGetPayload<{}> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const orderNo = await generatePurchaseOrderNo(tx);
          return tx.purchaseOrder.create({
            data: {
              orderNo,
              supplierId,
              userId: user.id,
              status,
              remark: remark ?? null,
              items: {
                create: items.map((it) => ({
                  productId: it.productId,
                  reservedQuantity: it.reservedQuantity,
                  receivedQuantity: it.receivedQuantity,
                  reservedUnitId: it.reservedUnitId,
                  receivedUnitId: it.receivedUnitId,
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
          continue;
        }
        throw err;
      }
    }

    await logOperation({
      action: "create",
      module: "purchase",
      targetId: created!.id,
      detail: {
        orderNo: created!.orderNo,
        supplierId,
        itemCount: items.length,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "进货单创建成功",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "进货单编号生成冲突，请重试" },
        { status: 409 }
      );
    }
    console.error("创建进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建进货单失败" },
      { status: 500 }
    );
  }
}
