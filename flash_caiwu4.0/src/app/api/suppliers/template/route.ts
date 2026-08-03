import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载供应商导入模板
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        供应商编码: "G001",
        供应商名称: "绿源蔬菜批发",
        供应商简称: "绿源",
        联系人: "孙老板",
        电话: "13900139001",
        地址: "农批市场A区10号",
      },
      {
        供应商编码: "G002",
        供应商名称: "丰收农产",
        供应商简称: "丰收",
        联系人: "周经理",
        电话: "13900139002",
        地址: "农批市场B区25号",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws["!cols"] = [
      { wch: 14 },  // 供应商编码
      { wch: 20 },  // 供应商名称
      { wch: 14 },  // 供应商简称
      { wch: 12 },  // 联系人
      { wch: 16 },  // 电话
      { wch: 30 },  // 地址
    ];

    XLSX.utils.book_append_sheet(wb, ws, "供应商导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = encodeURIComponent("供应商导入模板.xlsx");

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
