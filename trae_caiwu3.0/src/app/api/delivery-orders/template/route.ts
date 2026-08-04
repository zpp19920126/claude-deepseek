import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载配送单导入模板
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        单据分组: "组1",
        商品编码: "VG-001",
        预定单位: "斤",
        预定数量: 100,
        配送单位: "斤",
        配送数量: 100,
        实收数量: 100,
        单价: 2.5,
        备注: "首批配送",
      },
      {
        单据分组: "组1",
        商品编码: "VG-008",
        预定单位: "斤",
        预定数量: 50,
        配送单位: "斤",
        配送数量: 50,
        实收数量: 48,
        单价: 4.5,
        备注: "",
      },
      {
        单据分组: "组2",
        商品编码: "VG-005",
        预定单位: "斤",
        预定数量: 200,
        配送单位: "公斤",
        配送数量: 100,
        实收数量: 0,
        单价: 2.0,
        备注: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "配送单导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = encodeURIComponent("配送单导入模板.xlsx");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("下载模板失败:", error);
    return NextResponse.json(
      { success: false, error: "下载模板失败" },
      { status: 500 }
    );
  }
}
