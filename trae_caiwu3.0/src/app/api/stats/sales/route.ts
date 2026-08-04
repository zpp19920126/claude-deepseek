import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { statsDateRangeSchema } from "@/lib/validations";

// 销售统计：支持按日期范围查询，返回每日销售额和订单数
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    // H-4: 使用 zod 校验日期参数，防止非法输入
    const parsed = statsDateRangeSchema.safeParse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }
    const { startDate, endDate } = parsed.data;

    // 默认查询最近 30 天
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    const [orders, totalCount, customersCount] = await Promise.all([
      prisma.salesOrder.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          deliveryOrder: { status: { not: "cancelled" } },
        },
        select: {
          id: true,
          salesNo: true,
          createdAt: true,
          customerId: true,
          deliveryOrder: {
            select: {
              status: true,
              items: { select: { receivedQuantity: true, unitPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.salesOrder.count({
        where: {
          createdAt: { gte: start, lte: end },
          deliveryOrder: { status: { not: "cancelled" } },
        },
      }),
      prisma.customer.count(),
    ]);

    // 按日期聚合
    const dailyData = new Map<
      string,
      { date: string; amount: number; count: number }
    >();
    let totalAmount = 0;
    for (const o of orders) {
      const amount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.receivedQuantity * it.unitPrice,
        0
      );
      totalAmount += amount;
      const dateKey = o.createdAt.toISOString().slice(0, 10);
      const existing = dailyData.get(dateKey) || {
        date: dateKey,
        amount: 0,
        count: 0,
      };
      existing.amount += amount;
      existing.count += 1;
      dailyData.set(dateKey, existing);
    }

    return NextResponse.json({
      success: true,
      data: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        summary: {
          totalAmount,
          totalCount,
          avgAmount: totalCount > 0 ? totalAmount / totalCount : 0,
          customersCount,
        },
        daily: Array.from(dailyData.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      },
    });
  } catch (error) {
    console.error("获取销售统计失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售统计失败" },
      { status: 500 }
    );
  }
}
