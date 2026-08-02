import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载客户导入模板
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        客户编码: "K001",
        客户名称: "阳光餐饮店",
        客户简称: "阳光",
        联系人: "王老板",
        电话: "13800138001",
        地址: "城东区美食街12号",
      },
      {
        客户编码: "K002",
        客户名称: "好运饭店",
        客户简称: "好运",
        联系人: "李经理",
        电话: "13800138002",
        地址: "城南区商业路88号",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws["!cols"] = [
      { wch: 14 },  // 客户编码
      { wch: 20 },  // 客户名称
      { wch: 14 },  // 客户简称
      { wch: 12 },  // 联系人
      { wch: 16 },  // 电话
      { wch: 30 },  // 地址
    ];

    XLSX.utils.book_append_sheet(wb, ws, "客户导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = encodeURIComponent("客户导入模板.xlsx");

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
