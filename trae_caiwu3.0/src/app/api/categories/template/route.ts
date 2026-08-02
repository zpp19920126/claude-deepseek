import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载分类导入模板
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        分类编码: "C001",
        分类名称: "叶菜类",
        分类简称: "叶菜",
        排序: 1,
      },
      {
        分类编码: "C002",
        分类名称: "根茎类",
        分类简称: "根茎",
        排序: 2,
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws["!cols"] = [
      { wch: 14 }, // 分类编码
      { wch: 18 }, // 分类名称
      { wch: 14 }, // 分类简称
      { wch: 8 },  // 排序
    ];

    XLSX.utils.book_append_sheet(wb, ws, "分类导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = encodeURIComponent("商品分类导入模板.xlsx");

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
