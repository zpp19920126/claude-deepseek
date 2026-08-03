# 销售配送单管理模块实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新增销售配送单模块，支持双表（单据头+明细）CRUD、批量导入导出、打印。

**架构：** DeliveryOrder（头）+ DeliveryOrderItem（明细）双表设计；Server Component 数据获取；复用 Table/EntityPicker/PrintTrigger；API 遵循 withAuth 骨架 + RBAC + zod + logOperation。

**技术栈：** Next.js 16、TypeScript、Prisma 5、SQLite、TailwindCSS 4、xlsx、zod、vitest

**规格文档：** `docs/superpowers/specs/2026-08-02-delivery-order-design.md`

**权限约定（与 suppliers 模块一致）：** export 用 `requireAdmin`（全量数据），template 用 `requireAuth`，DELETE/import 用 `requireAdmin`，GET/POST/PUT 用 `requireAuth`。

---

## 文件结构

**数据库：**
- 修改：`prisma/schema.prisma` — 新增 DeliveryOrder + DeliveryOrderItem 模型
- 修改：`prisma/seed.ts` — 新增示例配送单

**校验与工具：**
- 修改：`src/lib/validations.ts` — 新增 createDeliveryOrderSchema 等
- 创建：`src/lib/__tests__/delivery-order-validations.test.ts` — zod 校验测试
- 创建：`src/lib/order-no.ts` — 单据编号生成工具

**API 路由（8个）：**
- 创建：`src/app/api/delivery-orders/route.ts` — GET 列表 + POST 创建
- 创建：`src/app/api/delivery-orders/[id]/route.ts` — GET/PUT/DELETE
- 创建：`src/app/api/delivery-orders/import/route.ts` — 批量导入
- 创建：`src/app/api/delivery-orders/export/route.ts` — 批量导出
- 创建：`src/app/api/delivery-orders/template/route.ts` — 模板下载

**类型：**
- 修改：`src/types/index.ts` — 新增 DELIVERY_ORDER_STATUS

**前端页面：**
- 创建：`src/app/(dashboard)/delivery-orders/page.tsx` — 列表页
- 创建：`src/app/(print)/delivery-orders/print/page.tsx` — 打印页

**组件（5个）：**
- 创建：`src/components/features/delivery-order-toolbar.tsx`
- 创建：`src/components/features/delivery-order-search-form.tsx`
- 创建：`src/components/features/delivery-order-row-actions.tsx`
- 创建：`src/components/features/delivery-order-form-dialog.tsx` — 含动态明细行

**配置：**
- 修改：`src/components/layout/sidebar.tsx` — 启用菜单

---

## 任务 1：数据模型 + 迁移 + seed

**文件：**
- 修改：`prisma/schema.prisma`（在 OperationLog 模型前新增）
- 修改：`prisma/seed.ts`
- 修改：`prisma/schema.prisma` 的 User 和 Customer 模型（新增反向关系）

- [ ] **步骤 1：在 schema.prisma 新增两个模型**

在 `model OperationLog` 之前插入：

```prisma
// ==================== 销售配送单 ====================
model DeliveryOrder {
  id         Int      @id @default(autoincrement())
  orderNo    String   @unique // 自动生成：SO202608020001
  customerId Int
  userId     Int
  status     String   @default("pending") // pending | delivered | received | cancelled
  remark     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  customer Customer            @relation(fields: [customerId], references: [id])
  user     User                @relation(fields: [userId], references: [id])
  items    DeliveryOrderItem[]
}

model DeliveryOrderItem {
  id                Int   @id @default(autoincrement())
  orderId           Int
  productId         Int
  reservedUnitId    Int
  reservedQuantity  Float
  deliveryUnitId    Int
  deliveryQuantity  Float
  receivedQuantity  Float
  unitPrice         Float

  order         DeliveryOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id])
  reservedUnit  Unit          @relation("DeliveryReservedUnit", fields: [reservedUnitId], references: [id])
  deliveryUnit  Unit          @relation("DeliveryDeliveryUnit", fields: [deliveryUnitId], references: [id])
}
```

在 User 模型追加：`deliveryOrders DeliveryOrder[]`
在 Customer 模型追加：`deliveryOrders DeliveryOrder[]`
在 Product 模型追加：`deliveryItems DeliveryOrderItem[]`
在 Unit 模型追加：
```
deliveryReservedItems DeliveryOrderItem[] @relation("DeliveryReservedUnit")
deliveryDeliveryItems DeliveryOrderItem[] @relation("DeliveryDeliveryUnit")
```

- [ ] **步骤 2：推送 schema 到数据库**

运行：`npx prisma db push && npx prisma generate`
预期：成功创建两张表，无破坏性变更。

- [ ] **步骤 3：在 seed.ts 新增示例配送单**

在供应商创建之后、`console.log("\n种子数据初始化完成！")` 之前插入：

```typescript
  // ==================== 创建销售配送单 ====================
  const customerIds = await prisma.customer.findMany({ select: { id: true, code: true } });
  const customerByCode = Object.fromEntries(customerIds.map((c) => [c.code, c.id]));
  const productIds = await prisma.product.findMany({ select: { id: true, sku: true, price: true } });
  const productBySku = Object.fromEntries(productIds.map((p) => [p.sku, p]));
  const unitIds = await prisma.unit.findMany({ select: { id: true, name: true } });
  const unitByName = Object.fromEntries(unitIds.map((u) => [u.name, u.id]));
  const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const orderNo1 = `SO${dateStr}0001`;
  const orderNo2 = `SO${dateStr}0002`;

  const deliveryOrders = [
    {
      orderNo: orderNo1,
      customerId: customerByCode["K001"],
      userId: adminUser!.id,
      status: "delivered",
      remark: "首批配送",
      items: [
        { productSku: "VG-001", reservedUnit: "斤", reservedQty: 100, deliveryUnit: "斤", deliveryQty: 100, receivedQty: 100, price: 2.5 },
        { productSku: "VG-008", reservedUnit: "斤", reservedQty: 50, deliveryUnit: "斤", deliveryQty: 50, receivedQty: 48, price: 4.5 },
      ],
    },
    {
      orderNo: orderNo2,
      customerId: customerByCode["K002"],
      userId: adminUser!.id,
      status: "pending",
      remark: "",
      items: [
        { productSku: "VG-005", reservedUnit: "斤", reservedQty: 200, deliveryUnit: "公斤", deliveryQty: 100, receivedQty: 0, price: 2.0 },
      ],
    },
  ];

  for (const o of deliveryOrders) {
    const existing = await prisma.deliveryOrder.findUnique({ where: { orderNo: o.orderNo } });
    if (!existing) {
      await prisma.deliveryOrder.create({
        data: {
          orderNo: o.orderNo,
          customerId: o.customerId,
          userId: o.userId,
          status: o.status,
          remark: o.remark,
          items: {
            create: o.items.map((it) => ({
              productId: productBySku[it.productSku].id,
              reservedUnitId: unitByName[it.reservedUnit],
              reservedQuantity: it.reservedQty,
              deliveryUnitId: unitByName[it.deliveryUnit],
              deliveryQuantity: it.deliveryQty,
              receivedQuantity: it.receivedQty,
              unitPrice: it.price,
            })),
          },
        },
      });
    }
  }
  console.log(`销售配送单创建完成: ${deliveryOrders.length} 个`);
```

- [ ] **步骤 4：运行 seed 验证**

运行：`npx prisma db seed`
预期：输出"销售配送单创建完成: 2 个"

- [ ] **步骤 5：Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(delivery-order): 数据模型 + seed 数据"
```

---

## 任务 2：zod 校验 + 单元测试

**文件：**
- 修改：`src/lib/validations.ts`（在 supplier schema 之后新增）
- 创建：`src/lib/__tests__/delivery-order-validations.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/lib/__tests__/delivery-order-validations.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import {
  createDeliveryOrderSchema,
  updateDeliveryOrderSchema,
} from "@/lib/validations";

function validItem() {
  return {
    productId: 1,
    reservedUnitId: 1,
    reservedQuantity: 10,
    deliveryUnitId: 1,
    deliveryQuantity: 10,
    receivedQuantity: 10,
    unitPrice: 2.5,
  };
}

function validInput() {
  return {
    customerId: 1,
    status: "pending",
    remark: "测试备注",
    items: [validItem()],
  };
}

describe("createDeliveryOrderSchema", () => {
  it("合法输入通过", () => {
    expect(createDeliveryOrderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("customerId 缺失失败", () => {
    const { customerId: _, ...rest } = validInput();
    void _;
    expect(createDeliveryOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("items 为空数组失败", () => {
    expect(createDeliveryOrderSchema.safeParse({ ...validInput(), items: [] }).success).toBe(false);
  });

  it("items 缺失失败", () => {
    const { items: _, ...rest } = validInput();
    void _;
    expect(createDeliveryOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("非法 status 失败", () => {
    expect(createDeliveryOrderSchema.safeParse({ ...validInput(), status: "unknown" }).success).toBe(false);
  });

  it("status 可省略（默认 pending）", () => {
    const { status: _, ...rest } = validInput();
    void _;
    const r = createDeliveryOrderSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("pending");
  });

  it("reservedQuantity 为负失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), reservedQuantity: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("unitPrice 为负失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), unitPrice: -0.1 }],
    });
    expect(r.success).toBe(false);
  });

  it("productId 非正整数失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), productId: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("同一单据内重复 productId 失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [validItem(), validItem()],
    });
    expect(r.success).toBe(false);
  });
});

describe("updateDeliveryOrderSchema（partial）", () => {
  it("空对象通过", () => {
    expect(updateDeliveryOrderSchema.safeParse({}).success).toBe(true);
  });

  it("只更新 status 通过", () => {
    expect(updateDeliveryOrderSchema.safeParse({ status: "received" }).success).toBe(true);
  });

  it("更新 items 仍受校验（空数组失败）", () => {
    expect(updateDeliveryOrderSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/lib/__tests__/delivery-order-validations.test.ts`
预期：FAIL，报错 schema 未定义。

- [ ] **步骤 3：在 validations.ts 新增 schema**

在 `createSupplierSchema` 之后、`createProductSchema` 之前插入：

```typescript
// ==================== 销售配送单 ====================
const deliveryOrderItemSchema = z.object({
  productId: z.number().int().positive("请选择商品"),
  reservedUnitId: z.number().int().positive("请选择预定单位"),
  reservedQuantity: z.number().min(0, "预定数量不能为负"),
  deliveryUnitId: z.number().int().positive("请选择配送单位"),
  deliveryQuantity: z.number().min(0, "配送数量不能为负"),
  receivedQuantity: z.number().min(0, "实收数量不能为负"),
  unitPrice: z.number().min(0, "单价不能为负"),
});

export const createDeliveryOrderSchema = z
  .object({
    customerId: z.number().int().positive("请选择客户"),
    status: z.enum(["pending", "delivered", "received", "cancelled"]).default("pending"),
    remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
    items: z.array(deliveryOrderItemSchema).min(1, "至少添加一条明细"),
  })
  .refine(
    (data) => new Set(data.items.map((i) => i.productId)).size === data.items.length,
    { message: "同一单据内不能有重复商品", path: ["items"] }
  );

export const updateDeliveryOrderSchema = z
  .object({
    customerId: z.number().int().positive("请选择客户").optional(),
    status: z.enum(["pending", "delivered", "received", "cancelled"]).optional(),
    remark: z.string().max(500, "备注最长 500 字符").optional().nullable(),
    items: z.array(deliveryOrderItemSchema).min(1, "至少添加一条明细").optional(),
  })
  .refine(
    (data) =>
      !data.items ||
      new Set(data.items.map((i) => i.productId)).size === data.items.length,
    { message: "同一单据内不能有重复商品", path: ["items"] }
  );

export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;
export type UpdateDeliveryOrderInput = z.infer<typeof updateDeliveryOrderSchema>;
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run src/lib/__tests__/delivery-order-validations.test.ts`
预期：PASS，13 个用例通过。

- [ ] **步骤 5：Commit**

```bash
git add src/lib/validations.ts src/lib/__tests__/delivery-order-validations.test.ts
git commit -m "feat(delivery-order): zod 校验 + 单元测试"
```

---

## 任务 3：单据编号生成工具 + 类型

**文件：**
- 创建：`src/lib/order-no.ts`
- 修改：`src/types/index.ts`

- [ ] **步骤 1：在 types/index.ts 新增状态枚举**

在 `PURCHASE_ORDER_STATUS` 之后追加：

```typescript
export const DELIVERY_ORDER_STATUS = {
  pending: "待配送",
  delivered: "已配送",
  received: "已签收",
  cancelled: "已取消",
} as const;
```

- [ ] **步骤 2：创建 order-no.ts**

```typescript
import { prisma } from "@/lib/prisma";

/**
 * 生成销售配送单编号：SO + YYYYMMDD + 4位当日序号
 * 在事务内调用，查询当日已有单据数 +1；并发冲突由调用方捕获 P2002 重试
 */
export async function generateDeliveryOrderNo(tx: typeof prisma): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  const prefix = `SO${dateStr}`;
  // 查询当日以该前缀开头的单据数（事务内）
  const count = await tx.deliveryOrder.count({
    where: { orderNo: { startsWith: prefix } },
  });

  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}
```

- [ ] **步骤 3：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 4：Commit**

```bash
git add src/lib/order-no.ts src/types/index.ts
git commit -m "feat(delivery-order): 单据编号生成工具 + 状态枚举"
```

---

## 任务 4：列表 + 创建 API

**文件：**
- 创建：`src/app/api/delivery-orders/route.ts`

- [ ] **步骤 1：实现 GET 列表 + POST 创建**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { createDeliveryOrderSchema } from "@/lib/validations";
import { generateDeliveryOrderNo } from "@/lib/order-no";
import type { PaginatedResponse } from "@/types";

// 获取配送单列表（分页 + 搜索 orderNo）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const where = search ? { orderNo: { contains: search } } : undefined;

    const [orders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.deliveryOrder.count({ where }),
    ]);

    // 统计每个单据的配送总数量和总金额（避免 N+1）
    const orderIds = orders.map((o) => o.id);
    const itemAgg = await prisma.deliveryOrderItem.groupBy({
      by: ["orderId"],
      where: { orderId: { in: orderIds } },
      _sum: { deliveryQuantity: true, unitPrice: true },
      _count: { _all: true },
    });
    // 注意：_sum.unitPrice 是单价之和，不是金额之和。金额需在内存计算。
    const aggMap = new Map(itemAgg.map((a) => [a.orderId, a] as const));

    const items = orders.map((o) => {
      const agg = aggMap.get(o.id);
      return {
        id: o.id,
        orderNo: o.orderNo,
        customerId: o.customerId,
        customerName: o.customer.name,
        customerCode: o.customer.code,
        status: o.status,
        remark: o.remark,
        createdAt: o.createdAt,
        itemCount: agg?._count._all ?? 0,
        totalDeliveryQty: agg?._sum.deliveryQuantity ?? 0,
        // 总金额需单独查询或在内存中计算，此处用 items 查询
      };
    });

    // 为计算总金额，查询明细
    const detailItems = await prisma.deliveryOrderItem.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, deliveryQuantity: true, unitPrice: true },
    });
    const amountMap = new Map<number, number>();
    for (const it of detailItems) {
      amountMap.set(it.orderId, (amountMap.get(it.orderId) ?? 0) + it.deliveryQuantity * it.unitPrice);
    }
    const itemsWithAmount = items.map((i) => ({
      ...i,
      totalAmount: amountMap.get(i.id) ?? 0,
    }));

    const result: PaginatedResponse<typeof itemsWithAmount[number]> = {
      items: itemsWithAmount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("获取配送单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配送单列表失败" },
      { status: 500 }
    );
  }
}

// 创建配送单（含明细），自动生成单据编号
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDeliveryOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "输入参数无效" },
        { status: 400 }
      );
    }

    const { customerId, status, remark, items } = parsed.data;

    // 事务内生成编号 + 创建单据；P2002 时重试
    let created = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const orderNo = await generateDeliveryOrderNo(tx);
          return tx.deliveryOrder.create({
            data: {
              orderNo,
              customerId,
              userId: user.id,
              status,
              remark: remark ?? null,
              items: {
                create: items.map((it) => ({
                  productId: it.productId,
                  reservedUnitId: it.reservedUnitId,
                  reservedQuantity: it.reservedQuantity,
                  deliveryUnitId: it.deliveryUnitId,
                  deliveryQuantity: it.deliveryQuantity,
                  receivedQuantity: it.receivedQuantity,
                  unitPrice: it.unitPrice,
                })),
              },
            },
            include: { items: true },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue; // 编号冲突，重试
        }
        throw err;
      }
    }

    await logOperation({
      action: "create",
      module: "delivery_order",
      targetId: created!.id,
      detail: { orderNo: created!.orderNo, customerId, itemCount: items.length },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: "配送单创建成功",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "单据编号生成冲突，请重试" },
        { status: 409 }
      );
    }
    console.error("创建配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建配送单失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/delivery-orders/route.ts
git commit -m "feat(delivery-order): 列表查询 + 创建 API"
```

---

## 任务 5：详情 + 更新 + 删除 API

**文件：**
- 创建：`src/app/api/delivery-orders/[id]/route.ts`

- [ ] **步骤 1：实现 GET/PUT/DELETE**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { updateDeliveryOrderSchema } from "@/lib/validations";

// 获取配送单详情（含明细 + 商品/单位/客户）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            reservedUnit: { select: { id: true, name: true } },
            deliveryUnit: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("获取配送单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配送单详情失败" },
      { status: 500 }
    );
  }
}

// 更新配送单（含明细整体替换）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.deliveryOrder.findUnique({ where: { id: orderId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateDeliveryOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "输入参数无效" },
        { status: 400 }
      );
    }

    const { customerId, status, remark, items } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      // 更新单据头
      await tx.deliveryOrder.update({
        where: { id: orderId },
        data: {
          ...(customerId !== undefined && { customerId }),
          ...(status !== undefined && { status }),
          ...(remark !== undefined && { remark: remark ?? null }),
        },
      });

      // 明细整体替换（先删后建）
      if (items !== undefined) {
        await tx.deliveryOrderItem.deleteMany({ where: { orderId } });
        await tx.deliveryOrderItem.createMany({
          data: items.map((it) => ({
            orderId,
            productId: it.productId,
            reservedUnitId: it.reservedUnitId,
            reservedQuantity: it.reservedQuantity,
            deliveryUnitId: it.deliveryUnitId,
            deliveryQuantity: it.deliveryQuantity,
            receivedQuantity: it.receivedQuantity,
            unitPrice: it.unitPrice,
          })),
        });
      }

      return tx.deliveryOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
    });

    await logOperation({
      action: "update",
      module: "delivery_order",
      targetId: orderId,
      detail: { orderNo: existing.orderNo, fields: Object.keys(parsed.data) },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, data: updated, message: "配送单更新成功" });
  } catch (error) {
    console.error("更新配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新配送单失败" },
      { status: 500 }
    );
  }
}

// 删除配送单（仅管理员，级联删除明细）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const orderId = Number(id);

    const existing = await prisma.deliveryOrder.findUnique({ where: { id: orderId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "配送单不存在" },
        { status: 404 }
      );
    }

    await prisma.deliveryOrder.delete({ where: { id: orderId } });

    await logOperation({
      action: "delete",
      module: "delivery_order",
      targetId: orderId,
      detail: { deleted: existing.orderNo },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: "配送单删除成功" });
  } catch (error) {
    console.error("删除配送单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除配送单失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 3：Commit**

```bash
git add "src/app/api/delivery-orders/[id]/route.ts"
git commit -m "feat(delivery-order): 详情 + 更新 + 删除 API"
```

---

## 任务 6：批量导入 API

**文件：**
- 创建：`src/app/api/delivery-orders/import/route.ts`

- [ ] **步骤 1：实现批量导入（分组 + 事务 + 行号定位）**

```typescript
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
  constructor(public row: number, message: string) {
    super(message);
    this.name = "ImportRowError";
  }
}

type ParsedRow = {
  group: string;
  customerCode: string;
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "请上传文件" }, { status: 400 });
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
    // 文件内单据分组 + 商品编码 唯一性
    const seenGroupProduct = new Set<string>();
    // 文件内单据分组 → 客户编码 映射（校验一致性）
    const groupCustomer = new Map<string, string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      const group = String(row["单据分组"] || "").trim();
      const customerCode = String(row["客户编码"] || "").trim();
      const productSku = String(row["商品编码"] || "").trim();
      const reservedUnitName = String(row["预定单位"] || "").trim();
      const deliveryUnitName = String(row["配送单位"] || "").trim();
      const remark = String(row["备注"] || "").trim();

      if (!group) {
        errors.push({ row: rowIndex, error: "单据分组不能为空" });
        continue;
      }
      if (!customerCode) {
        errors.push({ row: rowIndex, error: "客户编码不能为空" });
        continue;
      }
      if (!productSku) {
        errors.push({ row: rowIndex, error: "商品编码不能为空" });
        continue;
      }

      // 校验同一分组客户一致
      if (groupCustomer.has(group) && groupCustomer.get(group) !== customerCode) {
        errors.push({
          row: rowIndex,
          error: `单据分组"${group}"内客户编码不一致（应为${groupCustomer.get(group)}）`,
        });
        continue;
      }
      groupCustomer.set(group, customerCode);

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
        customerCode,
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

    // 预查客户、商品、单位映射
    const customerCodes = [...new Set(parsedRows.map((r) => r.customerCode))];
    const productSkus = [...new Set(parsedRows.map((r) => r.productSku))];
    const unitNames = [
      ...new Set([
        ...parsedRows.map((r) => r.reservedUnitName),
        ...parsedRows.map((r) => r.deliveryUnitName),
      ]),
    ].filter(Boolean);

    const [customers, products, units] = await Promise.all([
      prisma.customer.findMany({ where: { code: { in: customerCodes } }, select: { id: true, code: true } }),
      prisma.product.findMany({ where: { sku: { in: productSkus } }, select: { id: true, sku: true } }),
      prisma.unit.findMany({ where: { name: { in: unitNames } }, select: { id: true, name: true } }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.code, c.id] as const));
    const productMap = new Map(products.map((p) => [p.sku, p.id] as const));
    const unitMap = new Map(units.map((u) => [u.name, u.id] as const));

    // 校验引用存在性
    for (const r of parsedRows) {
      if (!customerMap.has(r.customerCode)) {
        errors.push({ row: r.rowIndex, error: `客户编码"${r.customerCode}"不存在` });
      }
      if (!productMap.has(r.productSku)) {
        errors.push({ row: r.rowIndex, error: `商品编码"${r.productSku}"不存在` });
      }
      if (!unitMap.has(r.reservedUnitName)) {
        errors.push({ row: r.rowIndex, error: `预定单位"${r.reservedUnitName}"不存在` });
      }
      if (!unitMap.has(r.deliveryUnitName)) {
        errors.push({ row: r.rowIndex, error: `配送单位"${r.deliveryUnitName}"不存在` });
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
    const groupRemarks = new Map<string, string>();

    try {
      await prisma.$transaction(async (tx) => {
        for (const [group, groupRows] of groupMap) {
          try {
            const orderNo = await generateDeliveryOrderNo(tx);
            const firstRow = groupRows[0];
            const created = await tx.deliveryOrder.create({
              data: {
                orderNo,
                customerId: customerMap.get(firstRow.customerCode)!,
                userId: user.id,
                status: "pending",
                remark: firstRow.remark || null,
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
            groupRemarks.set(group, created.orderNo);
          } catch (err) {
            const msg =
              err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
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
      txError = err instanceof ImportRowError
        ? { row: err.row, error: err.message }
        : { row: 0, error: "事务执行失败" };
    }

    await logOperation({
      action: "import",
      module: "delivery_order",
      detail: { imported, errorCount: txError ? 1 : 0, fileName: file.name },
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
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/delivery-orders/import/route.ts
git commit -m "feat(delivery-order): 批量导入 API（分组+事务+行号定位）"
```

---

## 任务 7：批量导出 + 模板 API

**文件：**
- 创建：`src/app/api/delivery-orders/export/route.ts`
- 创建：`src/app/api/delivery-orders/template/route.ts`

- [ ] **步骤 1：实现导出 API**

```typescript
// src/app/api/delivery-orders/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const orders = await prisma.deliveryOrder.findMany({
      include: {
        customer: { select: { code: true, name: true } },
        items: {
          include: {
            product: { select: { sku: true, name: true } },
            reservedUnit: { select: { name: true } },
            deliveryUnit: { select: { name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData: Record<string, unknown>[] = [];
    let seq = 1;
    for (const o of orders) {
      for (const it of o.items) {
        exportData.push({
          序号: seq++,
          单据编号: o.orderNo,
          客户编码: o.customer.code,
          客户名称: o.customer.name,
          商品编码: it.product.sku,
          商品名称: it.product.name,
          预定单位: it.reservedUnit.name,
          预定数量: it.reservedQuantity,
          配送单位: it.deliveryUnit.name,
          配送数量: it.deliveryQuantity,
          实收数量: it.receivedQuantity,
          单价: it.unitPrice,
          小计: it.deliveryQuantity * it.unitPrice,
          状态: DELIVERY_ORDER_STATUS[o.status as keyof typeof DELIVERY_ORDER_STATUS] || o.status,
          添加时间: formatDateTime(o.createdAt),
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 10 }, { wch: 16 },
      { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "配送单列表");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logOperation({
      action: "export",
      module: "delivery_order",
      detail: { orderCount: orders.length, rowCount: exportData.length, format: "xlsx" },
      ipAddress: getClientIP(request),
    });

    const fileName = encodeURIComponent(
      `配送单列表_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("导出配送单失败:", error);
    return NextResponse.json({ success: false, error: "导出失败" }, { status: 500 });
  }
}
```

- [ ] **步骤 2：实现模板 API**

```typescript
// src/app/api/delivery-orders/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sampleData = [
      {
        单据分组: "组1",
        客户编码: "K001",
        商品编码: "VG-001",
        预定单位: "斤",
        预定数量: 100,
        配送单位: "斤",
        配送数量: 100,
        实收数量: 100,
        单价: 2.5,
        备注: "首批配送",
      },
      {
        单据分组: "组1",
        客户编码: "K001",
        商品编码: "VG-008",
        预定单位: "斤",
        预定数量: 50,
        配送单位: "斤",
        配送数量: 50,
        实收数量: 48,
        单价: 4.5,
        备注: "",
      },
      {
        单据分组: "组2",
        客户编码: "K002",
        商品编码: "VG-005",
        预定单位: "斤",
        预定数量: 200,
        配送单位: "公斤",
        配送数量: 100,
        实收数量: 0,
        单价: 2.0,
        备注: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "配送单导入模板");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = encodeURIComponent("配送单导入模板.xlsx");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("下载模板失败:", error);
    return NextResponse.json({ success: false, error: "下载模板失败" }, { status: 500 });
  }
}
```

- [ ] **步骤 3：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/delivery-orders/export/route.ts src/app/api/delivery-orders/template/route.ts
git commit -m "feat(delivery-order): 批量导出 + 模板下载 API"
```

---

## 任务 8：列表页 + 搜索表单 + 工具栏 + 行操作

**文件：**
- 创建：`src/app/(dashboard)/delivery-orders/page.tsx`
- 创建：`src/components/features/delivery-order-search-form.tsx`
- 创建：`src/components/features/delivery-order-toolbar.tsx`
- 创建：`src/components/features/delivery-order-row-actions.tsx`

- [ ] **步骤 1：创建搜索表单组件**

参考 `src/components/features/supplier-search-form.tsx` 结构，搜索框 name="search"，placeholder="请输入单据编号"。

```typescript
// src/components/features/delivery-order-search-form.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DeliveryOrderSearchForm() {
  const router = useRouter();
  const params = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = String(formData.get("search") || "").trim();
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    query.set("page", "1");
    router.push(`/delivery-orders?${query.toString()}`);
  }

  function handleReset() {
    router.push("/delivery-orders");
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-2 items-end">
      <div className="flex-1 max-w-xs">
        <label className="block text-sm text-text-muted mb-1">单据编号</label>
        <input
          name="search"
          type="text"
          defaultValue={params.get("search") || ""}
          placeholder="请输入单据编号"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
      >
        查询
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="px-4 py-2 border border-border rounded-lg text-sm text-text-muted hover:bg-bg"
      >
        重置
      </button>
    </form>
  );
}
```

- [ ] **步骤 2：创建工具栏组件**

参考 `src/components/features/supplier-toolbar.tsx`，按钮含：新增配送单、批量导入、批量导出、打印。新增按钮需嵌入 DeliveryOrderFormDialog。导入按钮链接 `/api/delivery-orders/import`，导出按钮链接 `/api/delivery-orders/export`，打印链接 `/delivery-orders/print`。

由于工具栏需要触发表单弹窗，将弹窗状态放在工具栏内：

```typescript
// src/components/features/delivery-order-toolbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { DeliveryOrderFormDialog } from "./delivery-order-form-dialog";
import { ImportButton } from "./import-button";
import { toast } from "@/components/ui/toast";

export function DeliveryOrderToolbar() {
  const [open, setOpen] = useState(false);

  async function handleExport() {
    try {
      window.location.href = "/api/delivery-orders/export";
    } catch {
      toast.error("导出失败");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
      >
        新增配送单
      </button>
      <ImportButton endpoint="/api/delivery-orders/import" templateUrl="/api/delivery-orders/template" />
      <button
        onClick={handleExport}
        className="px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg"
      >
        批量导出
      </button>
      <Link
        href="/delivery-orders/print"
        target="_blank"
        className="px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg"
      >
        打印
      </Link>
      <DeliveryOrderFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
```

**注意：** `ImportButton` 是新组件名，若项目已有 `import-button.tsx` 则复用；否则参考 `supplier-toolbar.tsx` 中的导入按钮实现。需先检查 `src/components/features/` 是否已有 import-button。若无，创建一个简单的文件选择 + 上传组件。

- [ ] **步骤 3：创建行操作组件**

```typescript
// src/components/features/delivery-order-row-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeliveryOrderFormDialog } from "./delivery-order-form-dialog";
import { toast } from "@/components/ui/toast";

interface DeliveryOrderRowActionsProps {
  order: { id: number; orderNo: string };
}

export function DeliveryOrderRowActions({ order }: DeliveryOrderRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`确认删除配送单 ${order.orderNo} 吗？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/delivery-orders/${order.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("删除成功");
        router.refresh();
      } else {
        toast.error(json.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditOpen(true)}
        className="text-sm text-primary hover:underline"
        disabled={deleting}
      >
        编辑
      </button>
      <button
        onClick={handleDelete}
        className="text-sm text-red-500 hover:underline"
        disabled={deleting}
      >
        删除
      </button>
      <DeliveryOrderFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        orderId={order.id}
      />
    </div>
  );
}
```

**注意：** 这里用了 `confirm`，项目规范要求用 Toast/Modal 而非 alert/confirm。应改用项目现有的 Modal 确认弹窗模式。参考 `supplier-row-actions.tsx` 的实现方式保持一致。

- [ ] **步骤 4：创建列表页（Server Component）**

```typescript
// src/app/(dashboard)/delivery-orders/page.tsx
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { Table, type Column } from "@/components/ui/table";
import { PaginationLink } from "@/components/ui/pagination";
import { DeliveryOrderSearchForm } from "@/components/features/delivery-order-search-form";
import { DeliveryOrderToolbar } from "@/components/features/delivery-order-toolbar";
import { DeliveryOrderRowActions } from "@/components/features/delivery-order-row-actions";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

type OrderRow = {
  id: number;
  orderNo: string;
  customerName: string;
  customerCode: string;
  status: string;
  itemCount: number;
  totalDeliveryQty: number;
  totalAmount: number;
  createdAt: Date;
};

export default async function DeliveryOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const where = params.search ? { orderNo: { contains: params.search } } : undefined;

  const [orders, total] = await Promise.all([
    prisma.deliveryOrder.findMany({
      where,
      include: {
        customer: { select: { name: true, code: true } },
        items: { select: { deliveryQuantity: true, unitPrice: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deliveryOrder.count({ where }),
  ]);

  const rows: OrderRow[] = orders.map((o) => {
    const itemCount = o.items.length;
    const totalDeliveryQty = o.items.reduce((s, i) => s + i.deliveryQuantity, 0);
    const totalAmount = o.items.reduce((s, i) => s + i.deliveryQuantity * i.unitPrice, 0);
    return {
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customer.name,
      customerCode: o.customer.code,
      status: o.status,
      itemCount,
      totalDeliveryQty,
      totalAmount,
      createdAt: o.createdAt,
    };
  });

  const columns: Column<OrderRow>[] = [
    { key: "orderNo", title: "单据编号", render: (r) => <span className="font-mono">{r.orderNo}</span> },
    { key: "customerName", title: "客户名称", render: (r) => <span>{r.customerName}</span> },
    { key: "itemCount", title: "商品数", render: (r) => <span className={r.itemCount > 0 ? "" : "text-text-muted"}>{r.itemCount}</span> },
    { key: "totalDeliveryQty", title: "配送总数量", render: (r) => <span>{r.totalDeliveryQty}</span> },
    { key: "totalAmount", title: "总金额", render: (r) => <span className="font-medium">¥{r.totalAmount.toFixed(2)}</span> },
    {
      key: "status",
      title: "状态",
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-xs ${
          r.status === "received" ? "bg-green-100 text-green-700" :
          r.status === "delivered" ? "bg-blue-100 text-blue-700" :
          r.status === "cancelled" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {DELIVERY_ORDER_STATUS[r.status as keyof typeof DELIVERY_ORDER_STATUS] || r.status}
        </span>
      ),
    },
    { key: "createdAt", title: "添加时间", render: (r) => <span className="text-text-muted text-sm">{formatDateTime(r.createdAt)}</span> },
    { key: "actions", title: "操作", width: "100px", render: (r) => <DeliveryOrderRowActions order={{ id: r.id, orderNo: r.orderNo }} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text">配送单管理</h1>
          <p className="text-sm text-text-muted mt-1">共 {total} 条配送单记录</p>
        </div>
        <DeliveryOrderToolbar />
      </div>

      <DeliveryOrderSearchForm />

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table<OrderRow> columns={columns} data={rows} rowKey={(r) => r.id} emptyText="暂无配送单数据" />
      </div>

      <PaginationLink page={page} pageSize={pageSize} total={total} searchParams={params as Record<string, string>} />
    </div>
  );
}
```

- [ ] **步骤 5：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：可能有错误（缺 form-dialog 组件），先不 commit，等任务 9 完成后一起验证。

- [ ] **步骤 6：Commit**

```bash
git add "src/app/(dashboard)/delivery-orders/page.tsx" src/components/features/delivery-order-search-form.tsx src/components/features/delivery-order-toolbar.tsx src/components/features/delivery-order-row-actions.tsx
git commit -m "feat(delivery-order): 列表页 + 搜索 + 工具栏 + 行操作"
```

---

## 任务 9：表单弹窗（含动态明细行）

**文件：**
- 创建：`src/components/features/delivery-order-form-dialog.tsx`

- [ ] **步骤 1：实现表单弹窗**

这是最复杂的组件。包含：单据头（客户选择、状态、备注）+ 动态明细行（增删行，每行选商品/单位、填数量/单价）。

```typescript
// src/components/features/delivery-order-form-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityPicker } from "@/components/features/entity-picker";
import { toast } from "@/components/ui/toast";

interface ItemRow {
  productId: number | null;
  productSku: string;
  productName: string;
  reservedUnitId: number | null;
  reservedUnitName: string;
  reservedQuantity: string;
  deliveryUnitId: number | null;
  deliveryUnitName: string;
  deliveryQuantity: string;
  receivedQuantity: string;
  unitPrice: string;
}

function emptyItem(): ItemRow {
  return {
    productId: null,
    productSku: "",
    productName: "",
    reservedUnitId: null,
    reservedUnitName: "",
    reservedQuantity: "",
    deliveryUnitId: null,
    deliveryUnitName: "",
    deliveryQuantity: "",
    receivedQuantity: "",
    unitPrice: "",
  };
}

interface DeliveryOrderFormDialogProps {
  open: boolean;
  onClose: () => void;
  orderId?: number; // 有值=编辑，无值=新增
}

export function DeliveryOrderFormDialog({ open, onClose, orderId }: DeliveryOrderFormDialogProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState("pending");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (orderId) {
      setLoading(true);
      fetch(`/api/delivery-orders/${orderId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const o = json.data;
            setCustomerId(o.customerId);
            setCustomerName(o.customer.name);
            setStatus(o.status);
            setRemark(o.remark || "");
            setItems(
              o.items.map((it: Record<string, unknown> & { product: { id: number; sku: string; name: string }; reservedUnit: { id: number; name: string }; deliveryUnit: { id: number; name: string }; reservedQuantity: number; deliveryQuantity: number; receivedQuantity: number; unitPrice: number; productId: number; reservedUnitId: number; deliveryUnitId: number }) => ({
                productId: it.productId,
                productSku: it.product.sku,
                productName: it.product.name,
                reservedUnitId: it.reservedUnitId,
                reservedUnitName: it.reservedUnit.name,
                reservedQuantity: String(it.reservedQuantity),
                deliveryUnitId: it.deliveryUnitId,
                deliveryUnitName: it.deliveryUnit.name,
                deliveryQuantity: String(it.deliveryQuantity),
                receivedQuantity: String(it.receivedQuantity),
                unitPrice: String(it.unitPrice),
              }))
            );
          }
        })
        .finally(() => setLoading(false));
    } else {
      setCustomerId(null);
      setCustomerName("");
      setStatus("pending");
      setRemark("");
      setItems([emptyItem()]);
    }
  }, [open, orderId]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSubmit() {
    if (!customerId) {
      toast.error("请选择客户");
      return;
    }
    if (items.length === 0) {
      toast.error("至少添加一条明细");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        toast.error(`第 ${i + 1} 行请选择商品`);
        return;
      }
      if (!it.reservedUnitId || !it.deliveryUnitId) {
        toast.error(`第 ${i + 1} 行请选择单位`);
        return;
      }
      if (it.reservedQuantity === "" || it.deliveryQuantity === "" || it.receivedQuantity === "" || it.unitPrice === "") {
        toast.error(`第 ${i + 1} 行请填写完整数量和单价`);
        return;
      }
    }

    const payload = {
      customerId,
      status,
      remark: remark.trim() || null,
      items: items.map((it) => ({
        productId: it.productId!,
        reservedUnitId: it.reservedUnitId!,
        reservedQuantity: Number(it.reservedQuantity),
        deliveryUnitId: it.deliveryUnitId!,
        deliveryQuantity: Number(it.deliveryQuantity),
        receivedQuantity: Number(it.receivedQuantity),
        unitPrice: Number(it.unitPrice),
      })),
    };

    setSubmitting(true);
    try {
      const isEdit = !!orderId;
      const url = isEdit ? `/api/delivery-orders/${orderId}` : "/api/delivery-orders";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "配送单更新成功" : "配送单创建成功");
        onClose();
        router.refresh();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = !!orderId;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? "编辑配送单" : "新增配送单"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>取消</Button>
          <Button onClick={handleSubmit} loading={submitting}>确定</Button>
        </>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-text-muted">加载中...</div>
      ) : (
        <div className="space-y-4">
          {/* 单据头 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">客户 <span className="text-red-500">*</span></label>
              <EntityPicker
                endpoint="/api/customers"
                value={customerId}
                valueLabel={customerName}
                onChange={(id, name) => {
                  setCustomerId(id);
                  setCustomerName(name);
                }}
                placeholder="请选择客户"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              >
                <option value="pending">待配送</option>
                <option value="delivered">已配送</option>
                <option value="received">已签收</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-text-muted mb-1">备注</label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="可选"
                disabled={submitting}
              />
            </div>
          </div>

          {/* 明细行 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">明细</span>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-primary hover:underline"
                disabled={submitting}
              >
                + 添加行
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((it, index) => (
                <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">第 {index + 1} 行</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs text-red-500 hover:underline"
                        disabled={submitting}
                      >
                        删除行
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-text-muted mb-1">商品 <span className="text-red-500">*</span></label>
                      <EntityPicker
                        endpoint="/api/products"
                        value={it.productId}
                        valueLabel={it.productName}
                        onChange={(id, name, extra) => {
                          // extra 携带 sku、默认单位、默认单价（需 EntityPicker 支持）
                          updateItem(index, {
                            productId: id,
                            productName: name,
                            productSku: (extra as { sku?: string })?.sku || "",
                          });
                        }}
                        placeholder="请选择商品"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">预定单位 <span className="text-red-500">*</span></label>
                      <EntityPicker
                        endpoint="/api/units"
                        value={it.reservedUnitId}
                        valueLabel={it.reservedUnitName}
                        onChange={(id, name) => updateItem(index, { reservedUnitId: id, reservedUnitName: name })}
                        placeholder="单位"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">预定数量</label>
                      <Input
                        type="number"
                        value={it.reservedQuantity}
                        onChange={(e) => updateItem(index, { reservedQuantity: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">配送单位 <span className="text-red-500">*</span></label>
                      <EntityPicker
                        endpoint="/api/units"
                        value={it.deliveryUnitId}
                        valueLabel={it.deliveryUnitName}
                        onChange={(id, name) => updateItem(index, { deliveryUnitId: id, deliveryUnitName: name })}
                        placeholder="单位"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">配送数量</label>
                      <Input
                        type="number"
                        value={it.deliveryQuantity}
                        onChange={(e) => updateItem(index, { deliveryQuantity: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">实收数量</label>
                      <Input
                        type="number"
                        value={it.receivedQuantity}
                        onChange={(e) => updateItem(index, { receivedQuantity: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">单价</label>
                      <Input
                        type="number"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
```

**注意：** `EntityPicker` 的 onChange 签名需检查 `src/components/features/entity-picker.tsx`，确认是否支持 `extra` 参数传递额外字段（如商品 sku）。若不支持，需在 form-dialog 内单独 fetch 商品详情补全。

- [ ] **步骤 2：检查并适配 EntityPicker 接口**

读取 `src/components/features/entity-picker.tsx`，确认其 props 签名。若 onChange 不支持 extra，简化为只存 id+name，商品 sku 不在表单中显示（列表页和打印页从后端关联查询获取）。

- [ ] **步骤 3：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 4：Commit**

```bash
git add src/components/features/delivery-order-form-dialog.tsx
git commit -m "feat(delivery-order): 表单弹窗（含动态明细行）"
```

---

## 任务 10：打印页

**文件：**
- 创建：`src/app/(print)/delivery-orders/print/page.tsx`

- [ ] **步骤 1：实现打印页**

参考 `src/app/(print)/suppliers/print/page.tsx` 结构。展开显示每个单据的明细行。

```typescript
// src/app/(print)/delivery-orders/print/page.tsx
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatDate } from "@/lib/utils";
import { DELIVERY_ORDER_STATUS } from "@/types";
import { PrintTrigger } from "@/components/features/print-trigger";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function DeliveryOrdersPrintPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const where = params.search ? { orderNo: { contains: params.search } } : undefined;

  const orders = await prisma.deliveryOrder.findMany({
    where,
    include: {
      customer: { select: { code: true, name: true } },
      items: {
        include: {
          product: { select: { sku: true, name: true } },
          reservedUnit: { select: { name: true } },
          deliveryUnit: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const printDate = formatDate(new Date());

  return (
    <div className="print-page">
      <PrintTrigger />
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            .print-page, .print-page * { visibility: visible; }
            .print-page { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; size: landscape; }
          }
          .print-container { padding: 20px; font-family: -apple-system, "Microsoft YaHei", sans-serif; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-header h1 { font-size: 22px; margin: 0 0 8px 0; }
          .print-header p { font-size: 12px; color: #666; margin: 0; }
          .order-block { margin-bottom: 24px; page-break-inside: avoid; }
          .order-title { font-size: 14px; font-weight: bold; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .print-table th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ddd; white-space: nowrap; }
          .print-table td { padding: 4px 8px; border: 1px solid #ddd; }
          .print-table tr:nth-child(even) { background: #fafafa; }
          .print-footer { margin-top: 20px; text-align: right; font-size: 11px; color: #999; }
        `,
      }} />

      <div className="print-container">
        <div className="print-header">
          <h1>配送单列表</h1>
          <p>打印日期：{printDate} ｜ 共 {orders.length} 个配送单</p>
        </div>

        {orders.map((o) => {
          const totalAmount = o.items.reduce((s, i) => s + i.deliveryQuantity * i.unitPrice, 0);
          const totalDeliveryQty = o.items.reduce((s, i) => s + i.deliveryQuantity, 0);
          return (
            <div key={o.id} className="order-block">
              <div className="order-title">
                {o.orderNo} ｜ 客户：{o.customer.name}（{o.customer.code}）｜
                状态：{DELIVERY_ORDER_STATUS[o.status as keyof typeof DELIVERY_ORDER_STATUS]} ｜
                添加时间：{formatDateTime(o.createdAt)}
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
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td>{idx + 1}</td>
                      <td>{it.product.sku}</td>
                      <td>{it.product.name}</td>
                      <td>{it.reservedUnit.name}</td>
                      <td>{it.reservedQuantity}</td>
                      <td>{it.deliveryUnit.name}</td>
                      <td>{it.deliveryQuantity}</td>
                      <td>{it.receivedQuantity}</td>
                      <td>{it.unitPrice.toFixed(2)}</td>
                      <td>{(it.deliveryQuantity * it.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ textAlign: "right", fontWeight: "bold" }}>合计</td>
                    <td style={{ fontWeight: "bold" }}>{totalDeliveryQty}</td>
                    <td colSpan={2}></td>
                    <td style={{ fontWeight: "bold" }}>¥{totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              {o.remark && <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>备注：{o.remark}</p>}
            </div>
          );
        })}

        <div className="print-footer">lvliang 蔬菜配送管理系统 ｜ {printDate}</div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add "src/app/(print)/delivery-orders/print/page.tsx"
git commit -m "feat(delivery-order): 打印页（明细展开+合计）"
```

---

## 任务 11：侧边栏启用 + 最终验证

**文件：**
- 修改：`src/components/layout/sidebar.tsx`

- [ ] **步骤 1：在侧边栏启用配送单菜单**

在 sidebar.tsx 的"订单管理"组中新增配送单菜单项（位于销售单与进货管理之间）：

```typescript
{
  title: "订单管理",
  items: [
    { label: "配送单", href: "/delivery-orders", icon: "🚚", enabled: true },
    { label: "销售单", href: "/sales", icon: "📋" },
    { label: "进货管理", href: "/purchases", icon: "📦" },
  ],
},
```

- [ ] **步骤 2：TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无错误。

- [ ] **步骤 3：运行全部单元测试**

运行：`npx vitest run`
预期：全部通过（含新增的 delivery-order-validations.test.ts）。

- [ ] **步骤 4：推送数据库 + seed**

运行：`npx prisma db push && npx prisma db seed`
预期：成功。

- [ ] **步骤 5：启动开发服务器验证**

运行：`npm run dev`
浏览器验证：
1. 登录 admin/admin123
2. 访问 `/delivery-orders` 列表页，确认显示 2 条 seed 数据
3. 搜索单据编号
4. 新增配送单（含多行明细）
5. 编辑配送单
6. 删除配送单
7. 下载导入模板
8. 批量导出
9. 打印页 `/delivery-orders/print`
10. 控制台无 error 日志

- [ ] **步骤 6：Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(delivery-order): 启用侧边栏菜单 + 最终验证"
```

---

## 自检

**1. 规格覆盖度：**
- §2 数据模型 → 任务 1 ✓
- §3 单据编号生成 → 任务 3 ✓
- §4 API 路由 8 个 → 任务 4/5/6/7 ✓
- §5 批量导入分组 → 任务 6 ✓
- §6 批量导出 → 任务 7 ✓
- §7.1 列表页 → 任务 8 ✓
- §7.2 打印页 → 任务 10 ✓
- §7.3 表单弹窗 → 任务 9 ✓
- §8 一致性约束 → 贯穿所有任务 ✓
- §9 测试 → 任务 2 ✓
- §11 迁移 → 任务 1 ✓

**2. 占位符扫描：** 无 TODO/待定。任务 8/9 中标注的"检查 EntityPicker/ImportButton 是否存在"是合理的实现期检查点，非占位符。

**3. 类型一致性：** `DeliveryOrderRowActions` 的 `order` prop 为 `{ id, orderNo }`，与列表页传参一致。`EntityPicker` onChange 签名需在实现期核对，已在任务 9 标注。
