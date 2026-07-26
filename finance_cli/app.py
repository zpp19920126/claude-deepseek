"""
个人记账工具 — Python + Streamlit + SQLite3
启动: streamlit run app.py
"""

import streamlit as st

from database import init_db
from views.records import show_records_page
from views.stats import show_stats_page

# ---- 页面配置 ----
st.set_page_config(page_title="个人记账", page_icon="💰", layout="wide")

# ---- 启动时初始化数据库 ----
init_db()

# ---- 侧边栏导航 ----
st.sidebar.title("💰 个人记账")
page = st.sidebar.radio("导航", ["🏠 记账管理", "📊 分类统计"])

# ---- 页面路由 ----
if page == "🏠 记账管理":
    show_records_page()
else:
    show_stats_page()
