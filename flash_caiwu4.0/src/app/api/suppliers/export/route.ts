import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatDateTime } from "@/lib/utils";

// 导出供应商列表为 Excel（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: "asc" },
    });

    const exportData = suppliers.map((s, index) => ({
      序号: index + 1,
      供应商编码: s.code,
      供应商名称: s.name,
      供应商简称: s.shortName || "",
      联系人: s.contact || "",
      电话: s.phone || "",
      地址: s.address || "",
      添加时间: formatDateTime(s.createdAt),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws["!cols"] = [
      { wch: 8 },   // 序号
      { wch: 14 },  // 供应商编码
      { wch: 20 },  // 供应商名称
      { wch: 14 },  // 供应商简称
      { wch: 12 },  // 联系人
      { wch: 16 },  // 电话
      { wch: 30 },  // 地址
      { wch: 22 },  // 添加时间
    ];

    XLSX.utils.book_append_sheet(wb, ws, "供应商列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "supplier",
      detail: { exportCount: suppliers.length, format: "xlsx" },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `供应商列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    console.error("导出供应商列表失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
