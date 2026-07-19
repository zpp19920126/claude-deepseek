# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Python + Streamlit + SQLite3 个人记账 Web 工具。支持添加/查看/删除账目，按分类统计支出。

## 技术栈

- **框架**: Streamlit（纯 Python Web UI）
- **数据库**: SQLite3（`finance.db`，单文件，零配置）
- **图表**: Streamlit 内置 `st.bar_chart`（基于 Altair）
- **数据处理**: pandas
- **依赖安装**: `pip install streamlit pandas`

## 项目结构

```
finance_cli/
├── app.py              # 入口（22行）— st.set_page_config + 侧边栏导航 + 路由分发
├── config.py           # 全局常量 — DB_PATH, CATEGORIES
├── database.py         # 数据库操作 — 连接、建表、CRUD、统计查询（纯函数，不依赖 Streamlit）
├── pages/
│   ├── __init__.py     # 包标记
│   ├── records.py      # 记账管理页面 — show_records_page()，含添加/查看/删除三个 tab
│   └── stats.py        # 分类统计页面 — show_stats_page()，含时间筛选 + 柱状图 + 统计表
├── requirements.txt    # streamlit, pandas
└── finance.db          # SQLite 数据库文件（自动生成，已 gitignore）
```

### 依赖关系

```
config.py ← database.py ← pages/*.py ← app.py
```

- pages 层不直接 import config，通过 database 间接使用
- app.py 只做路由，不写业务逻辑

## 运行方式

```bash
cd /Users/Admin/claude-project/finance_cli
streamlit run app.py
```

浏览器打开 `http://localhost:8501`。

## 数据库

单表 `transactions`：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| amount | REAL NOT NULL | 金额 |
| category | TEXT NOT NULL | 分类（预设 6 种） |
| date | TEXT NOT NULL | 日期，格式 YYYY-MM-DD |
| note | TEXT DEFAULT '' | 备注 |

### 预设分类

`餐饮`、`交通`、`购物`、`娱乐`、`居住`、`其他`

定义在 [config.py](config.py) 的 `CATEGORIES` 列表中，修改分类只需改此文件。

## 页面功能

### 🏠 记账管理 (`pages/records.py`)
- **添加账目**: 表单（金额/分类/日期/备注），`st.form` + `clear_on_submit=True`
- **查看列表**: 按月份 + 分类筛选，`st.dataframe` 表格展示，底部显示合计
- **删除账目**: 输入 ID → 查找确认 → 删除（防止误操作，需两次点击）

### 📊 分类统计 (`pages/stats.py`)
- 时间范围：本月 / 近3月 / 近6月 / 全部
- 左侧柱状图（`st.bar_chart`，按金额升序）
- 右侧统计表（分类/笔数/总金额/占比）+ 总计

## 注意

- 数据库文件 `finance.db` 已在 `.gitignore` 中忽略
- `database.py` 中的 `_get_db()` 设为模块私有，外部只通过公开函数访问数据库
- 删除操作使用 `st.rerun()` 刷新页面
- 统计查询使用 `GROUP BY` + `ORDER BY total DESC`
- 没有测试、没有构建步骤、没有其他依赖
