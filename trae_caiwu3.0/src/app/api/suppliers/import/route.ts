import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createSupplierSchema } from "@/lib/validations";

// 允许的文件类型与大小限制
const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_EXT = [".xlsx", ".xls"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 事务内写入用的数据结构
interface SupplierInput {
  code: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  address: string | null;
  contact: string | null;
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

// 批量导入供应商（POST 上传 Excel 文件，仅管理员）
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

    // 服务端校验文件类型与大小
    // ext 必须合法；mime 若浏览器提供也必须合法（部分浏览器上传 xlsx 时 mime 为空）
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

    // 检查现有 code（用于区分新增/更新；name 冲突交给事务内 P2002 兜底）
    const codes = rows
      .map((r) => String(r["供应商编码"] || "").trim())
      .filter(Boolean);

    const existingCodes = await prisma.supplier.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });

    const existingCodeSet = new Set(existingCodes.map((s) => s.code));

    // 事务前用 zod 逐行校验，收集有效数据与错误
    const validRows: SupplierInput[] = [];
    const errors: { row: number; error: string }[] = [];
    // 文件内 code 唯一性校验：避免同文件内重复 code 导致静默覆盖
    const seenCodes = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // Excel 行号（含表头）

      const code = String(row["供应商编码"] || "").trim();
      const name = String(row["供应商名称"] || "").trim();
      const shortName = String(row["供应商简称"] || "").trim() || null;
      const phone = String(row["电话"] || "").trim() || null;
      const address = String(row["地址"] || "").trim() || null;
      const contact = String(row["联系人"] || "").trim() || null;
      const remark = String(row["备注"] || "").trim() || null;

      // 文件内 code 重复检查（在 zod 校验前，给出明确错误）
      if (code && seenCodes.has(code)) {
        errors.push({
          row: rowIndex,
          error: `供应商编码"${code}"在文件内重复`,
        });
        continue;
      }
      seenCodes.add(code);

      // 用 zod 校验所有字段
      const parsed = createSupplierSchema.safeParse({
        code,
        name,
        shortName,
        phone,
        address,
        contact,
        remark,
      });

      if (!parsed.success) {
        errors.push({
          row: rowIndex,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        });
        continue;
      }

      validRows.push({
        code: parsed.data.code,
        name: parsed.data.name,
        shortName: parsed.data.shortName ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? null,
        contact: parsed.data.contact ?? null,
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

    // 用事务包裹，保证原子性（任一写入异常整体回滚）
    let imported = 0;
    let updated = 0;
    let txError: { row: number; error: string } | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of validRows) {
          try {
            if (existingCodeSet.has(item.code)) {
              await tx.supplier.update({
                where: { code: item.code },
                data: {
                  name: item.name,
                  shortName: item.shortName,
                  phone: item.phone,
                  address: item.address,
                  contact: item.contact,
                  remark: item.remark,
                },
              });
              updated++;
            } else {
              await tx.supplier.create({
                data: {
                  code: item.code,
                  name: item.name,
                  shortName: item.shortName,
                  phone: item.phone,
                  address: item.address,
                  contact: item.contact,
                  remark: item.remark,
                },
              });
              existingCodeSet.add(item.code);
              imported++;
            }
          } catch (err) {
            // 识别 P2002 唯一约束冲突
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
                ? `供应商编码"${item.code}"已存在（唯一约束冲突）`
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
      module: "supplier",
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
