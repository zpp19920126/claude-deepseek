import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// 仪表盘汇总统计：今日销售/进货、在售商品、客户/供应商数量、最近订单、库存预警
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const [
      todaySales,
      todayPurchases,
      lowStockProducts,
      recentSales,
      recentPurchases,
      totalProducts,
      totalCustomers,
      totalSuppliers,
    ] = await Promise.all([
      prisma.salesOrder.findMany({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
          deliveryOrder: { status: { not: "cancelled" } },
        },
        select: {
          id: true,
          salesNo: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          deliveryOrder: {
            select: {
              orderNo: true,
              status: true,
              items: { select: { receivedQuantity: true, unitPrice: true } },
            },
          },
        },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          createdAt: true,
          supplier: { select: { id: true, name: true } },
          items: { select: { receivedQuantity: true, unitPrice: true } },
        },
      }),
      prisma.product.findMany({
        where: {
          stock: { lte: prisma.product.fields.minStock },
          status: "active",
        },
        include: { unit: true },
        take: 10,
        orderBy: { stock: "asc" },
      }),
      prisma.salesOrder.findMany({
        include: {
          customer: { select: { id: true, name: true } },
          deliveryOrder: {
            select: {
              orderNo: true,
              status: true,
              items: { select: { receivedQuantity: true, unitPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.purchaseOrder.findMany({
        include: {
          supplier: true,
          items: { select: { receivedQuantity: true, unitPrice: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.product.count({ where: { status: "active" } }),
      prisma.customer.count(),
      prisma.supplier.count(),
    ]);

    const todaySalesAmount = todaySales.reduce(
      (sum, o) =>
        sum +
        o.deliveryOrder.items.reduce(
          (s, it) => s + it.receivedQuantity * it.unitPrice,
          0
        ),
      0
    );
    const todayPurchasesAmount = todayPurchases.reduce(
      (sum, o) =>
        sum +
        o.items.reduce((s, it) => s + it.receivedQuantity * it.unitPrice, 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        date: today.toISOString().slice(0, 10),
        summary: {
          todaySalesAmount,
          todaySalesCount: todaySales.length,
          todayPurchasesAmount,
          todayPurchasesCount: todayPurchases.length,
          totalProducts,
          totalCustomers,
          totalSuppliers,
        },
        recentSales: recentSales.map((o) => ({
          id: o.id,
          salesNo: o.salesNo,
          customerName: o.customer.name,
          orderNo: o.deliveryOrder.orderNo,
          status: o.deliveryOrder.status,
          amount: o.deliveryOrder.items.reduce(
            (s, it) => s + it.receivedQuantity * it.unitPrice,
            0
          ),
          createdAt: o.createdAt,
        })),
        recentPurchases: recentPurchases.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          supplierName: o.supplier.name,
          status: o.status,
          amount: o.items.reduce(
            (s, it) => s + it.receivedQuantity * it.unitPrice,
            0
          ),
          createdAt: o.createdAt,
        })),
        lowStockProducts: lowStockProducts.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          stock: p.stock,
          minStock: p.minStock,
          unit: p.unit.name,
        })),
      },
    });
  } catch (error) {
    console.error("获取仪表盘统计失败:", error);
    return NextResponse.json(
      { success: false, error: "获取仪表盘统计失败" },
      { status: 500 }
    );
  }
}
