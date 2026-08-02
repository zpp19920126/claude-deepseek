import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createProductSchema } from "@/lib/validations";

// 允许的文件类型与大小限制
const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_EXT = [".xlsx", ".xls"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 事务内写入用的数据结构
interface ProductInput {
  sku: string;
  name: string;
  shortName: string | null;
  categoryId: number;
  unitId: number;
  supplierId: number | null;
  price: number;
  cost: number;
  minStock: number;
  status: "active" | "inactive";
  remark: string | null;
  rowIndex: number; // Excel 行号，用于错误定位
}

// 自定义错误：携带 Excel 行号，便于事务回滚后定位失败行
class ImportRowError extends Error {
  constructor(
    public row: number,
    message: string
  ) {
    super(message);
    this.name = "ImportRowError";
  }
}

// 批量导入商品（POST 上传 Excel 文件，仅管理员）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传文件" },
        { status: 400 }
      );
    }

    // I3: 服务端校验文件类型与大小
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const mimeOk = ALLOWED_MIME.includes(file.type);
    const extOk = ALLOWED_EXT.includes(ext);
    if (!mimeOk && !extOk) {
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

    // 读取 Excel 文件
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

    // 预加载分类、单位、供应商映射（按名称查找 ID）
    const [categories, units, suppliers] = await Promise.all([
      prisma.category.findMany(),
      prisma.unit.findMany(),
      prisma.supplier.findMany(),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.name, c.id]));
    const unitMap = new Map(units.map((u) => [u.name, u.id]));
    const supplierMap = new Map(suppliers.map((s) => [s.name, s.id]));

    // 检查现有 SKU
    const skus = rows
      .map((r) => String(r["商品编码"] || "").trim())
      .filter(Boolean);
    const existingProducts = await prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku));

    // I2: 事务前用 zod 逐行校验，收集有效数据与错误
    const validRows: ProductInput[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // Excel 行号（含表头）

      const sku = String(row["商品编码"] || "").trim();
      const name = String(row["商品名称"] || "").trim();
      const categoryName = String(row["商品分类"] || "").trim();
      const unitName = String(row["基本单位"] || "").trim();
      const supplierName = String(row["默认供应商"] || "").trim();
      const statusRaw = String(row["状态"] || "在售").trim();
      const status: "active" | "inactive" =
        statusRaw === "停售" ? "inactive" : "active";

      // 先映射关联实体名称到 ID
      const categoryId = categoryMap.get(categoryName);
      const unitId = unitMap.get(unitName);
      const supplierId = supplierName
        ? supplierMap.get(supplierName)
        : undefined;

      if (!categoryName) {
        errors.push({ row: rowIndex, error: "商品分类不能为空" });
        continue;
      }
      if (!unitName) {
        errors.push({ row: rowIndex, error: "基本单位不能为空" });
        continue;
      }
      if (!categoryId) {
        errors.push({
          row: rowIndex,
          error: `商品分类"${categoryName}"不存在`,
        });
        continue;
      }
      if (!unitId) {
        errors.push({
          row: rowIndex,
          error: `基本单位"${unitName}"不存在`,
        });
        continue;
      }
      if (supplierName && !supplierId) {
        errors.push({
          row: rowIndex,
          error: `供应商"${supplierName}"不存在`,
        });
        continue;
      }

      // 用 zod 校验所有字段（含数值范围与关联 ID 正数校验）
      const parsed = createProductSchema.safeParse({
        sku,
        name,
        shortName: String(row["商品简称"] || "").trim() || null,
        categoryId,
        unitId,
        supplierId: supplierId || null,
        price: Number(row["销售价"]),
        cost: Number(row["进货价"]),
        minStock: Number(row["最低库存"]),
        status,
        remark: String(row["备注"] || "").trim() || null,
      });

      if (!parsed.success) {
        errors.push({
          row: rowIndex,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        });
        continue;
      }

      validRows.push({
        sku: parsed.data.sku,
        name: parsed.data.name,
        shortName: parsed.data.shortName ?? null,
        categoryId: parsed.data.categoryId,
        unitId: parsed.data.unitId,
        supplierId: parsed.data.supplierId ?? null,
        price: parsed.data.price,
        cost: parsed.data.cost,
        minStock: parsed.data.minStock,
        status: parsed.data.status,
        remark: parsed.data.remark ?? null,
        rowIndex,
      });
    }

    // 若存在解析错误，直接返回，不进入事务
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `校验失败：${errors.length} 条数据有误，已中止导入（无数据落库）`,
        data: { imported: 0, updated: 0, errors: errors.slice(0, 50) },
      });
    }

    // I1: 用事务包裹，保证原子性（任一写入异常整体回滚）
    let imported = 0;
    let updated = 0;
    let txError: { row: number; error: string } | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of validRows) {
          try {
            if (existingSkuSet.has(item.sku)) {
              await tx.product.update({
                where: { sku: item.sku },
                data: {
                  name: item.name,
                  shortName: item.shortName,
                  categoryId: item.categoryId,
                  unitId: item.unitId,
                  supplierId: item.supplierId,
                  price: item.price,
                  cost: item.cost,
                  minStock: item.minStock,
                  status: item.status,
                  remark: item.remark,
                },
              });
              updated++;
            } else {
              await tx.product.create({
                data: {
                  sku: item.sku,
                  name: item.name,
                  shortName: item.shortName,
                  categoryId: item.categoryId,
                  unitId: item.unitId,
                  supplierId: item.supplierId,
                  price: item.price,
                  cost: item.cost,
                  minStock: item.minStock,
                  status: item.status,
                  remark: item.remark,
                },
              });
              existingSkuSet.add(item.sku);
              imported++;
            }
          } catch (err) {
            // I4: 识别 P2002 唯一约束冲突，转换为友好错误并携带行号
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
                ? `商品编码"${item.sku}"已存在（唯一约束冲突）`
                : err instanceof Error
                  ? err.message
                  : "处理失败";
            throw new ImportRowError(item.rowIndex, msg);
          }
        }
      });
    } catch (err) {
      // 事务已回滚
      imported = 0;
      updated = 0;
      if (err instanceof ImportRowError) {
        txError = { row: err.row, error: err.message };
      } else {
        txError = { row: 0, error: "事务执行失败" };
      }
    }

    await logOperation({
      action: "import",
      module: "product",
      detail: {
        imported,
        updated,
        errorCount: txError ? 1 : 0,
        fileName: file.name,
      },
      ipAddress: getClientIP(request),
    });

    if (txError) {
      return NextResponse.json({
        success: false,
        message: `导入失败：第 ${txError.row} 行 ${txError.error}，事务已回滚，无数据落库`,
        data: { imported: 0, updated: 0, errors: [txError] },
      });
    }

    return NextResponse.json({
      success: true,
      message: `导入完成：新增 ${imported} 条，更新 ${updated} 条`,
      data: { imported, updated, errors: [] },
    });
  } catch (error) {
    console.error("批量导入失败:", error);
    return NextResponse.json(
      { success: false, error: "批量导入失败" },
      { status: 500 }
    );
  }
}
