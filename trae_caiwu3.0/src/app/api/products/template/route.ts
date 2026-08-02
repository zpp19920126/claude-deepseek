import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// 下载导入模板
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // 预加载分类、单位、供应商，作为模板的示例数据
    const [categories, units, suppliers] = await Promise.all([
      prisma.category.findMany({ take: 5 }),
      prisma.unit.findMany({ take: 5 }),
      prisma.supplier.findMany({ take: 5 }),
    ]);

    const sampleData = [
      {
        商品编码: "P001",
        商品名称: "白菜",
        商品简称: "白菜",
        商品分类: categories[0]?.name || "叶菜类",
        基本单位: units[0]?.name || "斤",
        默认供应商: suppliers[0]?.name || "",
        销售价: 2.5,
        进货价: 1.8,
        最低库存: 50,
        状态: "在售",
        备注: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws["!cols"] = [
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 8 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "商品导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = encodeURIComponent("商品导入模板.xlsx");

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
