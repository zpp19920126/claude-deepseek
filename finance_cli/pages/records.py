"""
记账管理页面：添加账目、查看列表、删除账目
"""

from datetime import date

import streamlit as st
import pandas as pd

from config import CATEGORIES
from database import add_transaction, get_transactions, get_transaction_by_id, delete_transaction


def show_records_page():
    """渲染记账管理页面（三个 tab）"""

    tab1, tab2, tab3 = st.tabs(["➕ 添加账目", "📋 查看列表", "🗑️ 删除账目"])

    # ================================================================
    # Tab 1：添加账目
    # ================================================================
    with tab1:
        st.subheader("添加一笔账目")

        with st.form("add_form", clear_on_submit=True):
            col1, col2 = st.columns(2)
            with col1:
                amount = st.number_input("金额（元）", min_value=0.0, step=0.5, format="%.2f")
                category = st.selectbox("分类", CATEGORIES)
            with col2:
                record_date = st.date_input("日期", value=date.today())
                note = st.text_input("备注", placeholder="例如：午餐外卖")

            submitted = st.form_submit_button("✅ 添加", width="stretch")

            if submitted:
                if amount <= 0:
                    st.error("金额必须大于 0")
                else:
                    add_transaction(amount, category, str(record_date), note)
                    st.success(f"已添加：{category} ¥{amount:.2f}")

    # ================================================================
    # Tab 2：查看列表
    # ================================================================
    with tab2:
        st.subheader("查看账目")

        # 筛选器
        col1, col2 = st.columns(2)
        with col1:
            all_months = sorted(
                {r["date"][:7] for r in get_transactions()}, reverse=True
            )
            filter_month = st.selectbox(
                "按月份筛选", ["全部"] + all_months, key="filter_month"
            )
            month_value = None if filter_month == "全部" else filter_month

        with col2:
            selected_cats = st.multiselect(
                "按分类筛选",
                CATEGORIES,
                default=CATEGORIES,
                key="filter_cats",
            )

        transactions = get_transactions(month=month_value, categories=selected_cats)

        if not transactions:
            st.info("暂无记录，先去添加几笔吧！")
        else:
            df = pd.DataFrame(transactions)
            df = df.rename(
                columns={
                    "id": "ID",
                    "amount": "金额",
                    "category": "分类",
                    "date": "日期",
                    "note": "备注",
                }
            )
            df["金额"] = df["金额"].apply(lambda x: f"¥{x:.2f}")

            st.dataframe(df, width="stretch", hide_index=True)

            total = sum(r["amount"] for r in transactions)
            st.metric(label=f"共 {len(transactions)} 笔，合计", value=f"¥{total:.2f}")

    # ================================================================
    # Tab 3：删除账目
    # ================================================================
    with tab3:
        st.subheader("按 ID 删除账目")

        trans_id = st.number_input("输入要删除的账目 ID", min_value=1, step=1)
        col1, col2, _ = st.columns([1, 1, 3])
        with col1:
            search_btn = st.button("🔍 查找", width="stretch")

        if search_btn:
            record = get_transaction_by_id(trans_id)
            if record is None:
                st.error(f"未找到 ID 为 {trans_id} 的记录")
            else:
                st.info(
                    f"**确认删除？**\n\n"
                    f"💰 {record['category']} | ¥{record['amount']:.2f} | {record['date']}"
                    + (f" | {record['note']}" if record["note"] else "")
                )
                if st.button("⚠️ 确认删除", type="primary", width="stretch"):
                    delete_transaction(trans_id)
                    st.success(f"ID {trans_id} 已删除")
                    st.rerun()
