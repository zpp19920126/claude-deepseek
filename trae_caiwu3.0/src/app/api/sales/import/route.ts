import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { generateSalesOrderNo } from "@/lib/order-no";

const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_EXT = [".xlsx", ".xls"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

class ImportRowError extends Error {
  constructor(
    public row: number,
    message: string
  ) {
    super(message);
    this.name = "ImportRowError";
  }
}

type ParsedRow = {
  orderNo: string;
  customerCode: string;
  remark: string;
  rowIndex: number;
};

// 批量导入销售单（POST 上传 Excel 文件，仅管理员）
// Excel 列：单据编号 | 客户编码 | 备注
// 系统按"单据编号"匹配配送单 orderNo，按"客户编码"匹配客户，自动创建销售单（1:1 绑定）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传文件" },
        { status: 400 }
      );
    }

    // 文件类型与大小校验（ext 必须合法；mime 若提供也必须合法）
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const mimeOk = ALLOWED_MIME.includes(file.type);
    const extOk = ALLOWED_EXT.includes(ext);
    if (!extOk || (file.type && !mimeOk)) {
      return NextResponse.json(
        { success: false, error: "仅支持 .xlsx / .xls 格式文件" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "文件大小不能超过 5MB" },
        { status: 400 }
      );
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "文件中没有数据" },
        { status: 400 }
      );
    }

    // 逐行解析 + 校验
    const errors: { row: number; error: string }[] = [];
    const parsedRows: ParsedRow[] = [];
    // 文件内 orderNo 唯一性校验
    const seenOrderNo = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      const orderNo = String(row["单据编号"] || "").trim();
      const customerCode = String(row["客户编码"] || "").trim();
      const remark = String(row["备注"] || "").trim();

      if (!orderNo) {
        errors.push({ row: rowIndex, error: "单据编号不能为空" });
        continue;
      }
      if (!customerCode) {
        errors.push({ row: rowIndex, error: "客户编码不能为空" });
        continue;
      }

      // 文件内 orderNo 重复校验
      if (seenOrderNo.has(orderNo)) {
        errors.push({
          row: rowIndex,
          error: `单据编号"${orderNo}"在文件内重复`,
        });
        continue;
      }
      seenOrderNo.add(orderNo);

      if (remark.length > 500) {
        errors.push({ row: rowIndex, error: "备注最长 500 字符" });
        continue;
      }

      parsedRows.push({ orderNo, customerCode, remark, rowIndex });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `校验失败：${errors.length} 条数据有误，已中止导入（无数据落库）`,
        data: { imported: 0, errors: errors.slice(0, 50) },
      });
    }

    // 预查配送单（按 orderNo 批量查询）+ 客户（按 code 批量查询）
    const orderNos = [...new Set(parsedRows.map((r) => r.orderNo))];
    const customerCodes = [...new Set(parsedRows.map((r) => r.customerCode))];
    const [deliveryOrders, customers] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where: { orderNo: { in: orderNos } },
        select: { id: true, orderNo: true },
      }),
      prisma.customer.findMany({
        where: { code: { in: customerCodes } },
        select: { id: true, code: true },
      }),
    ]);
    const deliveryMap = new Map(
      deliveryOrders.map((d) => [d.orderNo, d] as const)
    );
    const customerMap = new Map(customers.map((c) => [c.code, c.id] as const));

    // 校验配送单 + 客户存在性
    for (const r of parsedRows) {
      if (!deliveryMap.has(r.orderNo)) {
        errors.push({
          row: r.rowIndex,
          error: `单据编号"${r.orderNo}"对应的配送单不存在`,
        });
      }
      if (!customerMap.has(r.customerCode)) {
        errors.push({
          row: r.rowIndex,
          error: `客户编码"${r.customerCode}"不存在`,
        });
      }
    }
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `校验失败：${errors.length} 条数据有误，已中止导入（无数据落库）`,
        data: { imported: 0, errors: errors.slice(0, 50) },
      });
    }

    // 事务内创建
    let imported = 0;
    let txError: { row: number; error: string } | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        for (const r of parsedRows) {
          try {
            const salesNo = await generateSalesOrderNo(tx);
            const delivery = deliveryMap.get(r.orderNo)!;
            const customerId = customerMap.get(r.customerCode)!;
            await tx.salesOrder.create({
              data: {
                salesNo,
                deliveryOrderId: delivery.id,
                customerId,
                userId: user.id,
                remark: r.remark || null,
              },
            });
            imported++;
          } catch (err) {
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
                ? (err.meta?.target as string[] | undefined)?.[0] ===
                    "deliveryOrderId"
                  ? `配送单"${r.orderNo}"已存在销售单`
                  : "销售单编号生成冲突"
                : err instanceof Error
                  ? err.message
                  : "处理失败";
            throw new ImportRowError(r.rowIndex, msg);
          }
        }
      });
    } catch (err) {
      imported = 0;
      txError =
        err instanceof ImportRowError
          ? { row: err.row, error: err.message }
          : { row: 0, error: "事务执行失败" };
    }

    await logOperation({
      action: "import",
      module: "sales_order",
      detail: {
        imported,
        errorCount: txError ? 1 : 0,
        fileName: file.name,
      },
      ipAddress: getClientIP(request),
    });

    if (txError) {
      return NextResponse.json({
        success: false,
        message: `导入失败：第 ${txError.row} 行 ${txError.error}，事务已回滚，无数据落库`,
        data: { imported: 0, errors: [txError] },
      });
    }

    return NextResponse.json({
      success: true,
      message: `导入完成：新增 ${imported} 个销售单`,
      data: { imported, errors: [] },
    });
  } catch (error) {
    console.error("批量导入销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "批量导入失败" },
      { status: 500 }
    );
  }
}
