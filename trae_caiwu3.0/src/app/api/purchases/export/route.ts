import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS } from "@/types";

// 批量导出进货单（跟随搜索过滤）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const orders = await prisma.purchaseOrder.findMany({
      where: search
        ? {
            OR: [
              { orderNo: { contains: search } },
              { supplier: { OR: [{ name: { contains: search } }, { code: { contains: search } }] } },
              { items: { some: { product: { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } } } },
            ],
          }
        : undefined,
      include: {
        supplier: { select: { code: true, name: true } },
        items: {
          include: {
            product: { select: { sku: true, name: true } },
            reservedUnit: { select: { name: true } },
            receivedUnit: { select: { name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 展开为每行一个商品项
    const rows = orders.flatMap((o) =>
      o.items.map((it) => ({
        进货单编号: o.orderNo,
        供应商编码: o.supplier.code,
        供应商名称: o.supplier.name,
        商品编码: it.product.sku,
        商品名称: it.product.name,
        预定单位: it.reservedUnit.name,
        预定数量: it.reservedQuantity,
        实收单位: it.receivedUnit.name,
        实收数量: it.receivedQuantity,
        单价: it.unitPrice,
        预定金额: formatCurrency(it.reservedQuantity * it.unitPrice),
        实收金额: formatCurrency(it.receivedQuantity * it.unitPrice),
        状态: (PURCHASE_ORDER_STATUS as Record<string, string>)[o.status] || o.status,
        备注: o.remark || "",
        更新时间: formatDateTime(o.updatedAt),
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "进货单");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `进货单列表_${new Date().toISOString().slice(0, 10)}.xlsx`;

    await logOperation({
      action: "export",
      module: "purchase",
      detail: { count: rows.length, search },
      ipAddress: getClientIP(request),
    });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("导出进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
