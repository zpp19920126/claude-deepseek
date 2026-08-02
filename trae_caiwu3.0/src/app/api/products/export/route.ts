import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";

// 批量导出商品列表为 Excel（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        unit: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData = products.map((p, index) => ({
      序号: index + 1,
      商品编码: p.sku,
      商品名称: p.name,
      商品简称: p.shortName || "",
      商品分类: p.category.name,
      基本单位: p.unit.name,
      默认供应商: p.supplier?.name || "",
      销售价: p.price,
      进货价: p.cost,
      当前库存: p.stock,
      最低库存: p.minStock,
      状态: p.status === "active" ? "在售" : "停售",
      备注: p.remark || "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "商品列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "product",
      detail: { exportCount: products.length, format: "xlsx" },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `商品列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    console.error("导出商品列表失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
