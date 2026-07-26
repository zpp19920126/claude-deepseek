"""
数据库操作：连接、建表、增删查、统计
"""

import sqlite3
from calendar import monthrange

from config import DB_PATH, CATEGORIES  # CATEGORIES 在此导出供 pages 层使用


def _get_db():
    """获取数据库连接（内部使用）"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 查询结果可用字段名访问
    return conn


def init_db():
    """初始化数据库，创建表（如不存在）"""
    conn = _get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            amount   REAL NOT NULL,
            category TEXT NOT NULL,
            date     TEXT NOT NULL,
            note     TEXT DEFAULT ''
        )
        """
    )
    conn.commit()
    conn.close()


def add_transaction(amount, category, date_str, note):
    """添加一条账目"""
    conn = _get_db()
    conn.execute(
        "INSERT INTO transactions (amount, category, date, note) VALUES (?, ?, ?, ?)",
        (amount, category, date_str, note),
    )
    conn.commit()
    conn.close()


def get_distinct_months():
    """获取所有有记录的月份列表（YYYY-MM），用于下拉筛选"""
    conn = _get_db()
    rows = conn.execute(
        "SELECT DISTINCT strftime('%Y-%m', date) AS month "
        "FROM transactions ORDER BY month DESC"
    ).fetchall()
    conn.close()
    return [r["month"] for r in rows]


def get_transactions(month=None, categories=None):
    """查询账目列表，可按月份和分类筛选。

    month: 'YYYY-MM' 字符串或 None（不筛选）
    categories: 分类列表，None=不筛选，[]=不匹配任何分类
    """
    conn = _get_db()
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if month:
        # 用范围查询代替 strftime，让 SQLite 能使用索引
        year, mon = month.split("-")
        year_int, mon_int = int(year), int(mon)
        _, last_day = monthrange(year_int, mon_int)
        start = f"{month}-01"
        end = f"{month}-{last_day:02d}"
        query += " AND date >= ? AND date <= ?"
        params.extend([start, end])

    if categories is not None:
        # None=不筛选；[]=空列表，不匹配任何记录
        if not categories:
            query += " AND 1=0"  # 返回空结果
        else:
            placeholders = ",".join(["?"] * len(categories))
            query += f" AND category IN ({placeholders})"
            params.extend(categories)

    query += " ORDER BY date DESC, id DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_transaction_by_id(trans_id):
    """按 ID 查询单条记录"""
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM transactions WHERE id = ?", (trans_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_transaction(trans_id):
    """按 ID 删除一条账目"""
    conn = _get_db()
    conn.execute("DELETE FROM transactions WHERE id = ?", (trans_id,))
    conn.commit()
    conn.close()


def get_stats(start_date=None, end_date=None):
    """按分类统计总金额和笔数"""
    conn = _get_db()
    query = (
        "SELECT category, COUNT(*) AS count, SUM(amount) AS total "
        "FROM transactions WHERE 1=1"
    )
    params = []

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " GROUP BY category ORDER BY total DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]
