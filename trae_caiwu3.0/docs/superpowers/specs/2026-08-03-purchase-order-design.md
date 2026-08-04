# 进货管理模块设计规格

## 目标

实现进货管理模块的完整 CRUD、批量导入导出、打印功能，与现有配送单/销售单模块保持架构一致。

## 技术栈

Next.js 16 + TypeScript + Prisma 5 + SQLite + TailwindCSS 4

## 1. 数据模型

### 1.1 PurchaseOrder（主表，重构）

```prisma
model PurchaseOrder {
  id          Int      @id @default(autoincrement())
  orderNo     String   @unique // 自动生成：JH202608030001
  supplierId  Int
  userId      Int
  status      String   @default("pending") // pending(待收货) | received(已入库) | cancelled(已取消)
  remark      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  supplier Supplier           @relation(fields: [supplierId], references: [id])
  user     User               @relation(fields: [userId], references: [id])
  items    PurchaseOrderItem[]
}
```

**变更：** 删除 `totalAmount`（金额从明细聚合）。

### 1.2 PurchaseOrderItem（明细表，重构为双数量模式）

```prisma
model PurchaseOrderItem {
  id               Int   @id @default(autoincrement())
  orderId          Int
  productId        Int
  reservedQuantity Float @default(0) // 预定数量
  receivedQuantity Float @default(0) // 实收数量
  reservedUnitId   Int             // 预定单位
  receivedUnitId   Int             // 实收单位
  unitPrice        Float           // 单价

  order        PurchaseOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product       @relation(fields: [productId], references: [id])
  reservedUnit Unit          @relation(fields: [reservedUnitId], references: [id])
  receivedUnit Unit          @relation(fields: [receivedUnitId], references: [id])
}
```

**变更：** 删除 `quantity`（拆为 reservedQuantity/receivedQuantity）、`cost`（改名 unitPrice）、`subtotal`（动态计算）；新增 reservedUnitId/receivedUnitId 关联单位。

### 1.3 影响范围

- `src/app/(dashboard)/page.tsx`：进货统计查询从 `totalAmount` 聚合改为从 items 动态计算
- `src/app/api/products/[id]/route.ts`：删除检查字段名从 `purchaseOrderItem` 不变，但字段引用需更新
- Unit 模型需新增反向关系 `purchaseItemsReserved` 和 `purchaseItemsReceived`

### 1.4 编号生成规则

`JH` + YYYYMMDD + 4 位当日序号（如 JH202608030001）。在事务内查询当日数量 +1，P2002 冲突重试 3 次。

## 2. API 路由

所有路由遵循固定骨架：鉴权（requireAuth/requireAdmin）→ zod 校验 → 业务 → logOperation → 响应。

### 2.1 GET /api/purchases（列表）

- 鉴权：requireAuth
- 分页参数：page（默认 1）、pageSize（默认 20，上限 100）
- 搜索参数：search（多字段 OR 查询）
  - orderNo contains
  - supplier.name contains
  - supplier.code contains
  - product.name contains（通过 items 关联）
  - product.sku contains（通过 items 关联）
- 返回：PaginatedResponse，每项含聚合金额
  - reservedAmount = sum(items.reservedQuantity × unitPrice)
  - receivedAmount = sum(items.receivedQuantity × unitPrice)

### 2.2 POST /api/purchases（创建）

- 鉴权：requireAuth
- 请求体：`{ supplierId, remark?, items: [{ productId, reservedQuantity, receivedQuantity, reservedUnitId, receivedUnitId, unitPrice }] }`
- 事务内：生成编号 + 创建主表 + 创建明细
- P2002 重试 3 次
- 日志：logOperation(action: "create", module: "purchase_order")

### 2.3 GET /api/purchases/[id]（详情）

- 鉴权：requireAuth
- 返回：主表 + supplier + items（含 product/reservedUnit/receivedUnit）

### 2.4 PUT /api/purchases/[id]（更新）

- 鉴权：requireAuth
- 可更新：status、remark、items（整体替换）
- 日志：logOperation(action: "update", module: "purchase_order")

### 2.5 DELETE /api/purchases/[id]（删除）

- 鉴权：requireAdmin
- 级联删除明细（onDelete: Cascade）
- 日志：logOperation(action: "delete", module: "purchase_order")

### 2.6 POST /api/purchases/import（批量导入）

- 鉴权：requireAdmin
- Excel 列：进货单编号 | 供应商编码 | 商品编码 | 预定单位 | 预定数量 | 实收单位 | 实收数量 | 单价 | 备注
- 每行一张进货单（一个供应商一个商品项）
- 校验：供应商编码存在性、商品编码存在性、单位名称存在性、文件内 orderNo 唯一性
- 错误处理：校验阶段返回完整错误列表；事务阶段失败整体回滚并定位首行错误
- 日志：logOperation(action: "import", module: "purchase_order")

### 2.7 GET /api/purchases/export（批量导出）

- 鉴权：requireAuth
- 跟随搜索过滤（读取 search 参数）
- 输出 Excel，列：进货单编号 | 供应商编码 | 供应商名称 | 商品编码 | 商品名称 | 预定单位 | 预定数量 | 实收单位 | 实收数量 | 单价 | 预定金额 | 实收金额 | 状态 | 备注 | 更新时间

### 2.8 GET /api/purchases/template（模板下载）

- 鉴权：requireAuth
- 输出空 Excel 模板（仅表头 + 一行示例）

## 3. 前端页面

### 3.1 列表页 `src/app/(dashboard)/purchases/page.tsx`

- Server Component，直接查询 prisma
- `export const dynamic = "force-dynamic"`
- 搜索框：进货单编号、供应商名称/编号、商品名称/编号
- 分页：pageSize=20
- 表格列（14 列）：序号、进货单编号、供应商编码、供应商名称、商品编码、商品名称、预定单位、预定数量、实收单位、实收数量、单价、状态、更新时间、操作
- 进货单编号列为可点击链接，跳转详情页
- 状态徽标复用 PURCHASE_ORDER_STATUS

### 3.2 详情页 `src/app/(dashboard)/purchases/[id]/page.tsx`

- Server Component
- 基本信息：进货单编号、供应商编码/名称、状态、创建时间、更新时间
- 金额汇总：预定金额、实收金额
- 明细表格：序号、商品编码、商品名称、预定单位、预定数量、实收单位、实收数量、单价、小计
- 备注编辑组件（仅备注可改，其他关联数据不可变）

### 3.3 打印页 `src/app/(print)/purchases/print/page.tsx`

- Server Component，全量数据（不分页）
- 跟随搜索过滤
- 每个进货单一个打印块：订单元信息 + 明细表格
- @media print CSS：横向打印（size: landscape）、page-break-inside: avoid
- PrintTrigger 组件触发浏览器打印

### 3.4 前端组件（5 个）

| 文件 | 功能 |
|------|------|
| `purchase-search-form.tsx` | 搜索表单，更新 URL searchParams |
| `purchase-form-dialog.tsx` | 新增/编辑弹窗（含供应商/商品/单位选择器） |
| `purchase-toolbar.tsx` | 工具栏（新增、批量导入、批量导出、打印） |
| `purchase-row-actions.tsx` | 行操作（查看、编辑、删除） |
| `purchase-detail-edit.tsx` | 详情页备注编辑 |

## 4. 批量导入 Excel 格式

列顺序：进货单编号 | 供应商编码 | 商品编码 | 预定单位 | 预定数量 | 实收单位 | 实收数量 | 单价 | 备注

- 每行一张进货单（一个供应商 + 一个商品项）
- 文件内 orderNo 唯一性校验
- 供应商编码/商品编码/单位名称通过编码匹配

## 5. 侧边栏

启用"进货管理"菜单项（href: /purchases）。

## 6. 测试

- 编号生成函数测试（generatePurchaseOrderNo）
- zod 校验 schema 测试（createPurchaseOrderSchema/updatePurchaseOrderSchema）

## 7. 全局约束

- API 路由文件存放于 src/app/api/ 目录下
- 前端页面文件存放于 src/app/(dashboard)/ 目录下
- 功能相关组件存放于 src/components/features/ 目录下
- 业务组件需复用 Table 组件及 Column 类型
- 错误提示需使用 Toast 系统而非 alert()
- UI 文案使用中文
- Server Component 数据获取
- 所有写操作调用 logOperation
- zod 输入校验
- RBAC 授权（requireAuth/requireAdmin）
- PaginatedResponse 分页格式
