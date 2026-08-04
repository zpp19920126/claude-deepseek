import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载导入模板
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const template = [
      {
        供应商编码: "S001",
        商品编码: "P001",
        预定单位: "斤",
        预定数量: 100,
        实收单位: "斤",
        实收数量: 98,
        单价: 5.5,
        备注: "示例数据",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "进货单导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("进货单导入模板.xlsx")}`,
      },
    });
  } catch (error) {
    console.error("下载进货单模板失败:", error);
    return NextResponse.json(
      { success: false, error: "下载模板失败" },
      { status: 500 }
    );
  }
}
