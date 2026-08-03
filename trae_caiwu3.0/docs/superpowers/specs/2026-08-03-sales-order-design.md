# 销售单管理模块设计规格

日期：2026-08-03
状态：已确认

## 1. 背景与目标

新增"销售单"模块，作为配送单的对账汇总层。一张销售单对应一张配送单（1:1），从配送单明细自动计算三种金额（单据金额/预定金额/配送金额），便于财务对账与查询。

与已有 delivery-orders/customers/suppliers 模块保持一致的工程规范：Server Component 数据获取、RBAC（requireAuth）、zod 校验、logOperation、Table 复用、Toast、批量导入导出、打印。

## 2. 数据模型

### 2.1 重写 SalesOrder 模型

现有 `SalesOrder` 模型无 API/前端代码，可安全重写。删除 `SalesOrderItem` 模型（新销售单无独立明细，金额从配送单明细计算）。

```prisma
model SalesOrder {
  id              Int      @id @default(autoincrement())
  salesNo         String   @unique // 自动生成：XS + YYYYMMDD + 4位序号（如 XS202608030001）
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

### 2.2 需移除的模型

删除 `SalesOrderItem`（现有无数据、无代码引用）。同时移除 `SalesOrder` 现有的 `totalAmount`/`status` 字段（金额改为查询时计算，状态沿用关联配送单的 status）。

### 2.3 字段映射（满足需求）

| 需求字段 | 数据来源 |
|---------|---------|
| 销售单编码 | `salesNo`（自动生成） |
| 客户名称/编码/简称 | 关联 `Customer` 表查询 |
| 单据编号 | 关联 `DeliveryOrder.orderNo` |
| 单据金额 | `SUM(items.receivedQuantity * unitPrice)` |
| 预定金额 | `SUM(items.reservedQuantity * unitPrice)` |
| 配送金额 | `SUM(items.deliveryQuantity * unitPrice)` |

三个金额字段**不存储**，查询时从配送单明细聚合计算（避免数据冗余和不一致）。

## 3. API 设计

所有路由均使用 `requireAuth` + zod 校验 + `logOperation`。路由文件位于 `src/app/api/sales/`。

### 3.1 GET /api/sales

列表查询，支持分页与搜索。

- 参数：`page`（默认 1）、`pageSize`（默认 20，最大 100）、`search`（匹配 salesNo）
- 返回 `PaginatedResponse`，每项含聚合金额：

```ts
{
  id, salesNo,
  deliveryOrderId, deliveryOrderNo,  // 配送单 id 与 orderNo
  customerId, customerCode, customerName, customerShortName,
  orderAmount,    // SUM(receivedQuantity * unitPrice)
  reservedAmount, // SUM(reservedQuantity * unitPrice)
  deliveryAmount, // SUM(deliveryQuantity * unitPrice)
  deliveryStatus, // 关联配送单状态
  remark, createdAt
}
```

### 3.2 POST /api/sales

创建销售单（1:1 绑定配送单）。

- 请求体：`{ deliveryOrderId: number, remark?: string }`
- 校验：
  - 配送单必须存在
  - 该配送单未被其他销售单绑定（`deliveryOrderId @unique` 保证）
- 自动生成 salesNo（`XS` + YYYYMMDD + 4位序号），在事务内生成，P2002 时重试最多 3 次
- 日志：`{ action: "create", module: "sales_order", targetId, detail: { salesNo, deliveryOrderId } }`

### 3.3 GET /api/sales/[id]

详情查询，含配送单明细列表。

### 3.4 PUT /api/sales/[id]

更新备注等有限字段（salesNo、deliveryOrderId 不可改）。

### 3.5 DELETE /api/sales/[id]

删除销售单（不级联删除配送单）。返回前校验存在性。

### 3.6 POST /api/sales/import

批量导入。Excel 模板含"单据编号"列，系统按此匹配配送单 orderNo 自动创建销售单。

- 同文件内重复 orderNo 校验
- 配送单不存在或已绑定销售单的行作为错误返回
- 事务保证全部成功或全部回滚
- 携带行号的错误列表返回前端

### 3.7 GET /api/sales/export

批量导出当前列表数据为 xlsx。

### 3.8 GET /api/sales/template

下载导入模板。

## 4. 前端页面

### 4.1 列表页 `src/app/(dashboard)/sales/page.tsx`

Server Component 数据获取（参考 delivery-orders/page.tsx 模式）。

- 顶部标题 + 工具栏（新增、批量导入、批量导出、打印）
- 搜索表单（按 salesNo 搜索）
- Table 列：销售单编码、客户名称、客户编码、客户简称、单据编号、单据金额、预定金额、配送金额、状态、添加时间、操作
- 分页组件 `PaginationLink`

### 4.2 打印页 `src/app/(print)/sales/print/page.tsx`

Server Component 数据获取，打印当前搜索条件下的所有数据（不分页或取较大 pageSize），使用 `@media print` 样式。

### 4.3 组件

- `src/components/features/sales-form-dialog.tsx` - 新增弹窗，含配送单选择器（复用 EntityPicker，apiUrl=/api/delivery-orders）
- `src/components/features/sales-search-form.tsx` - 搜索表单
- `src/components/features/sales-toolbar.tsx` - 工具栏（导入/导出/打印/新增）
- `src/components/features/sales-row-actions.tsx` - 行操作（编辑/删除/查看详情）

### 4.4 侧边栏

在 `src/components/layout/sidebar.tsx` 的"订单管理"组中，将"销售单"项设为 `enabled: true`，href 指向 `/sales`。

## 5. 工程规范

- 路由文件位于 `src/app/api/sales/`
- 页面文件位于 `src/app/(dashboard)/sales/`
- 打印页位于 `src/app/(print)/sales/print/`
- 组件位于 `src/components/features/`
- 复用 `Table` 组件及 `Column<T>` 类型
- 错误提示用 Toast，不用 alert
- API 用 `withAuth`/`requireAuth` 包装，固定骨架：鉴权 → 校验 → 业务 → 日志 → 响应
- zod 校验输入（`createSalesOrderSchema`、`updateSalesOrderSchema`）
- 单元测试：`src/lib/__tests__/sales-order-validations.test.ts`

## 6. 单据编号生成

复用 `src/lib/order-no.ts` 模式，新增 `generateSalesOrderNo(tx)`：
- 前缀 `XS`
- 日期格式 YYYYMMDD
- 4 位流水号，基于当日已有销售单数 +1
- 在事务内查询+生成，避免并发冲突
- P2002（unique 冲突）时重试最多 3 次

## 7. 批量导入格式

模板列（单行表头）：
```
单据编号 | 备注
```

导入逻辑：
1. 解析 Excel，逐行提取 `orderNo` 与可选 `remark`
2. 同文件内 `orderNo` 唯一性校验（重复行进入错误列表）
3. zod 逐行校验
4. 事务内：按 `orderNo` 查配送单 → 校验未被绑定 → 创建销售单
5. 任何行失败则整体回滚，返回携带行号的错误列表

## 8. 测试

- zod 校验测试：合法/非法输入
- 编号生成测试：并发冲突重试
- （可选）导入逻辑的边界用例
