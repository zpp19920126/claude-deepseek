import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";

// 导出销售单列表为 Excel（仅管理员）
// 每行 = 一个销售单，含三种聚合金额
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: {
          select: { code: true, name: true, shortName: true },
        },
        deliveryOrder: {
          select: {
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
    });

    const exportData: Record<string, unknown>[] = orders.map((o, i) => {
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
        序号: i + 1,
        销售单编码: o.salesNo,
        客户编码: o.customer.code,
        客户名称: o.customer.name,
        客户简称: o.customer.shortName || "",
        单据编号: o.deliveryOrder.orderNo,
        单据金额: formatCurrency(orderAmount),
        预定金额: formatCurrency(reservedAmount),
        配送金额: formatCurrency(deliveryAmount),
        状态:
          DELIVERY_ORDER_STATUS[
            o.deliveryOrder.status as keyof typeof DELIVERY_ORDER_STATUS
          ] || o.deliveryOrder.status,
        备注: o.remark || "",
        添加时间: formatDateTime(o.createdAt),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "销售单列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "sales_order",
      detail: {
        orderCount: orders.length,
        format: "xlsx",
      },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `销售单列表_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("导出销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
