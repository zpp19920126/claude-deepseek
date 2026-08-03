# 销售配送单管理模块设计规格

日期：2026-08-02
状态：已确认

## 1. 背景与目标

新增"销售配送单"模块，记录向客户配送商品的完整流程：预定数量 → 配送数量 → 实收数量。与已有 customer/supplier 模块保持一致的工程规范（Server Component 数据获取、RBAC、zod 校验、logOperation、Table 复用、Toast、批量导入导出、打印）。

## 2. 数据模型（双表设计）

### 2.1 单据头 DeliveryOrder

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | 主键 |
| orderNo | String @unique | 自动生成：`SO` + YYYYMMDD + 4位当日序号（如 SO202608020001） |
| customerId | Int | 关联 Customer |
| userId | Int | 操作员，从登录态获取 |
| status | String | pending(待配送) \| delivered(已配送) \| received(已签收) \| cancelled(已取消) |
| remark | String? | 备注 |
| createdAt | DateTime | 添加时间 |
| updatedAt | DateTime | 更新时间 |

关系：customer、user、items[]。

### 2.2 单据明细 DeliveryOrderItem

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int @id | 主键 |
| orderId | Int | 关联 DeliveryOrder（onDelete: Cascade） |
| productId | Int | 关联 Product（含商品编码/名称） |
| reservedUnitId | Int | 预定单位 → Unit |
| reservedQuantity | Float | 预定数量 |
| deliveryUnitId | Int | 配送单位 → Unit |
| deliveryQuantity | Float | 配送数量 |
| receivedQuantity | Float | 实收数量 |
| unitPrice | Float | 单价（销售单价） |

商品编码/名称不重复存储，通过 productId 关联查询。

## 3. 单据编号生成

- 格式：`SO` + YYYYMMDD + 4位当日序号
- API 创建时由服务端查询当日最大序号 +1 生成，用户无需输入
- SQLite 不支持行锁，采用"事务内 count 当日单据数 → 生成编号 → 插入；若并发导致 P2002 唯一冲突则重试（最多 3 次）"方案

## 4. API 路由（8个）

| 方法 | 路径 | 权限 | 功能 |
|------|------|------|------|
| GET | /api/delivery-orders | requireAuth | 列表（分页+搜索 orderNo） |
| POST | /api/delivery-orders | requireAuth | 创建（含明细数组） |
| GET | /api/delivery-orders/[id] | requireAuth | 详情（含明细+商品/单位/客户） |
| PUT | /api/delivery-orders/[id] | requireAuth | 更新（含明细整体替换） |
| DELETE | /api/delivery-orders/[id] | requireAdmin | 删除（检查引用） |
| POST | /api/delivery-orders/import | requireAdmin | 批量导入 |
| GET | /api/delivery-orders/export | requireAuth | 批量导出 |
| GET | /api/delivery-orders/template | requireAuth | 导入模板下载 |

所有写操作调用 logOperation，module=`delivery_order`。

## 5. 批量导入策略（双表关键差异）

Excel 列：`单据分组 | 客户编码 | 商品编码 | 预定单位 | 预定数量 | 配送单位 | 配送数量 | 实收数量 | 单价 | 备注`

- 相同"单据分组"值的行归为一个配送单
- 每个分组内客户编码必须一致，否则报错
- 系统为每个分组自动生成单据编号
- 用事务保证原子性，沿用 supplier 模块的行号定位错误方案
- 文件内单据分组 + 商品编码组合需唯一（同一单据不能有重复商品行）

## 6. 批量导出

每行 = 一个明细行，字段：单据编号、客户编码、客户名称、商品编码、商品名称、预定单位、预定数量、配送单位、配送数量、实收数量、单价、小计（单价×配送数量）、状态、添加时间。

## 7. 前端页面

### 7.1 列表页 `/delivery-orders`（Server Component）

- 列：单据编号、客户名称、商品数、配送总数量（deliveryQuantity 之和）、总金额（单价×配送数量之和）、状态、添加时间、操作
- 搜索框（单据编号）+ 分页
- 工具栏：新增、批量导入、批量导出、打印
- 列表查询用 groupBy 统计商品数/总数量/总金额，避免 N+1

### 7.2 打印页 `/delivery-orders/print`（Server Component）

- 展开显示每个单据的明细行
- 支持浏览器保存为 PDF
- 搜索条件与列表页一致

### 7.3 表单弹窗

- 单据头：选择客户（EntityPicker）、状态、备注
- 明细行：动态增删行，每行选择商品（EntityPicker，带出商品编码/名称/默认单位/默认单价）、预定单位、预定数量、配送单位、配送数量、实收数量、单价

## 8. 一致性约束

- 复用 Table/Column、withAuth 骨架、logOperation、zod、RBAC、Toast、EntityPicker、PrintTrigger
- API 遵循固定骨架：鉴权→校验→业务→日志→响应
- 分页返回 PaginatedResponse 格式
- 错误提示用 Toast，不用 alert
- UI 文案中文

## 9. 测试

- zod 校验单元测试（覆盖 createDeliveryOrderSchema、createDeliveryOrderItemSchema）
- 边界：空明细、负数量、非法状态、重复商品行

## 10. 不在本次范围

- 库存联动（配送/签收时不自动扣减 Product.stock）
- 单据状态流转的工作流审批
- 已有 SalesOrder 模块的迁移或合并

## 11. 迁移策略

- 全新数据库：直接 `prisma db push`
- 已有数据库：`prisma db push`（新增表，不破坏现有数据）
- seed.ts：新增 2-3 个示例配送单（含明细）
