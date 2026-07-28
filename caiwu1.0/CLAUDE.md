# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

绿粮（lvliang）— 蔬菜配送管理系统。Next.js 16 App Router 管理后台。

## 技术栈

- Next.js 16.2 + React 19 + TypeScript strict
- Prisma 5 + SQLite
- TailwindCSS 4 + shadcn/ui
- react-hook-form + zod（表单校验）
- jose + bcryptjs（JWT 认证）

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint         # ESLint
npx prisma studio    # 数据库 GUI
npx prisma migrate dev --name <name>   # 创建迁移
npx tsx prisma/seed.ts                 # 填充种子数据
```

## 目录结构

标准 Next.js App Router 项目，`src/` 目录：

```
src/
├── app/
│   ├── (auth)/login/        # 登录页
│   ├── admin/               # 后台管理（layout + 各模块 page）
│   │   ├── products/        # 商品管理
│   │   ├── categories/      # 商品分类
│   │   ├── units/           # 基本单位
│   │   ├── customers/       # 客户管理
│   │   ├── suppliers/       # 供应商管理
│   │   ├── sales-orders/    # 销售单管理
│   │   └── page.tsx         # 仪表盘
│   └── api/
│       ├── auth/            # login/logout/me
│       └── admin/           # 各模块 RESTful API
├── components/
│   ├── ui/                  # shadcn/ui 组件
│   ├── layout/              # Sidebar、LogoutButton
│   └── forms/               # 各模块表单组件
├── lib/
│   ├── prisma.ts            # Prisma 单例
│   ├── auth.ts              # JWT session（jose 签名，httpOnly cookie）
│   ├── admin.ts             # requireAdmin() 服务端鉴权
│   ├── api-error.ts         # apiSuccessResponse / apiErrorResponse
│   ├── csrf.ts              # 双提交 Cookie CSRF 防护
│   ├── utils.ts             # cn(), formatPrice(), generateDocumentNo()
│   └── validations.ts       # 全部 Zod schema
├── hooks/
└── types/
```

## 架构约定

### API 模式

每个 CRUD 模块遵循统一 RESTful 模式：

```
GET    /api/admin/{resource}          → 列表（include 关联数据）
POST   /api/admin/{resource}          → 创建（Zod 校验 + CSRF 校验）
PUT    /api/admin/{resource}/[id]     → 更新
DELETE /api/admin/{resource}/[id]     → 删除
```

API Route 处理器固定三步：鉴权（requireAdmin）→ 校验（Zod + CSRF）→ Prisma 操作。

### 前端页面模式

每个管理页面为 Client Component，结构：Table 列表 + Dialog 弹窗表单 + 操作列（编辑/删除）。表单统一用 react-hook-form + @hookform/resolvers/zod。

### Prisma 模型关系

- Unit/Category 用 `code`（String）作主键
- Product/Supplier/Customer/SalesOrder 用 `cuid()` 作主键 + `code` 作 `@unique` 业务编码
- SalesOrder 冗余 productName/customerName/customerShortName，创建时从关联实体同步（历史快照）
- 金额字段用 Float（蔬菜配送精度到分）

### 参考项目

`../minimall/` 使用完全相同技术栈，lib 层（prisma、auth、csrf、api-error、middleware）可直接复用。

### 当前状态

项目刚由 `create-next-app` 初始化，Prisma 依赖因版本冲突尚未安装成功。下一步需先解决 `prisma` / `@prisma/client` 的安装问题（`@prisma/fetch-engine@7.9.1` 不存在），然后按 `prisma/schema.prisma` → `src/lib/` → 认证 → 页面 的顺序推进。
