import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";

// 导出配送单列表为 Excel（仅管理员）
// 每行 = 一个明细行
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const orders = await prisma.deliveryOrder.findMany({
      include: {
        customer: { select: { code: true, name: true } },
        items: {
          include: {
            product: { select: { sku: true, name: true } },
            reservedUnit: { select: { name: true } },
            deliveryUnit: { select: { name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData: Record<string, unknown>[] = [];
    let seq = 1;
    for (const o of orders) {
      for (const it of o.items) {
        exportData.push({
          序号: seq++,
          单据编号: o.orderNo,
          客户编码: o.customer.code,
          客户名称: o.customer.name,
          商品编码: it.product.sku,
          商品名称: it.product.name,
          预定单位: it.reservedUnit.name,
          预定数量: it.reservedQuantity,
          配送单位: it.deliveryUnit.name,
          配送数量: it.deliveryQuantity,
          实收数量: it.receivedQuantity,
          单价: it.unitPrice,
          小计: it.deliveryQuantity * it.unitPrice,
          状态:
            DELIVERY_ORDER_STATUS[
              o.status as keyof typeof DELIVERY_ORDER_STATUS
            ] || o.status,
          添加时间: formatDateTime(o.createdAt),
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "配送单列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "delivery_order",
      detail: {
        orderCount: orders.length,
        rowCount: exportData.length,
        format: "xlsx",
      },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `配送单列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    console.error("导出配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
