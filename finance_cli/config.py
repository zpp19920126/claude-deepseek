"""
全局配置常量
"""

import os

# 数据库文件路径（与 config.py 同目录）
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "finance.db")

# 预设分类
CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "居住", "其他"]

# 货币符号
CURRENCY = "¥"
