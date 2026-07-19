"""
分类统计页面：柱状图 + 统计表
"""

from datetime import date, timedelta

import streamlit as st
import pandas as pd

from database import get_stats


def show_stats_page():
    """渲染分类统计页面"""

    st.subheader("📊 分类统计")

    # 时间范围快捷选择
    today = date.today()
    range_options = {
        "本月": (today.replace(day=1).isoformat(), today.isoformat()),
        "近 3 个月": ((today - timedelta(days=90)).isoformat(), today.isoformat()),
        "近 6 个月": ((today - timedelta(days=180)).isoformat(), today.isoformat()),
        "全部": (None, None),
    }
    time_range = st.radio("时间范围", list(range_options.keys()), horizontal=True)
    start_date, end_date = range_options[time_range]

    stats = get_stats(start_date=start_date, end_date=end_date)

    if not stats:
        st.info("该时间范围内暂无记录")
        return

    # 构建统计 DataFrame
    df_stats = pd.DataFrame(stats)
    df_stats.columns = ["分类", "笔数", "总金额"]
    grand_total = df_stats["总金额"].sum()
    df_stats["占比"] = (df_stats["总金额"] / grand_total * 100).round(1)
    df_stats["占比"] = df_stats["占比"].apply(lambda x: f"{x}%")

    col_chart, col_table = st.columns([3, 2])

    with col_chart:
        st.subheader("柱状图")
        chart_data = pd.DataFrame(
            {"分类": [s["category"] for s in stats], "金额": [s["total"] for s in stats]}
        ).set_index("分类")
        chart_data = chart_data.sort_values("金额", ascending=True)
        st.bar_chart(chart_data, width="stretch")

    with col_table:
        st.subheader("统计表")
        st.dataframe(
            df_stats,
            width="stretch",
            hide_index=True,
            column_config={
                "总金额": st.column_config.NumberColumn(format="¥%.2f"),
            },
        )
        st.metric(label="总计", value=f"¥{grand_total:.2f}")
