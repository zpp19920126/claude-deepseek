import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";

// 导出单位列表为 Excel
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const units = await prisma.unit.findMany({
      orderBy: { createdAt: "asc" },
    });

    // 构建导出数据
    const exportData = units.map((unit, index) => ({
      序号: index + 1,
      单位编码: unit.code,
      单位名称: unit.name,
      添加时间: unit.createdAt.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    ws["!cols"] = [
      { wch: 8 },  // 序号
      { wch: 14 }, // 单位编码
      { wch: 14 }, // 单位名称
      { wch: 22 }, // 添加时间
    ];

    XLSX.utils.book_append_sheet(wb, ws, "基本单位");

    // 生成 Excel 文件 buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 记录导出日志
    await logOperation({
      action: "export",
      module: "unit",
      detail: { exportCount: units.length, format: "xlsx" },
      ipAddress: getClientIP(request),
    });

    // 返回文件下载响应
    const fileName = encodeURIComponent(
      `基本单位列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
    console.error("导出单位列表失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
