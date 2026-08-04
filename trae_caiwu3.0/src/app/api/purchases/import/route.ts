import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { generatePurchaseOrderNo } from "@/lib/order-no";

const ALLOWED_EXT = [".xlsx", ".xls"];
const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ParsedRow {
  supplierCode: string;
  productSku: string;
  reservedUnitName: string;
  reservedQuantity: number;
  receivedUnitName: string;
  receivedQuantity: number;
  unitPrice: number;
  remark: string;
  rowIndex: number;
}

class ImportRowError extends Error {
  constructor(public row: number, message: string) {
    super(message);
    this.name = "ImportRowError";
  }
}

// 批量导入进货单（POST 上传 Excel 文件，仅管理员）
// Excel 列：供应商编码 | 商品编码 | 预定单位 | 预定数量 | 实收单位 | 实收数量 | 单价 | 备注
// 每行一张进货单（一个供应商 + 一个商品项），编号由系统自动生成
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      const supplierCode = String(row["供应商编码"] || "").trim();
      const productSku = String(row["商品编码"] || "").trim();
      const reservedUnitName = String(row["预定单位"] || "").trim();
      const reservedQuantity = Number(row["预定数量"] || 0);
      const receivedUnitName = String(row["实收单位"] || "").trim();
      const receivedQuantity = Number(row["实收数量"] || 0);
      const unitPrice = Number(row["单价"] || 0);
      const remark = String(row["备注"] || "").trim();

      if (!supplierCode) {
        errors.push({ row: rowIndex, error: "供应商编码不能为空" });
        continue;
      }
      if (!productSku) {
        errors.push({ row: rowIndex, error: "商品编码不能为空" });
        continue;
      }
      if (!reservedUnitName) {
        errors.push({ row: rowIndex, error: "预定单位不能为空" });
        continue;
      }
      if (!receivedUnitName) {
        errors.push({ row: rowIndex, error: "实收单位不能为空" });
        continue;
      }

      if (Number.isNaN(reservedQuantity) || reservedQuantity < 0) {
        errors.push({ row: rowIndex, error: "预定数量必须为非负数" });
        continue;
      }
      if (Number.isNaN(receivedQuantity) || receivedQuantity < 0) {
        errors.push({ row: rowIndex, error: "实收数量必须为非负数" });
        continue;
      }
      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        errors.push({ row: rowIndex, error: "单价必须为非负数" });
        continue;
      }
      if (remark.length > 500) {
        errors.push({ row: rowIndex, error: "备注最长 500 字符" });
        continue;
      }

      parsedRows.push({
        supplierCode,
        productSku,
        reservedUnitName,
        reservedQuantity,
        receivedUnitName,
        receivedQuantity,
        unitPrice,
        remark,
        rowIndex,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `校验失败：${errors.length} 条数据有误，已中止导入（无数据落库）`,
        data: { imported: 0, errors: errors.slice(0, 50) },
      });
    }

    // 预查供应商、商品、单位
    const supplierCodes = [...new Set(parsedRows.map((r) => r.supplierCode))];
    const productSkus = [...new Set(parsedRows.map((r) => r.productSku))];
    const unitNames = [
      ...new Set([
        ...parsedRows.map((r) => r.reservedUnitName),
        ...parsedRows.map((r) => r.receivedUnitName),
      ]),
    ];

    const [suppliers, products, units] = await Promise.all([
      prisma.supplier.findMany({
        where: { code: { in: supplierCodes } },
        select: { id: true, code: true },
      }),
      prisma.product.findMany({
        where: { sku: { in: productSkus } },
        select: { id: true, sku: true },
      }),
      prisma.unit.findMany({
        where: { name: { in: unitNames } },
        select: { id: true, name: true },
      }),
    ]);

    const supplierMap = new Map(suppliers.map((s) => [s.code, s.id] as const));
    const productMap = new Map(products.map((p) => [p.sku, p.id] as const));
    const unitMap = new Map(units.map((u) => [u.name, u.id] as const));

    // 校验存在性
    for (const r of parsedRows) {
      if (!supplierMap.has(r.supplierCode)) {
        errors.push({
          row: r.rowIndex,
          error: `供应商编码"${r.supplierCode}"不存在`,
        });
      }
      if (!productMap.has(r.productSku)) {
        errors.push({
          row: r.rowIndex,
          error: `商品编码"${r.productSku}"不存在`,
        });
      }
      if (!unitMap.has(r.reservedUnitName)) {
        errors.push({
          row: r.rowIndex,
          error: `预定单位"${r.reservedUnitName}"不存在`,
        });
      }
      if (!unitMap.has(r.receivedUnitName)) {
        errors.push({
          row: r.rowIndex,
          error: `实收单位"${r.receivedUnitName}"不存在`,
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
            const supplierId = supplierMap.get(r.supplierCode)!;
            const productId = productMap.get(r.productSku)!;
            const reservedUnitId = unitMap.get(r.reservedUnitName)!;
            const receivedUnitId = unitMap.get(r.receivedUnitName)!;

            // 系统自动生成编号
            const orderNo = await generatePurchaseOrderNo(tx);

            await tx.purchaseOrder.create({
              data: {
                orderNo,
                supplierId,
                userId: user.id,
                status: "pending",
                remark: r.remark || null,
                items: {
                  create: [
                    {
                      productId,
                      reservedQuantity: r.reservedQuantity,
                      receivedQuantity: r.receivedQuantity,
                      reservedUnitId,
                      receivedUnitId,
                      unitPrice: r.unitPrice,
                    },
                  ],
                },
              },
            });
            imported++;
          } catch (err) {
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
                ? "进货单编号生成冲突"
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
      module: "purchase",
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
      message: `导入完成：新增 ${imported} 个进货单`,
      data: { imported, errors: [] },
    });
  } catch (error) {
    console.error("批量导入进货单失败:", error);
    return NextResponse.json(
      { success: false, error: "批量导入失败" },
      { status: 500 }
    );
  }
}
