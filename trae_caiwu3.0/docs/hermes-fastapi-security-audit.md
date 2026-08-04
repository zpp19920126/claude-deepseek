# hermes 数据操作 API 安全审计报告

**审计日期：** 2026-08-04
**审计范围：** FastAPI 中间层服务 + Next.js 统计 API（4 个新接口）

---

## 总体评估

**风险等级：Critical — 需立即修复后才能上线**

| 严重程度 | 数量 |
|---------|------|
| **Critical** | **3** |
| High | 4 |
| Medium | 5 |
| Low | 3 |

---

## Critical 级别问题（3 个）

### C-1: FastAPI 服务本身完全无认证

**位置：** [main.py](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/app/main.py) 全部路由

**描述：** FastAPI 暴露 72 个端点（含 DELETE、POST、批量导入等高危操作），但本身无任何认证。任何人只要能访问 8000 端口即可调用所有接口，等同管理员权限。

**验证：**
```bash
curl http://localhost:8000/products              # 无认证读取数据
curl -X DELETE http://localhost:8000/products/1  # 无认证删除
```

**修复建议：** 添加 API Key 认证中间件，hermes 调用时需携带 `X-API-Key` Header。

### C-2: CORS 配置完全开放 + 允许凭证

**位置：** [main.py:46-52](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/app/main.py#L46-L52)

```python
allow_origins=["*"], allow_credentials=True  # 规范禁止的组合
```

**修复建议：** 明确指定允许的来源：
```python
allow_origins=["http://localhost:3000"]
```

### C-3: 服务账号使用管理员权限 + 弱密码

**位置：** [.env:8-9](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/.env#L8-L9)，[.env.example:8-9](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/.env.example#L8-L9)

```
HERMES_USERNAME=admin
HERMES_PASSWORD=admin123
```

**修复建议：**
1. 创建专用服务账号，只授予必要权限
2. 使用强密码（16 位随机字符）
3. `.env.example` 改为占位符

---

## High 级别问题（4 个）

### H-1: FastAPI 监听 0.0.0.0

**位置：** [main.py:84](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/app/main.py#L84)

`host="0.0.0.0"` 暴露到所有网络接口。**修复：** 开发用 `127.0.0.1`，生产用内网 IP + 反向代理。

### H-2: FastAPI 无速率限制

可被 DoS 攻击。**修复：** 添加 slowapi 或 fastapi-limiter。

### H-3: 导入接口未正确使用 UploadFile + 无文件大小限制

**位置：** [products.py:59](file:///Users/Admin/claude-project/trae_caiwu3.0/fastapi-service/app/routers/products.py#L59)（所有 import 路由相同）

```python
async def import_products(file: bytes = None):  # 错误：无法接收 multipart
```

**修复：** 使用 `UploadFile = File(...)` + 校验类型 + 限制 5MB。

### H-4: Next.js 统计 API 无输入校验

**位置：** [sales/route.ts:12-13](file:///Users/Admin/claude-project/trae_caiwu3.0/src/app/api/stats/sales/route.ts#L12-L13)，[purchases/route.ts:12-13](file:///Users/Admin/claude-project/trae_caiwu3.0/src/app/api/stats/purchases/route.ts#L12-L13)

`startDate`/`endDate` 直接传入 `new Date()`，无 zod 校验。**修复：** 添加日期格式校验。

---

## Medium 级别问题（5 个）

| 编号 | 问题 | 位置 |
|------|------|------|
| M-1 | FastAPI 无操作日志，无法审计 hermes 操作 | main.py 全局 |
| M-2 | login() 异常静默忽略，难排查 | client.py:41-42 |
| M-3 | sales/purchases 统计无 take 限制，大范围查询 OOM 风险 | sales/route.ts:24-42 |
| M-4 | .env.example 包含默认密码 admin123 | .env.example:9 |
| M-5 | /docs 在生产环境暴露 API 结构 | main.py:38-43 |

---

## Low 级别问题（3 个）

| 编号 | 问题 |
|------|------|
| L-1 | 请求超时 30 秒偏长，DoS 攻击者可占用连接 |
| L-2 | 全局客户端单例 `_authenticated` 标志有竞态条件 |
| L-3 | 健康检查泄露版本信息 |

---

## 做得好的地方（10 项）

1. ✅ `.env` 已被 gitignore，不会被提交
2. ✅ httpx 参数化请求，无 URL 注入
3. ✅ Pydantic 模型校验输入
4. ✅ Next.js 统计 API 都有 `requireAuth` 鉴权
5. ✅ Prisma 参数化查询，无 SQL 注入
6. ✅ 日期范围有默认值（最近 30 天）
7. ✅ 库存统计有分页限制（pageSize ≤ 100）
8. ✅ `follow_redirects=False` 防止重定向攻击
9. ✅ lifespan 正确释放客户端资源
10. ✅ session 过期自动重新登录

---

## 修复优先级

| 优先级 | 问题 | 建议时间 |
|--------|------|---------|
| **立即修复** | C-1 无认证 / C-2 CORS / C-3 管理员弱密码 | 上线前必须 |
| **尽快修复** | H-1 监听 / H-2 限流 / H-3 导入接口 / H-4 输入校验 | 上线前必须 |
| **计划修复** | M-1~M-5 | 2 周内 |
| **可选修复** | L-1~L-3 | 视情况 |

---

## 总结

**3 个 Critical 级别漏洞**，核心问题是 **FastAPI 完全无认证**。在修复 C-1、C-2、C-3、H-1、H-2、H-3 之前，**不要部署到生产环境**，当前仅可用于本地开发调试。
