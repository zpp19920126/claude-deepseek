# 销售单管理模块实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现销售单管理模块，1:1 关联配送单，从配送单明细聚合三种金额（单据/预定/配送），提供 CRUD + 批量导入导出 + 打印功能。

**架构：** 重写现有 `SalesOrder` 模型（删除 `SalesOrderItem` 和冗余字段），新增 `salesNo` 编号生成器、zod 校验、8 个 API 端点、列表/打印页面、4 个前端组件，并启用侧边栏菜单。金额不存储，查询时从配送单明细聚合计算。

**技术栈：** Next.js 16、TypeScript、Prisma 5、SQLite、TailwindCSS 4、zod、xlsx、vitest

**规格文档：** `docs/superpowers/specs/2026-08-03-sales-order-design.md`

---

## 文件清单

### 创建
- `src/lib/order-no.ts` — 修改：新增 `generateSalesOrderNo` 函数
- `src/lib/validations.ts` — 修改：新增 `createSalesOrderSchema` / `updateSalesOrderSchema`
- `src/lib/__tests__/sales-order-validations.test.ts` — zod 校验测试
- `src/app/api/sales/route.ts` — GET 列表 + POST 创建
- `src/app/api/sales/[id]/route.ts` — GET/PUT/DELETE 详情
- `src/app/api/sales/import/route.ts` — POST 批量导入
- `src/app/api/sales/export/route.ts` — GET 批量导出
- `src/app/api/sales/template/route.ts` — GET 模板下载
- `src/app/(dashboard)/sales/page.tsx` — 列表页（Server Component）
- `src/app/(print)/sales/print/page.tsx` — 打印页
- `src/components/features/sales-form-dialog.tsx` — 新增/编辑弹窗
- `src/components/features/sales-search-form.tsx` — 搜索表单
- `src/components/features/sales-toolbar.tsx` — 工具栏
- `src/components/features/sales-row-actions.tsx` — 行操作

### 修改
- `prisma/schema.prisma` — 重写 SalesOrder，删除 SalesOrderItem
- `src/lib/logger.ts` — Module 类型新增 `"sales_order"`
- `src/types/index.ts` — 删除 `SALES_ORDER_STATUS`（改用配送单状态）
- `src/components/layout/sidebar.tsx` — 启用"销售单"菜单项

---

## 任务分解

### 任务 1：数据模型与编号生成器

**文件：**
- 修改：`prisma/schema.prisma`（SalesOrder 模型，行 117-144）
- 修改：`src/lib/order-no.ts`（追加 generateSalesOrderNo）
- 创建：`src/lib/__tests__/sales-order-no.test.ts`

- [ ] **步骤 1：重写 SalesOrder 模型**

打开 `prisma/schema.prisma`，将现有 `SalesOrder`（行 117-132）和 `SalesOrderItem`（行 134-144）整体替换为：

```prisma
// ==================== 销售单（1:1 关联配送单） ====================
model SalesOrder {
  id              Int      @id @default(autoincrement())
  salesNo         String   @unique // 自动生成：XS202608030001
  deliveryOrderId Int      @unique // 1:1 关联配送单
  customerId      Int              // 从配送单继承（冗余，便于查询）
  userId          Int
  remark          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  deliveryOrder DeliveryOrder @relation(fields: [deliveryOrderId], references: [id])
  customer      Customer      @relation(fields: [customerId], references: [id])
  user          User          @relation(fields: [userId], references: [id])
}
```

注意：删除原 `SalesOrderItem` 模型（行 134-144），因为它不再使用。同时原 `SalesOrder` 中的 `totalAmount`、`status`、`items` 字段均移除（金额改查询时计算，状态沿用关联配送单）。`Product` 模型上的 `salesItems SalesOrderItem[]` 字段（行 77）也需删除。

- [ ] **步骤 2：在 DeliveryOrder 模型添加反向关系**

在 `prisma/schema.prisma` 的 `DeliveryOrder` 模型内（行 177-190），在 `items` 字段后追加：

```prisma
  salesOrder SalesOrder?
```

- [ ] **步骤 3：推送 schema 到数据库**

运行：`npx prisma db push`
预期：成功更新数据库 schema。由于原 `SalesOrder` / `SalesOrderItem` 表无数据，可直接重建。

- [ ] **步骤 4：编写编号生成器测试**

创建 `src/lib/__tests__/sales-order-no.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { generateSalesOrderNo } from "@/lib/order-no";

// Prisma 事务客户端的最小 mock
function makeTx(countValue: number) {
  return {
    salesOrder: {
      count: async () => countValue,
    },
  } as unknown as Parameters<typeof generateSalesOrderNo>[0];
}

describe("generateSalesOrderNo", () => {
  it("当日首张编号为 XS + 日期 + 0001", async () => {
    const no = await generateSalesOrderNo(makeTx(0));
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(no).toBe(`XS${today}0001`);
  });

  it("已有 5 张时生成第 6 张序号", async () => {
    const no = await generateSalesOrderNo(makeTx(5));
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(no).toBe(`XS${today}0006`);
  });

  it("序号补零到 4 位", async () => {
    const no = await generateSalesOrderNo(makeTx(0));
    expect(no.endsWith("0001")).toBe(true);
  });
});
```

- [ ] **步骤 5：运行测试验证失败**

运行：`npx vitest run src/lib/__tests__/sales-order-no.test.ts`
预期：FAIL，报错 `generateSalesOrderNo is not exported`

- [ ] **步骤 6：实现 generateSalesOrderNo**

在 `src/lib/order-no.ts` 末尾追加：

```typescript
/**
 * 生成销售单编号：XS + YYYYMMDD + 4位当日序号
 * 在事务内调用，查询当日已有销售单数 +1；并发冲突由调用方捕获 P2002 重试
 */
export async function generateSalesOrderNo(
  tx: TransactionClient
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  const prefix = `XS${dateStr}`;
  const count = await tx.salesOrder.count({
    where: { salesNo: { startsWith: prefix } },
  });

  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}
```

- [ ] **步骤 7：运行测试验证通过**

运行：`npx vitest run src/lib/__tests__/sales-order-no.test.ts`
预期：PASS，3 个测试通过

- [ ] **步骤 8：Commit**

```bash
git add prisma/schema.prisma src/lib/order-no.ts src/lib/__tests__/sales-order-no.test.ts
git commit -m "feat(sales): 重写 SalesOrder 模型并新增编号生成器（任务 1/10）"
```

---

### 任务 2：zod 校验与 logger 类型

**文件：**
- 修改：`src/lib/validations.ts`（追加销售单 schema）
- 修改：`src/lib/logger.ts`（Module 联合类型）
- 创建：`src/lib/__tests__/sales-order-validations.test.ts`

- [ ] **步骤 1：编写校验测试**

创建 `src/lib/__tests__/sales-order-validations.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
} from "@/lib/validations";

function validInput() {
  return {
    deliveryOrderId: 1,
    remark: "测试备注",
  };
}

describe("createSalesOrderSchema", () => {
  it("合法输入通过", () => {
    expect(createSalesOrderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("remark 可选", () => {
    const { remark: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createSalesOrderSchema.safeParse(rest).success).toBe(true);
  });

  it("remark 可为 null", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), remark: null }).success
    ).toBe(true);
  });

  it("remark 超过 500 字符失败", () => {
    expect(
      createSalesOrderSchema.safeParse({
        ...validInput(),
        remark: "a".repeat(501),
      }).success
    ).toBe(false);
  });

  it("deliveryOrderId 缺失失败", () => {
    const { deliveryOrderId: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createSalesOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("deliveryOrderId 非正整数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: 0 })
        .success
    ).toBe(false);
  });

  it("deliveryOrderId 为负数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: -1 })
        .success
    ).toBe(false);
  });

  it("deliveryOrderId 为小数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: 1.5 })
        .success
    ).toBe(false);
  });
});

describe("updateSalesOrderSchema", () => {
  it("空对象通过（部分更新）", () => {
    expect(updateSalesOrderSchema.safeParse({}).success).toBe(true);
  });

  it("仅更新 remark 通过", () => {
    expect(
      updateSalesOrderSchema.safeParse({ remark: "新备注" }).success
    ).toBe(true);
  });

  it("remark 超过 500 字符失败", () => {
    expect(
      updateSalesOrderSchema.safeParse({ remark: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("不允许更新 deliveryOrderId（字段被忽略，不报错）", () => {
    // updateSalesOrderSchema 不包含 deliveryOrderId，传入会被 zod strip 掉
    const result = updateSalesOrderSchema.safeParse({
      deliveryOrderId: 999,
      remark: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("deliveryOrderId");
    }
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/lib/__tests__/sales-order-validations.test.ts`
预期：FAIL，报错 `createSalesOrderSchema is not exported`

- [ ] **步骤 3：在 validations.ts 追加销售单 schema**

在 `src/lib/validations.ts` 末尾追加：

```typescript
// ==================== 销售单（1:1 关联配送单） ====================
export const createSalesOrderSchema = z.object({
  deliveryOrderId: z.number().int().positive("请选择配送单"),
  remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
});

export const updateSalesOrderSchema = z.object({
  remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
```

- [ ] **步骤 4：更新 logger.ts 的 Module 类型**

在 `src/lib/logger.ts` 的 `Module` 类型联合中追加 `"sales_order"`：

```typescript
type Module =
  | "product"
  | "category"
  | "unit"
  | "customer"
  | "supplier"
  | "sales"
  | "purchase"
  | "user"
  | "delivery_order"
  | "sales_order";
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run src/lib/__tests__/sales-order-validations.test.ts`
预期：PASS，全部测试通过

- [ ] **步骤 6：Commit**

```bash
git add src/lib/validations.ts src/lib/logger.ts src/lib/__tests__/sales-order-validations.test.ts
git commit -m "feat(sales): 新增销售单 zod 校验与 logger 类型（任务 2/10）"
```

---

### 任务 3：列表 + 创建 API

**文件：**
- 创建：`src/app/api/sales/route.ts`

- [ ] **步骤 1：实现 GET 列表 + POST 创建**

创建 `src/app/api/sales/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createSalesOrderSchema } from "@/lib/validations";
import { generateSalesOrderNo } from "@/lib/order-no";
import type { PaginatedResponse } from "@/types";

// 获取销售单列表（分页 + 搜索 salesNo）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 20)
    );

    const where = search ? { salesNo: { contains: search } } : undefined;

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, code: true, shortName: true },
          },
          deliveryOrder: {
            select: {
              id: true,
              orderNo: true,
              status: true,
              items: {
                select: {
                  reservedQuantity: true,
                  deliveryQuantity: true,
                  receivedQuantity: true,
                  unitPrice: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    const items = orders.map((o) => {
      const orderAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.receivedQuantity * it.unitPrice,
        0
      );
      const reservedAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.reservedQuantity * it.unitPrice,
        0
      );
      const deliveryAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.deliveryQuantity * it.unitPrice,
        0
      );
      return {
        id: o.id,
        salesNo: o.salesNo,
        deliveryOrderId: o.deliveryOrderId,
        deliveryOrderNo: o.deliveryOrder.orderNo,
        deliveryStatus: o.deliveryOrder.status,
        customerId: o.customerId,
        customerCode: o.customer.code,
        customerName: o.customer.name,
        customerShortName: o.customer.shortName,
        orderAmount,
        reservedAmount,
        deliveryAmount,
        remark: o.remark,
        createdAt: o.createdAt,
      };
    });

    const result: PaginatedResponse<(typeof items)[number]> = {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取销售单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售单列表失败" },
      { status: 500 }
    );
  }
}

// 创建销售单（1:1 绑定配送单，自动生成 salesNo）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createSalesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { deliveryOrderId, remark } = parsed.data;

    // 校验配送单存在
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      select: { id: true, customerId: true, orderNo: true },
    });
    if (!deliveryOrder) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    // 事务内生成编号 + 创建销售单；P2002 时重试
    let created: Prisma.SalesOrderGetPayload<{}> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const salesNo = await generateSalesOrderNo(tx);
          return tx.salesOrder.create({
            data: {
              salesNo,
              deliveryOrderId,
              customerId: deliveryOrder.customerId,
              userId: user.id,
              remark: remark ?? null,
            },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue; // 编号或 deliveryOrderId 冲突，重试
        }
        throw err;
      }
    }

    await logOperation({
      action: "create",
      module: "sales_order",
      targetId: created!.id,
      detail: {
        salesNo: created!.salesNo,
        deliveryOrderId,
        deliveryOrderNo: deliveryOrder.orderNo,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "销售单创建成功",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // 判断是 salesNo 冲突还是 deliveryOrderId 冲突
      const target =
        (error.meta?.target as string[] | undefined)?.[0] === "deliveryOrderId"
          ? "该配送单已存在销售单"
          : "销售单编号生成冲突，请重试";
      return NextResponse.json(
        { success: false, error: target },
        { status: 409 }
      );
    }
    console.error("创建销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建销售单失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/sales/route.ts
git commit -m "feat(sales): 实现销售单列表与创建 API（任务 3/10）"
```

---

### 任务 4：详情 + 更新 + 删除 API

**文件：**
- 创建：`src/app/api/sales/[id]/route.ts`

- [ ] **步骤 1：实现 GET/PUT/DELETE**

创建 `src/app/api/sales/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateSalesOrderSchema } from "@/lib/validations";

// 获取销售单详情（含配送单明细 + 商品/单位）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const salesId = Number(id);

    const order = await prisma.salesOrder.findUnique({
      where: { id: salesId },
      include: {
        customer: {
          select: { id: true, name: true, code: true, shortName: true },
        },
        deliveryOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            remark: true,
            createdAt: true,
            items: {
              include: {
                product: { select: { id: true, sku: true, name: true } },
                reservedUnit: { select: { id: true, name: true } },
                deliveryUnit: { select: { id: true, name: true } },
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("获取销售单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售单详情失败" },
      { status: 500 }
    );
  }
}

// 更新销售单（仅备注可改）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const salesId = Number(id);

    const existing = await prisma.salesOrder.findUnique({
      where: { id: salesId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSalesOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "输入参数无效",
        },
        { status: 400 }
      );
    }

    const { remark } = parsed.data;

    const updated = await prisma.salesOrder.update({
      where: { id: salesId },
      data: {
        ...(remark !== undefined && { remark: remark ?? null }),
      },
    });

    await logOperation({
      action: "update",
      module: "sales_order",
      targetId: salesId,
      detail: {
        salesNo: existing.salesNo,
        fields: Object.keys(parsed.data),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "销售单更新成功",
    });
  } catch (error) {
    console.error("更新销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新销售单失败" },
      { status: 500 }
    );
  }
}

// 删除销售单（仅管理员，不级联删除配送单）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const salesId = Number(id);

    const existing = await prisma.salesOrder.findUnique({
      where: { id: salesId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "销售单不存在" },
        { status: 404 }
      );
    }

    await prisma.salesOrder.delete({ where: { id: salesId } });

    await logOperation({
      action: "delete",
      module: "sales_order",
      targetId: salesId,
      detail: { deleted: existing.salesNo },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "销售单删除成功" });
  } catch (error) {
    console.error("删除销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除销售单失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/sales/[id]/route.ts
git commit -m "feat(sales): 实现销售单详情/更新/删除 API（任务 4/10）"
```

---

### 任务 5：批量导入 API

**文件：**
- 创建：`src/app/api/sales/import/route.ts`

- [ ] **步骤 1：实现批量导入**

创建 `src/app/api/sales/import/route.ts`：

```typescript
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
  remark: string;
  rowIndex: number;
};

// 批量导入销售单（POST 上传 Excel 文件，仅管理员）
// Excel 列：单据编号 | 备注
// 系统按"单据编号"匹配配送单 orderNo，自动创建销售单（1:1 绑定）
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
      const remark = String(row["备注"] || "").trim();

      if (!orderNo) {
        errors.push({ row: rowIndex, error: "单据编号不能为空" });
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

      parsedRows.push({ orderNo, remark, rowIndex });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `校验失败：${errors.length} 条数据有误，已中止导入（无数据落库）`,
        data: { imported: 0, errors: errors.slice(0, 50) },
      });
    }

    // 预查配送单（按 orderNo 批量查询）
    const orderNos = [...new Set(parsedRows.map((r) => r.orderNo))];
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: { orderNo: { in: orderNos } },
      select: { id: true, orderNo: true, customerId: true },
    });
    const deliveryMap = new Map(
      deliveryOrders.map((d) => [d.orderNo, d] as const)
    );

    // 校验配送单存在性
    for (const r of parsedRows) {
      if (!deliveryMap.has(r.orderNo)) {
        errors.push({
          row: r.rowIndex,
          error: `单据编号"${r.orderNo}"对应的配送单不存在`,
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
            await tx.salesOrder.create({
              data: {
                salesNo,
                deliveryOrderId: delivery.id,
                customerId: delivery.customerId,
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
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/sales/import/route.ts
git commit -m "feat(sales): 实现销售单批量导入 API（任务 5/10）"
```

---

### 任务 6：批量导出 + 模板 API

**文件：**
- 创建：`src/app/api/sales/export/route.ts`
- 创建：`src/app/api/sales/template/route.ts`

- [ ] **步骤 1：实现批量导出**

创建 `src/app/api/sales/export/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";

// 导出销售单列表为 Excel（仅管理员）
// 每行 = 一个销售单，含三种聚合金额
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: {
          select: { code: true, name: true, shortName: true },
        },
        deliveryOrder: {
          select: {
            orderNo: true,
            status: true,
            items: {
              select: {
                reservedQuantity: true,
                deliveryQuantity: true,
                receivedQuantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData: Record<string, unknown>[] = orders.map((o, i) => {
      const orderAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.receivedQuantity * it.unitPrice,
        0
      );
      const reservedAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.reservedQuantity * it.unitPrice,
        0
      );
      const deliveryAmount = o.deliveryOrder.items.reduce(
        (s, it) => s + it.deliveryQuantity * it.unitPrice,
        0
      );
      return {
        序号: i + 1,
        销售单编码: o.salesNo,
        客户编码: o.customer.code,
        客户名称: o.customer.name,
        客户简称: o.customer.shortName || "",
        单据编号: o.deliveryOrder.orderNo,
        单据金额: formatCurrency(orderAmount),
        预定金额: formatCurrency(reservedAmount),
        配送金额: formatCurrency(deliveryAmount),
        状态:
          DELIVERY_ORDER_STATUS[
            o.deliveryOrder.status as keyof typeof DELIVERY_ORDER_STATUS
          ] || o.deliveryOrder.status,
        备注: o.remark || "",
        添加时间: formatDateTime(o.createdAt),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "销售单列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "sales_order",
      detail: {
        orderCount: orders.length,
        format: "xlsx",
      },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `销售单列表_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("导出销售单失败:", error);
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：实现模板下载**

创建 `src/app/api/sales/template/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

// 下载销售单导入模板
// Excel 列：单据编号 | 备注
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        单据编号: "SO202608020001",
        备注: "首批对账",
      },
      {
        单据编号: "SO202608020002",
        备注: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "销售单导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = encodeURIComponent("销售单导入模板.xlsx");
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
```

- [ ] **步骤 3：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/sales/export/route.ts src/app/api/sales/template/route.ts
git commit -m "feat(sales): 实现销售单导出与模板下载 API（任务 6/10）"
```

---

### 任务 7：列表页（Server Component）

**文件：**
- 创建：`src/app/(dashboard)/sales/page.tsx`

- [ ] **步骤 1：实现列表页**

创建 `src/app/(dashboard)/sales/page.tsx`：

```typescript
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { SalesSearchForm } from "@/components/features/sales-search-form";
import { SalesToolbar } from "@/components/features/sales-toolbar";
import { SalesRowActions } from "@/components/features/sales-row-actions";
import { Table, type Column } from "@/components/ui/table";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// 列表查询返回的销售单类型（含 customer + deliveryOrder.items）
type SalesOrderListItem = Prisma.SalesOrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; code: true; shortName: true } };
    deliveryOrder: {
      select: {
        id: true;
        orderNo: true;
        status: true;
        items: {
          select: {
            reservedQuantity: true;
            deliveryQuantity: true;
            receivedQuantity: true;
            unitPrice: true;
          };
        };
      };
    };
  };
}>;

// 带序号和聚合金额的行类型
type SalesOrderRow = SalesOrderListItem & {
  index: number;
  orderAmount: number;
  reservedAmount: number;
  deliveryAmount: number;
};

// 状态徽标颜色映射（复用配送单状态）
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  delivered: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function StatusBadge({ status }: { status: string }) {
  const label =
    (DELIVERY_ORDER_STATUS as Record<string, string>)[status] || status;
  const cls = STATUS_BADGE[status] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// 分页链接组件（Server Component）
function PaginationLink({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `/sales?${params.toString()}`;
  }

  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-text-muted">
        共 {total} 条，第 {page}/{totalPages} 页
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildUrl(page - 1)}
          className={`px-3 py-1.5 rounded-lg text-sm border border-border text-text-muted hover:bg-bg transition ${
            page <= 1 ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          上一页
        </Link>
        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-muted">
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(p)}
              className={`min-w-[32px] px-2 py-1.5 rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-primary text-white"
                  : "border border-border text-text-muted hover:bg-bg"
              }`}
            >
              {p}
            </Link>
          )
        )}
        <Link
          href={buildUrl(page + 1)}
          className={`px-3 py-1.5 rounded-lg text-sm border border-border text-text-muted hover:bg-bg transition ${
            page >= totalPages ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          下一页
        </Link>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  // 构建查询条件（搜索框：销售单编码 salesNo contains）
  const where: Prisma.SalesOrderWhereInput = {};
  if (params.search) {
    where.salesNo = { contains: params.search };
  }

  // Server Component 直接查询数据库
  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, code: true, shortName: true },
        },
        deliveryOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            items: {
              select: {
                reservedQuantity: true,
                deliveryQuantity: true,
                receivedQuantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  // 聚合金额计算
  const rows: SalesOrderRow[] = items.map((item, i) => {
    const orderAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.receivedQuantity * it.unitPrice,
      0
    );
    const reservedAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.reservedQuantity * it.unitPrice,
      0
    );
    const deliveryAmount = item.deliveryOrder.items.reduce(
      (s, it) => s + it.deliveryQuantity * it.unitPrice,
      0
    );
    return {
      ...item,
      index: (page - 1) * pageSize + i + 1,
      orderAmount,
      reservedAmount,
      deliveryAmount,
    };
  });

  // 列定义（复用 Column 类型）
  const columns: Column<SalesOrderRow>[] = [
    {
      key: "index",
      title: "序号",
      width: "48px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    {
      key: "salesNo",
      title: "销售单编码",
      render: (row) => <span className="font-mono">{row.salesNo}</span>,
    },
    {
      key: "customerName",
      title: "客户名称",
      render: (row) => (
        <span className="font-medium">{row.customer?.name || "-"}</span>
      ),
    },
    {
      key: "customerCode",
      title: "客户编码",
      render: (row) => (
        <span className="text-text-muted">{row.customer?.code || "-"}</span>
      ),
    },
    {
      key: "customerShortName",
      title: "客户简称",
      render: (row) => (
        <span>{row.customer?.shortName || "-"}</span>
      ),
    },
    {
      key: "deliveryOrderNo",
      title: "单据编号",
      render: (row) => (
        <span className="font-mono">{row.deliveryOrder?.orderNo || "-"}</span>
      ),
    },
    {
      key: "orderAmount",
      title: "单据金额",
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.orderAmount)}</span>
      ),
    },
    {
      key: "reservedAmount",
      title: "预定金额",
      render: (row) => (
        <span>{formatCurrency(row.reservedAmount)}</span>
      ),
    },
    {
      key: "deliveryAmount",
      title: "配送金额",
      render: (row) => <span>{formatCurrency(row.deliveryAmount)}</span>,
    },
    {
      key: "status",
      title: "状态",
      render: (row) => <StatusBadge status={row.deliveryOrder?.status || ""} />,
    },
    {
      key: "createdAt",
      title: "添加时间",
      render: (row) => (
        <span className="text-text-muted text-sm">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      render: (row) => (
        <SalesRowActions
          sale={{ id: row.id, salesNo: row.salesNo }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">销售单管理</h1>
          <p className="text-sm text-text-muted mt-1">
            共 {total} 条销售单记录
          </p>
        </div>
        <SalesToolbar />
      </div>

      {/* 搜索表单 */}
      <SalesSearchForm />

      {/* 销售单列表表格（复用 Table 组件） */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<SalesOrderRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          emptyText="暂无销售单数据"
        />
      </div>

      {/* 分页 */}
      <PaginationLink
        page={page}
        pageSize={pageSize}
        total={total}
        searchParams={params as Record<string, string>}
      />
    </div>
  );
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误（注意：此时引用的 SalesToolbar/SalesSearchForm/SalesRowActions 尚未创建，编译可能报错。这些组件将在任务 8 创建。可先完成任务 8 再统一编译验证）

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/sales/page.tsx
git commit -m "feat(sales): 实现销售单列表页（任务 7/10）"
```

---

### 任务 8：前端组件（表单/搜索/工具栏/行操作）

**文件：**
- 创建：`src/components/features/sales-form-dialog.tsx`
- 创建：`src/components/features/sales-search-form.tsx`
- 创建：`src/components/features/sales-toolbar.tsx`
- 创建：`src/components/features/sales-row-actions.tsx`

- [ ] **步骤 1：实现搜索表单**

创建 `src/components/features/sales-search-form.tsx`：

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 销售单搜索表单
 * 通过更新 URL searchParams 触发 Server Component 重新查询
 * 搜索框：销售单编码
 */
export function SalesSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  function handleSearch() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    router.push(`/sales?${params.toString()}`);
  }

  function handleReset() {
    setSearch("");
    router.push("/sales");
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          label="销售单编码"
          name="search"
          placeholder="请输入销售单编码"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button onClick={handleSearch}>查询</Button>
        <Button variant="secondary" onClick={handleReset}>
          重置
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：实现表单弹窗**

创建 `src/components/features/sales-form-dialog.tsx`：

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityPicker } from "@/components/features/entity-picker";
import { toast } from "@/components/ui/toast";

interface SalesFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入 salesId 时为编辑模式（仅备注可改），否则为新增模式
  salesId?: number;
}

export function SalesFormDialog({
  open,
  onClose,
  salesId,
}: SalesFormDialogProps) {
  const router = useRouter();
  const isEdit = !!salesId;

  const [deliveryOrderId, setDeliveryOrderId] = useState<number | null>(null);
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 编辑模式：加载现有销售单数据
  useEffect(() => {
    if (!open || !salesId) return;
    setLoading(true);
    fetch(`/api/sales/${salesId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDeliveryOrderId(json.data.deliveryOrderId);
          setDeliveryOrderNo(json.data.deliveryOrder?.orderNo || "");
          setRemark(json.data.remark || "");
        }
      })
      .finally(() => setLoading(false));
  }, [open, salesId]);

  function reset() {
    setDeliveryOrderId(null);
    setDeliveryOrderNo("");
    setRemark("");
  }

  async function handleSubmit() {
    if (!isEdit && !deliveryOrderId) {
      toast.error("请选择配送单");
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/sales/${salesId}` : "/api/sales";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { remark }
        : { deliveryOrderId, remark: remark || undefined };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "销售单更新成功" : "销售单创建成功");
        reset();
        onClose();
        router.refresh();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? "编辑销售单" : "新增销售单"}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            确定
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-text-muted">加载中...</div>
      ) : (
        <div className="space-y-4">
          {/* 配送单选择（仅新增模式可选） */}
          <div>
            <label className="block text-sm text-text-muted mb-1">
              配送单单据编号 {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={deliveryOrderNo}
                placeholder="请选择配送单"
                readOnly
                className="cursor-pointer"
                disabled={isEdit}
              />
              {!isEdit && (
                <Button
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={submitting}
                >
                  选择
                </Button>
              )}
            </div>
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                编辑模式下不可更改关联的配送单
              </p>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">备注</label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选"
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {/* 配送单选择器（仅新增模式） */}
      {!isEdit && (
        <EntityPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setDeliveryOrderId(item.id);
            setDeliveryOrderNo(item.name);
          }}
          title="选择配送单"
          apiUrl="/api/delivery-orders"
        />
      )}
    </Modal>
  );
}
```

- [ ] **步骤 3：实现行操作**

创建 `src/components/features/sales-row-actions.tsx`：

```typescript
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { SalesFormDialog } from "@/components/features/sales-form-dialog";

interface SalesRowActionsProps {
  sale: {
    id: number;
    salesNo: string;
  };
}

/**
 * 销售单表格行操作按钮：编辑 + 删除
 */
export function SalesRowActions({ sale }: SalesRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("销售单删除成功");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(json.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="text-primary hover:underline text-sm"
        >
          编辑
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-danger hover:underline text-sm"
        >
          删除
        </button>
      </div>

      {/* 编辑弹窗 */}
      <SalesFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        salesId={sale.id}
      />

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="确认删除"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          确定要删除销售单{" "}
          <span className="font-semibold">{sale.salesNo}</span>{" "}
          吗？此操作不可撤销（关联的配送单不会被删除）。
        </p>
      </Modal>
    </>
  );
}
```

- [ ] **步骤 4：实现工具栏**

创建 `src/components/features/sales-toolbar.tsx`：

```typescript
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { SalesFormDialog } from "@/components/features/sales-form-dialog";

/**
 * 销售单工具栏：新增销售单 + 批量导入 + 批量导出 + 打印
 */
export function SalesToolbar() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    open: boolean;
    message: string;
    errors: { row: number; error: string }[];
  }>({ open: false, message: "", errors: [] });

  async function handleExport() {
    try {
      const res = await fetch("/api/sales/export");
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      let fileName = "销售单列表.xlsx";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      if (match) fileName = decodeURIComponent(match[1]);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败，请稍后重试");
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch("/api/sales/template");
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "销售单导入模板.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("下载模板失败");
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/sales/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult({
          open: true,
          message: json.message,
          errors: json.data?.errors || [],
        });
        router.refresh();
      } else {
        if (json.data?.errors?.length > 0) {
          setImportResult({
            open: true,
            message: json.message || "导入失败",
            errors: json.data.errors,
          });
        } else {
          toast.error(json.error || "导入失败");
        }
      }
    } catch {
      toast.error("网络错误，导入失败");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handlePrint() {
    const params = new URLSearchParams(window.location.search);
    window.open(`/sales/print?${params.toString()}`, "_blank");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportFile}
      />
      <Button onClick={() => setCreateOpen(true)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        新增销售单
      </Button>
      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        loading={importing}
      >
        {!importing && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )}
        批量导入
      </Button>
      <Button variant="secondary" onClick={handleExport}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        批量导出
      </Button>
      <Button variant="secondary" onClick={handlePrint}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        打印
      </Button>

      {/* 导入结果弹窗 */}
      <Modal
        open={importResult.open}
        onClose={() => setImportResult({ ...importResult, open: false })}
        title="导入结果"
        footer={
          <>
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button onClick={() => setImportResult({ ...importResult, open: false })}>
              确定
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text">{importResult.message}</p>
          {importResult.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-danger mb-1">
                错误详情（前 {importResult.errors.length} 条）：
              </p>
              <div className="max-h-48 overflow-y-auto scrollbar-thin border border-border rounded-lg">
                <ul className="divide-y divide-border">
                  {importResult.errors.map((err, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 text-xs text-text-muted"
                    >
                      第 {err.row} 行：{err.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 新增销售单弹窗 */}
      <SalesFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
```

- [ ] **步骤 5：TypeScript 编译验证（与列表页一起）**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 6：Commit**

```bash
git add src/components/features/sales-form-dialog.tsx src/components/features/sales-search-form.tsx src/components/features/sales-toolbar.tsx src/components/features/sales-row-actions.tsx
git commit -m "feat(sales): 实现销售单前端组件（任务 8/10）"
```

---

### 任务 9：打印页

**文件：**
- 创建：`src/app/(print)/sales/print/page.tsx`

- [ ] **步骤 1：实现打印页**

创建 `src/app/(print)/sales/print/page.tsx`：

```typescript
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { PrintTrigger } from "@/components/features/print-trigger";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SalesPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 构建与列表页相同的查询条件（但不分页，获取全量数据）
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.salesNo = { contains: params.search };
  }

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      customer: {
        select: { id: true, name: true, code: true, shortName: true },
      },
      deliveryOrder: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          remark: true,
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              reservedUnit: { select: { id: true, name: true } },
              deliveryUnit: { select: { id: true, name: true } },
            },
            orderBy: { id: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const printDate = formatDate(new Date());

  const statusLabel = (status: string) =>
    (DELIVERY_ORDER_STATUS as Record<string, string>)[status] || status;

  return (
    <div className="print-page">
      <PrintTrigger />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .order-block { page-break-inside: avoid; }
          @page { margin: 1.5cm; size: landscape; }
        }
        .print-container { padding: 20px; font-family: -apple-system, "Microsoft YaHei", sans-serif; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-header h1 { font-size: 22px; margin: 0 0 8px 0; }
        .print-header p { font-size: 12px; color: #666; margin: 0; }
        .order-block { margin-bottom: 28px; }
        .order-meta { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-bottom: 8px; font-size: 12px; color: #333; }
        .order-meta strong { color: #000; }
        .amount-summary { margin-bottom: 8px; padding: 8px 12px; background: #f7f7f7; border-radius: 4px; font-size: 13px; }
        .amount-summary span { margin-right: 24px; }
        .amount-summary strong { color: #000; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ddd; white-space: nowrap; }
        .print-table td { padding: 4px 8px; border: 1px solid #ddd; }
        .print-table tr:nth-child(even) { background: #fafafa; }
        .print-footer { margin-top: 20px; text-align: right; font-size: 11px; color: #999; }
      `,
        }}
      />

      <div className="print-container">
        <div className="print-header">
          <h1>销售单列表</h1>
          <p>
            打印日期：{printDate} ｜ 共 {orders.length} 张销售单
          </p>
        </div>

        {orders.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "#999" }}>
            暂无销售单数据
          </p>
        ) : (
          orders.map((order) => {
            const orderAmount = order.deliveryOrder.items.reduce(
              (s, it) => s + it.receivedQuantity * it.unitPrice,
              0
            );
            const reservedAmount = order.deliveryOrder.items.reduce(
              (s, it) => s + it.reservedQuantity * it.unitPrice,
              0
            );
            const deliveryAmount = order.deliveryOrder.items.reduce(
              (s, it) => s + it.deliveryQuantity * it.unitPrice,
              0
            );
            return (
              <div key={order.id} className="order-block">
                <div className="order-meta">
                  <span>
                    <strong>销售单编码：</strong>
                    {order.salesNo}
                  </span>
                  <span>
                    <strong>客户：</strong>
                    {order.customer?.code} {order.customer?.name}
                    {order.customer?.shortName ? ` (${order.customer.shortName})` : ""}
                  </span>
                  <span>
                    <strong>配送单号：</strong>
                    {order.deliveryOrder?.orderNo}
                  </span>
                  <span>
                    <strong>状态：</strong>
                    {statusLabel(order.deliveryOrder?.status || "")}
                  </span>
                  <span>
                    <strong>创建时间：</strong>
                    {formatDateTime(order.createdAt)}
                  </span>
                  {order.remark && (
                    <span>
                      <strong>备注：</strong>
                      {order.remark}
                    </span>
                  )}
                </div>

                <div className="amount-summary">
                  <span>
                    <strong>单据金额（实收×单价）：</strong>
                    {formatCurrency(orderAmount)}
                  </span>
                  <span>
                    <strong>预定金额：</strong>
                    {formatCurrency(reservedAmount)}
                  </span>
                  <span>
                    <strong>配送金额：</strong>
                    {formatCurrency(deliveryAmount)}
                  </span>
                </div>

                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>序号</th>
                      <th>商品编码</th>
                      <th>商品名称</th>
                      <th>预定单位</th>
                      <th>预定数量</th>
                      <th>配送单位</th>
                      <th>配送数量</th>
                      <th>实收数量</th>
                      <th>单价</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.deliveryOrder.items.map((it, index) => (
                      <tr key={it.id}>
                        <td>{index + 1}</td>
                        <td>{it.product?.sku || "-"}</td>
                        <td>{it.product?.name || "-"}</td>
                        <td>{it.reservedUnit?.name || "-"}</td>
                        <td>{it.reservedQuantity}</td>
                        <td>{it.deliveryUnit?.name || "-"}</td>
                        <td>{it.deliveryQuantity}</td>
                        <td>{it.receivedQuantity}</td>
                        <td>{formatCurrency(it.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        <div className="print-footer">
          lvliang 蔬菜配送管理系统 ｜ {printDate}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/(print)/sales/print/page.tsx
git commit -m "feat(sales): 实现销售单打印页（任务 9/10）"
```

---

### 任务 10：侧边栏启用 + 最终验证

**文件：**
- 修改：`src/components/layout/sidebar.tsx`（行 44）

- [ ] **步骤 1：启用侧边栏"销售单"菜单项**

在 `src/components/layout/sidebar.tsx` 第 44 行，将：

```typescript
      { label: "销售单", href: "/sales", icon: "📋" },
```

改为：

```typescript
      { label: "销售单", href: "/sales", icon: "📋", enabled: true },
```

- [ ] **步骤 2：删除 types/index.ts 中的 SALES_ORDER_STATUS**

在 `src/types/index.ts` 中删除 `SALES_ORDER_STATUS` 常量（行 26-32），因为销售单状态改用配送单状态 `DELIVERY_ORDER_STATUS`：

删除：
```typescript
// 订单状态枚举
export const SALES_ORDER_STATUS = {
  pending: "待确认",
  confirmed: "已确认",
  delivered: "已配送",
  paid: "已收款",
  cancelled: "已取消",
} as const;
```

- [ ] **步骤 3：检查是否有代码引用 SALES_ORDER_STATUS**

运行：`grep -r "SALES_ORDER_STATUS" src/`
预期：无输出（无引用）。如有引用，需删除相应引用。

- [ ] **步骤 4：TypeScript 全量编译**

运行：`npx tsc --noEmit`
预期：0 错误

- [ ] **步骤 5：运行全部测试**

运行：`npx vitest run`
预期：全部通过（含原有 132 个测试 + 新增销售单校验测试 + 编号生成测试）

- [ ] **步骤 6：启动 dev 服务器验证页面**

运行：`PORT=3001 npm run dev`（如已在运行则跳过）

在浏览器访问以下页面验证：
- `http://localhost:3001/sales` — 列表页正常渲染（暂无数据提示）
- `http://localhost:3001/sales/print` — 打印页正常渲染
- 侧边栏"销售单"菜单项可点击，不再显示"待开发"

- [ ] **步骤 7：Commit**

```bash
git add src/components/layout/sidebar.tsx src/types/index.ts
git commit -m "feat(sales): 启用侧边栏菜单并完成最终验证（任务 10/10）"
```

---

## 完成标准

- [ ] `npx tsc --noEmit` 0 错误
- [ ] `npx vitest run` 全部通过
- [ ] 列表页 `/sales` 可正常访问
- [ ] 打印页 `/sales/print` 可正常访问
- [ ] 侧边栏"销售单"菜单已启用
- [ ] 表格列包含：销售单编码、客户名称、客户编码、客户简称、单据编号、单据金额、预定金额、配送金额、状态、添加时间、操作
- [ ] 工具栏含：新增、批量导入、批量导出、打印
- [ ] 搜索框可按销售单编码搜索
- [ ] 所有写操作调用 logOperation
- [ ] API 使用 requireAuth/requireAdmin
- [ ] API 使用 zod 校验输入
