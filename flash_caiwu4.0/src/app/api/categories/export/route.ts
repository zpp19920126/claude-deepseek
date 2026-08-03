import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatDateTime } from "@/lib/utils";

// 导出分类列表为 Excel（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const exportData = categories.map((cat, index) => ({
      序号: index + 1,
      分类编码: cat.code,
      分类名称: cat.name,
      分类简称: cat.shortName || "",
      排序: cat.sortOrder,
      添加时间: formatDateTime(cat.createdAt),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws["!cols"] = [
      { wch: 8 },  // 序号
      { wch: 14 }, // 分类编码
      { wch: 18 }, // 分类名称
      { wch: 14 }, // 分类简称
      { wch: 8 },  // 排序
      { wch: 22 }, // 添加时间
    ];

    XLSX.utils.book_append_sheet(wb, ws, "商品分类");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "category",
      detail: { exportCount: categories.length, format: "xlsx" },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `商品分类列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    console.error("导出分类列表失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
