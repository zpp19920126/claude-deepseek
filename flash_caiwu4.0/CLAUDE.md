# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

lvliang 蔬菜配送管理系统（4.0 版）。代码复制自 `/Users/Admin/claude-project/trae_caiwu3.0`，UI 文案与代码注释使用中文。

**当前进度**：商品/分类/单位/客户/供应商 5 个基础模块已完成（含 CRUD、Excel 导入导出、打印）；销售单、进货单、操作日志页面、用户管理 **仅有数据模型、尚未实现**（sidebar 中对应菜单会 404）。

## 技术栈

- Next.js 16 App Router（`src/` 目录）+ React 19 + TypeScript strict
- Prisma 5.22 + SQLite（`DATABASE_URL="file:./dev.db?connection_limit=1"`，**无 migrations 目录**，schema 变更用 db push）
- Tailwind CSS 4（`@tailwindcss/postcss`，无 tailwind.config；语义色主题在 `src/app/globals.css` 的 `@theme`，类名如 `bg-primary`/`bg-surface`/`text-text`）
- 认证：jose JWT (HS256) + bcryptjs，**无 NextAuth**
- 依赖：zod、react-hook-form（表单校验）、xlsx（导入导出）、vitest

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint
npm run test         # vitest run 全部测试
npx vitest run src/lib/__tests__/xxx.test.ts   # 运行单个测试
npm run db:push      # schema 变更推库（无 migrations）
npm run db:seed      # 种子数据：admin/admin123、user/user123
npm run db:studio
```

改 schema 后需 `npx prisma generate`。`.env` 需要 `DATABASE_URL` 与 `JWT_SECRET`（≥32 字符，`src/lib/auth.ts` 启动时 fail-fast 校验，缺失直接抛错）。

## 架构

### 认证与会话（三层）

1. `src/proxy.ts` — Next.js 16 proxy 约定（非 middleware），全局 token 校验：未登录 API 返 401 JSON、页面 redirect `/login?from=`。目前**只校验登录、不区分角色**
2. `src/lib/session.ts` — `requireAuth()`/`requireAdmin()`：解 httpOnly cookie（`lvliang_token`，7 天）后**每次查库二次校验**（防 token 吊销后仍有效），requireAdmin 检查 `role === "admin"`，返回最新 role
3. API 路由内调用 `requireAuth`/`requireAdmin`，返回值为 `NextResponse`（错误）或 payload（成功），需 `instanceof NextResponse` 判断

登录限流：`src/lib/rate-limit.ts` + `ip.ts`（内存 Map，每 IP 每分钟 5 次）。

### API 模式（所有业务模块统一）

```
requireAuth/requireAdmin → zod safeParse → Prisma → logOperation() → { success: true, data } / { success: false, error }
```

- Zod schema 集中在 `src/lib/validations.ts`；失败返回 400 + `issues[0].message`
- 业务编码（sku/code/orderNo）唯一冲突 P2002 → 409，创建时生成编码有冲突重试
- 删除保护：有关联数据的实体拒绝删除（如商品有销售明细则 400）
- 权限约定：增改查 requireAuth；**删除/导入/导出 requireAdmin**
- 写操作成功后调用 `src/lib/logger.ts` 的 `logOperation({ action, module, targetId, detail })`，记录失败仅 console.error 不阻断业务
- 响应分页格式：`{ items, total, page, pageSize, totalPages }`
- SQLite 单连接：交互式 `prisma.$transaction` 回调内**串行 await、禁止 Promise.all**，超时设 10s

### 页面模式

- 列表页 = Server Component 直接查库（`export const dynamic = "force-dynamic"`）+ client 组件四件套：`src/components/features/` 下的 `*-toolbar`（筛选）/`*-form-dialog`（新建编辑弹窗）/`*-search-form`/`*-row-actions`
- 手写 UI 组件在 `src/components/ui/`（button/input/modal/badge/table/select/textarea/toast/pagination）
- 打印页在 `(print)` 路由组（无侧边栏布局）：Server 取数 → client 组件 `src/components/features/print-trigger.tsx` 自动 `window.print()`，A4 样式内联 `@media print`
- 主布局 `(dashboard)/layout.tsx`：`Sidebar`（`src/components/layout/sidebar.tsx`，菜单项支持 `enabled` 与 `roles: ["admin"]` 角色过滤）+ `Header`；未实现菜单标记 `enabled: false` 显示"待开发"
- 通用组件：`src/components/features/entity-picker.tsx`（客户/供应商/商品选择器）、`export-button.tsx`

### 数据模型（prisma/schema.prisma，11 个）

| 模型 | 要点 |
|---|---|
| User | username unique；role: admin\|user |
| Category | code/name unique；parentId 树形自关联 |
| Unit | code/name unique |
| Product | sku unique；categoryId/unitId/supplierId?；price/cost/stock/minStock；status active\|inactive |
| Customer / Supplier | code unique |
| SalesOrder | orderNo unique；customerId/userId；totalAmount；status: pending→confirmed→delivered→paid / cancelled |
| SalesOrderItem | orderId 级联删除；quantity/price/subtotal |
| PurchaseOrder | orderNo unique；supplierId/userId；status: pending→received / cancelled |
| PurchaseOrderItem | orderId 级联删除；quantity/cost/subtotal |
| OperationLog | userId；action/module/targetId/detail(JSON 字符串)/ipAddress |

业务编码格式：Customer=`K001`、Supplier=`G001`、Category=`C001`、Unit=`U001`、Product=`VG001`。`src/lib/utils.ts` 的 `generateOrderNo(prefix)` 生成时间戳+随机串订单号，**其格式被测试断言，勿改动**。

## 测试

- vitest 单测在 `src/lib/__tests__/`，覆盖 password/rate-limit/utils 等纯函数
- 新增业务逻辑（订单状态迁移、订单号生成、校验规则）应在同目录补测试

## 注意事项

- 销售单/进货单/日志/用户管理尚未实现：新增 API 照抄 `src/app/api/products/` 模式（含 `[id]/route.ts`、事务、P2002 重试），新增页面照抄 `src/app/(dashboard)/products/` 模式
- `prisma/dev.db` 在 .gitignore 中，不提交
- 若引入 shadcn/ui，组件必须装到独立目录（如 `src/components/shadcn/`），**不可覆盖 `src/components/ui/` 手写组件**
