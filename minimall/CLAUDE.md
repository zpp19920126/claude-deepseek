# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Mini Mall（迷你商城）— 微型电商 Web 应用，Next.js 16 全栈项目，覆盖商品浏览、用户认证、购物车、下单支付、后台管理完整链路。

## 技术栈

| 层面 | 选型 | 版本 |
|---|---|---|
| 框架 | Next.js (App Router) | 16.x |
| 语言 | TypeScript (strict) | 5.x |
| ORM | Prisma | 5.x |
| 数据库 | SQLite | `file:./dev.db` |
| 样式 | Tailwind CSS | 4.x |
| 认证 | NextAuth.js v5 | beta |
| 校验 | Zod | 4.x |
| 密码 | bcryptjs | 3.x |

## 项目结构

```
minimall/
├── prisma/
│   ├── schema.prisma         # 全部数据模型（8 个 Model）
│   ├── seed.ts               # 种子脚本（admin 用户 + 示例数据）
│   └── migrations/           # Prisma 迁移文件
└── src/
    ├── middleware.ts          # Edge 路由守卫（Auth + Admin role gate）
    ├── lib/
    │   ├── prisma.ts          # 单例 PrismaClient
    │   ├── auth.ts            # NextAuth v5 配置（Credentials provider, JWT callbacks）
    │   ├── constants.ts       # 枚举：OrderStatus, ProductStatus, Roles, MembershipTiers
    │   ├── membership.ts      # 心悦等级计算：getMembershipLevel(), getDiscountRate(), applyDiscount()
    │   ├── utils.ts           # formatPrice(), generateOrderNo(), cn()
    │   ├── validations.ts     # Zod schemas：login, register, product, category, cart, order
    │   └── api-error.ts       # ApiError 类 + apiErrorResponse() / apiSuccessResponse()
    ├── types/
    │   ├── index.ts           # CartItemData, PaginatedResponse<T>, ApiResponse<T>
    │   └── next-auth.d.ts     # 扩展 Session/JWT 类型（id, role, membershipLevel）
    ├── hooks/
    │   └── useCart.ts         # 双后端购物车 hook（localStorage / API）
    ├── components/
    │   ├── ui/                # Button, Input, Card, Badge, Pagination, Modal, Toast, ImageUpload...
    │   ├── layout/            # Header, Footer, AdminSidebar, AdminHeader, MembershipBadge
    │   ├── product/           # ProductCard, ProductGrid, ProductForm, ProductImages, ProductFilters
    │   ├── cart/              # CartItemRow, CartSummary, CartIcon
    │   ├── order/             # OrderCard, OrderItems, OrderStatusBadge
    │   └── admin/             # StatsCard, DataTable, ConfirmDialog
    └── app/
        ├── globals.css        # @import "tailwindcss"; @theme { ... }
        ├── layout.tsx          # Root layout: SessionProvider > Header > main > Footer
        ├── page.tsx            # 首页（推荐商品、分类导航）
        ├── products/
        │   ├── page.tsx        # 商品列表（分页 + 分类筛选 + 搜索）
        │   └── [id]/page.tsx   # 商品详情 + 加购
        ├── categories/[slug]/page.tsx
        ├── search/page.tsx
        ├── cart/page.tsx       # 购物车（Client Component）
        ├── login/page.tsx      # 登录
        ├── register/page.tsx   # 注册
        ├── orders/
        │   ├── layout.tsx      # 登录校验
        │   ├── page.tsx        # 订单列表
        │   └── [id]/page.tsx   # 订单详情 + 模拟支付
        ├── admin/
        │   ├── layout.tsx      # Admin 布局（三层防护：middleware + layout + API）
        │   ├── page.tsx        # 仪表盘
        │   ├── products/       # 商品 CRUD
        │   ├── categories/     # 分类 CRUD
        │   └── orders/         # 订单管理
        └── api/
            ├── auth/[...nextauth]/route.ts # NextAuth 处理器
            ├── register/route.ts           # POST — 用户注册
            ├── products/route.ts + [id]/route.ts
            ├── categories/route.ts
            ├── cart/route.ts + sync/route.ts + items/[itemId]/route.ts
            ├── orders/route.ts + [id]/route.ts + [id]/pay/route.ts
            └── admin/products/ + categories/ + orders/
```

## 运行方式

```bash
npm run dev           # 开发模式 → http://localhost:3000
npm run build         # 生产构建
npm start             # 生产启动
npm run db:migrate    # Prisma 迁移（schema 变更后运行）
npm run db:seed       # 运行种子脚本（tsx prisma/seed.ts）
npm run db:studio     # Prisma Studio → http://localhost:5555
```

种子数据预置账号：`admin@minimall.com` / `admin123`（ADMIN 角色）

## 数据库架构（8 个模型）

```
User 1──* CartItem *──1 Product *──1 Category
User 1──* Order 1──* OrderItem *──? Product
Order 1──1 Payment
Product 1──* ProductImage
```

### 模型速查

| 模型 | 关键字段 | 说明 |
|---|---|---|
| User | email(unique), passwordHash, role, totalSpent, membershipLevel | role="ADMIN" 进后台；membershipLevel 0-3 |
| Category | name, slug(unique), description | slug 用于 URL `/categories/:slug` |
| Product | name, price(Float), stock, categoryId, status("ACTIVE") | 状态"INACTIVE"不展示 |
| ProductImage | productId, data(Base64), mimeType, sortOrder | onDelete: Cascade；每商品最多5张，500KB/张 |
| CartItem | userId, productId, quantity | @@unique([userId, productId]) 防重复 |
| Order | orderNo(unique), userId, status, originalAmount, discountRate, totalAmount, paidAt | status: PENDING_PAYMENT→PAID→SHIPPED→DELIVERED |
| OrderItem | orderId, productId?, productName, price, quantity, subtotal, imageData? | 快照模式：存下单时的商品名/价格 |
| Payment | orderId(unique), amount, status | 模拟支付记录 |

设计要点：
- 枚举值用 String 存（SQLite 兼容），Zod 层校验
- OrderItem 快照商品名/价格，onDelete: SetNull 保留订单完整性
- `DATABASE_URL=file:./dev.db?connection_limit=1`，SQLite 单连接

## 认证系统

### NextAuth v5 配置 (`src/lib/auth.ts`)

- Provider: Credentials（邮箱 + 密码）
- Session 策略: JWT（无需数据库存储 session）
- JWT callback 注入: `id`, `role`, `membershipLevel`
- 自定义登录页: `/login`
- Session 有效期: 30 天

### 三层权限防护

```
Layer 1 — middleware.ts (Edge)
  /admin/*, /api/admin/* → role === "ADMIN"
  /orders/*, /api/cart/*, /api/orders/* → 已登录

Layer 2 — admin/layout.tsx (Server)
  auth() → 二次校验 role → redirect("/")

Layer 3 — /api/admin/* route handlers (API)
  auth() → inline role 校验 → 403 JSON
```

### 会话获取

```ts
// Server Component
import { auth } from "@/lib/auth"
const session = await auth()  // session.user.id, .role, .membershipLevel

// Client Component
import { useSession } from "next-auth/react"
const { data: session } = useSession()
```

## 路由体系

### 公开页面（Server Component 直查 Prisma，无 API 中转）

| 路由 | 组件 | 数据 |
|---|---|---|
| `/` | page.tsx | 推荐商品 + 分类导航 |
| `/products?page=&category=&search=` | products/page.tsx | 分页列表 |
| `/products/[id]` | products/[id]/page.tsx | 详情 + 加购 |
| `/categories/[slug]` | categories/[slug]/page.tsx | 分类筛选 |

### 需登录（middleware + layout auth gate）

| 路由 | 说明 |
|---|---|
| `/orders` | 订单列表 |
| `/orders/[id]` | 订单详情 + 模拟支付按钮 |

### 后台管理（Admin only）

| 路由 | 说明 |
|---|---|
| `/admin` | 仪表盘（统计卡片） |
| `/admin/products` | 商品列表 + 新建/编辑/删除 |
| `/admin/categories` | 分类列表 + 新建/编辑/删除 |
| `/admin/orders` | 全部订单 + 状态管理 |

### API 分组

- **公开**: `GET /api/products`, `GET /api/products/[id]`, `GET /api/categories`, `POST /api/register`
- **需登录**: `/api/cart/*`, `/api/orders/*`
- **Admin**: `/api/admin/*`（middleware 403 + handler role check）

## 心悦会员体系

```
累计消费（totalSpent）决定等级:
  心悦1级 ≥ ¥8,000    → 9.8 折
  心悦2级 ≥ ¥80,000   → 9.5 折
  心悦3级 ≥ ¥800,000  → 9.0 折

下单时: originalAmount × discountRate → totalAmount（锁定等级，不随后续升级改变）
支付后: totalSpent += totalAmount → 重新计算 membershipLevel（只升不降）
```

核心函数: `getMembershipLevel()`, `getDiscountRate()`, `applyDiscount()`, `getNextTierProgress()` — 见 `src/lib/membership.ts`

## 购物车同步

```
未登录: localStorage [{productId, name, price, image, quantity}]
   │
   │  用户登录 signIn 成功
   ▼
   POST /api/cart/sync { items }
   ├── upsert 合并（@@unique 防重复）
   ├── 清空 localStorage
   └── 后续全部走 /api/cart API
```

## 数据流

- **公开页面**: Server Component → `prisma.product.findMany()` 直查 → 渲染 HTML
- **加购**: Client Component → `useSession()` → 已登录? `POST /api/cart` : `localStorage.push`
- **下单**: `POST /api/orders` → 读购物车 → 计算折扣 → `$transaction(create Order + OrderItems + delete CartItems)`
- **支付**: `POST /api/orders/[id]/pay` → 校验 → `$transaction(update Order + create Payment + update User totalSpent/membershipLevel)`

## 注意事项

- SQLite 单写入者，`connection_limit=1` 必须保留；Prisma 内置队列处理并发
- 价格存 Float，前端用 `formatPrice()` 格式化显示
- 商品图片 Base64 存 ProductImage.data，前端 `loading="lazy"` 延迟加载
- NextAuth v5 beta API 锁定版本 `^5.0.0-beta.32`，升级需验证 breaking changes
- 种子脚本每次运行是**幂等**的（upsert），可重复执行
- middleware 的 matcher 覆盖 `/admin/:path*`、`/orders/:path*`、相关 `/api/*` 路径

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
