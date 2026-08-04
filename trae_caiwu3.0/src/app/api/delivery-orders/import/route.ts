import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { generateDeliveryOrderNo } from "@/lib/order-no";

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
  group: string;
  productSku: string;
  reservedUnitName: string;
  reservedQty: number;
  deliveryUnitName: string;
  deliveryQty: number;
  receivedQty: number;
  price: number;
  remark: string;
  rowIndex: number;
};

// 批量导入配送单（POST 上传 Excel 文件，仅管理员）
// Excel 列：单据分组 | 商品编码 | 预定单位 | 预定数量 | 配送单位 | 配送数量 | 实收数量 | 单价 | 备注
// 相同"单据分组"值的行归为一个配送单
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
    // 文件内单据分组 + 商品编码 唯一性
    const seenGroupProduct = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      const group = String(row["单据分组"] || "").trim();
      const productSku = String(row["商品编码"] || "").trim();
      const reservedUnitName = String(row["预定单位"] || "").trim();
      const deliveryUnitName = String(row["配送单位"] || "").trim();
      const remark = String(row["备注"] || "").trim();

      if (!group) {
        errors.push({ row: rowIndex, error: "单据分组不能为空" });
        continue;
      }
      if (!productSku) {
        errors.push({ row: rowIndex, error: "商品编码不能为空" });
        continue;
      }

      // 校验同一分组内商品不重复
      const gpKey = `${group}||${productSku}`;
      if (seenGroupProduct.has(gpKey)) {
        errors.push({
          row: rowIndex,
          error: `单据分组"${group}"内商品编码"${productSku}"重复`,
        });
        continue;
      }
      seenGroupProduct.add(gpKey);

      const reservedQty = Number(row["预定数量"]);
      const deliveryQty = Number(row["配送数量"]);
      const receivedQty = Number(row["实收数量"]);
      const price = Number(row["单价"]);

      if (!Number.isFinite(reservedQty) || reservedQty < 0) {
        errors.push({ row: rowIndex, error: "预定数量必须为非负数" });
        continue;
      }
      if (!Number.isFinite(deliveryQty) || deliveryQty < 0) {
        errors.push({ row: rowIndex, error: "配送数量必须为非负数" });
        continue;
      }
      if (!Number.isFinite(receivedQty) || receivedQty < 0) {
        errors.push({ row: rowIndex, error: "实收数量必须为非负数" });
        continue;
      }
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ row: rowIndex, error: "单价必须为非负数" });
        continue;
      }

      parsedRows.push({
        group,
        productSku,
        reservedUnitName,
        reservedQty,
        deliveryUnitName,
        deliveryQty,
        receivedQty,
        price,
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

    // 预查商品、单位映射
    const productSkus = [...new Set(parsedRows.map((r) => r.productSku))];
    const unitNames = [
      ...new Set([
        ...parsedRows.map((r) => r.reservedUnitName),
        ...parsedRows.map((r) => r.deliveryUnitName),
      ]),
    ].filter(Boolean);

    const [products, units] = await Promise.all([
      prisma.product.findMany({
        where: { sku: { in: productSkus } },
        select: { id: true, sku: true },
      }),
      prisma.unit.findMany({
        where: { name: { in: unitNames } },
        select: { id: true, name: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.sku, p.id] as const));
    const unitMap = new Map(units.map((u) => [u.name, u.id] as const));

    // 校验引用存在性
    for (const r of parsedRows) {
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
      if (!unitMap.has(r.deliveryUnitName)) {
        errors.push({
          row: r.rowIndex,
          error: `配送单位"${r.deliveryUnitName}"不存在`,
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

    // 按分组聚合
    const groupMap = new Map<string, ParsedRow[]>();
    for (const r of parsedRows) {
      if (!groupMap.has(r.group)) groupMap.set(r.group, []);
      groupMap.get(r.group)!.push(r);
    }

    // 事务内创建
    let imported = 0;
    let txError: { row: number; error: string } | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        for (const [group, groupRows] of groupMap) {
          try {
            const orderNo = await generateDeliveryOrderNo(tx);
            await tx.deliveryOrder.create({
              data: {
                orderNo,
                userId: user.id,
                status: "pending",
                remark: groupRows[0].remark || null,
                items: {
                  create: groupRows.map((r) => ({
                    productId: productMap.get(r.productSku)!,
                    reservedUnitId: unitMap.get(r.reservedUnitName)!,
                    reservedQuantity: r.reservedQty,
                    deliveryUnitId: unitMap.get(r.deliveryUnitName)!,
                    deliveryQuantity: r.deliveryQty,
                    receivedQuantity: r.receivedQty,
                    unitPrice: r.price,
                  })),
                },
              },
            });
            imported++;
          } catch (err) {
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
                ? "单据编号生成冲突"
                : err instanceof Error
                  ? err.message
                  : "处理失败";
            throw new ImportRowError(groupRows[0].rowIndex, msg);
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
      module: "delivery_order",
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
      message: `导入完成：新增 ${imported} 个配送单`,
      data: { imported, errors: [] },
    });
  } catch (error) {
    console.error("批量导入配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "批量导入失败" },
      { status: 500 }
    );
  }
}
