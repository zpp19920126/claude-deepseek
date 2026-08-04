# 配送单移除客户字段 — 设计规格

## 背景

当前 `DeliveryOrder` 模型含 `customerId` 字段，与 `Customer` 一对多关联。业务调整为：配送单只承载商品/数量信息，客户在销售单创建时直接绑定，不再在配送单层冗余。

## 目标

从 `DeliveryOrder` 彻底删除 `customerId` 字段及 `customer` 关系，并同步调整销售单创建流程（改为直接选客户）。

## 范围

### 数据模型（prisma/schema.prisma）

- `DeliveryOrder`：删除 `customerId Int` + `customer Customer @relation(...)`
- `Customer`：删除 `deliveryOrders DeliveryOrder[]` 反向关系
- `SalesOrder.customerId`：保留（已是独立字段），不再标注"从配送单继承"
- 迁移：`npx prisma db push`（开发环境破坏性变更，dev.db 现有配送单的客户关联丢失）

### 配送单 API

| 文件 | 变更 |
|---|---|
| `src/lib/validations.ts` | `createDeliveryOrderSchema` / `updateDeliveryOrderSchema` 删除 `customerId` |
| `src/app/api/delivery-orders/route.ts` | GET 列表去除 `customer` include 与 `customerName/customerCode` 返回；POST 不再接收 `customerId` |
| `src/app/api/delivery-orders/[id]/route.ts` | GET 去除 `customer` include；PUT 去除 `customerId` 处理 |
| `src/app/api/delivery-orders/export/route.ts` | 导出去除"客户编码/客户名称"两列 |
| `src/app/api/delivery-orders/import/route.ts` | 去除"客户编码"列解析、客户存在性校验、分组客户一致性校验、`customerId` 赋值 |

### 配送单前端

| 文件 | 变更 |
|---|---|
| `src/app/(dashboard)/delivery-orders/page.tsx` | 列表删除"客户名称"列，去除 `customer` include |
| `src/components/features/delivery-order-form-dialog.tsx` | 删除客户选择器、`customerId/customerName` 状态、客户校验、客户 EntityPicker |
| `src/app/(print)/delivery-orders/print/page.tsx` | 删除"客户"meta 行，去除 `customer` include |

### 销售单调整（连锁）

| 文件 | 变更 |
|---|---|
| `src/lib/validations.ts` | `createSalesOrderSchema` 新增 `customerId: z.number().int().positive("请选择客户")` |
| `src/app/api/sales/route.ts` | POST 改为从请求体接收 `customerId`，校验客户存在，不再从配送单继承 |
| `src/components/features/sales-form-dialog.tsx` | 新增客户选择器（EntityPicker）+ `customerId` 状态 + 必填校验；配送单选择器的 `secondaryField="customerName"` 移除 |

### 测试

- `src/lib/__tests__/delivery-order-validations.test.ts`：`validInput()` 移除 `customerId`，删除"customerId 缺失失败"用例
- `src/lib/__tests__/sales-order-validations.test.ts`：新增"customerId 缺失失败"用例

### FastAPI 中间层

- `fastapi-service/app/routers/delivery_orders.py`：创建/导入配送单去除 `customerId` 透传
- `fastapi-service/app/routers/sales.py`：创建销售单新增 `customerId` 参数透传

## 业务流程变化

- **之前**：建配送单（选客户）→ 建销售单（选配送单，客户自动继承）
- **之后**：建配送单（只选商品）→ 建销售单（直接选客户 + 选配送单，二者绑定）

## 验证标准

1. `npx prisma db push` + `npx prisma generate` 成功
2. `npx tsc --noEmit` 0 错误
3. `npm test` 全部通过
4. 启动 dev server，配送单列表/表单/打印无客户列
5. 销售单创建可选客户 + 配送单
