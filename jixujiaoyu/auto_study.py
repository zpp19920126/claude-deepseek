#!/usr/bin/env python3
"""
宁夏继续教育培训平台 - 自动学习 v5
混合策略: JS点击 + Vue方法 + pyautogui + 截图验证
"""

import subprocess
import json
import time
import sys
import os
import pyautogui

TEMP_JS = os.path.expanduser("~/tmp/auto_study_js.txt")
SCREENSHOT_DIR = "/tmp/study_screenshots"
os.makedirs(os.path.dirname(TEMP_JS), exist_ok=True)
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

pyautogui.FAILSAFE = True


# ============================================================
def run_js(js_code):
    with open(TEMP_JS, 'w', encoding='utf-8') as f:
        f.write(js_code)
    script = '''set jsFile to "''' + TEMP_JS + '''"
try
    set fp to open for access jsFile
    set jsContent to read fp
    close access fp
on error
    return "ERROR:FILE"
end try
tell application "Safari"
    try
        set jsResult to do JavaScript jsContent in current tab of front window
        if jsResult is missing value then return "null"
        return jsResult as string
    on error errMsg
        return "ERROR:" & errMsg
    end try
end tell'''
    r = subprocess.run(['osascript', '-e', script], capture_output=True, text=True, timeout=30)
    return r.stdout.strip()


def get_url():
    return run_js('window.location.href')


def get_page_text(limit=300):
    return run_js(f'(function(){{if(document.body)return document.body.innerText.substring(0,{limit});return"";}})()')


def close_dialogs():
    n = int(float(run_js('(function(){var c=document.querySelectorAll(".el-dialog__headerbtn,.el-icon-close");for(var i=0;i<c.length;i++){c[i].click();}return c.length;})()') or "0"))
    if n > 0:
        print(f"  [×] {n} 弹窗")
        time.sleep(0.3)


def js_click(selector):
    """JavaScript 点击（能触发 Vue 事件）"""
    r = run_js(f'(function(){{var e=document.querySelector("{selector}");if(e){{e.click();return"OK";}}return"NF";}})()')
    return r == "OK"


def js_click_text(text, tag="button"):
    """JavaScript 按文本点击"""
    r = run_js(f'(function(){{var a=document.querySelectorAll("{tag}");for(var i=0;i<a.length;i++){{if(a[i].innerText.trim().indexOf("{text}")!==-1){{a[i].click();return"OK";}}}}return"NF";}})()')
    return r == "OK"


def vue_navigate(path, query=None):
    q = json.dumps(query) if query else "{}"
    run_js(f'(function(){{document.querySelector("#app").__vue__.$router.push({{path:"{path}",query:{q}}});}})()')
    time.sleep(4)
    close_dialogs()


def vue_call(method):
    """调用 Vue 组件方法"""
    return run_js(f'''
    (function() {{
        function find(vm, d) {{
            if (d > 5) return null;
            if (vm.{method}) return vm;
            for (var i = 0; i < (vm.$children||[]).length; i++) {{
                var r = find(vm.$children[i], d+1);
                if (r) return r;
            }}
            return null;
        }}
        var vm = find(document.querySelector("#app").__vue__, 0);
        if (vm) {{ vm.{method}(); return "OK"; }}
        return "NO_VM";
    }})()
    ''')


def get_safari_chrome_h():
    """获取 Safari 工具栏高度"""
    vp_h = int(float(run_js('window.innerHeight')))
    raw = subprocess.run(['osascript', '-e',
        'tell application "System Events" to tell process "Safari" to get size of front window'],
        capture_output=True, text=True, timeout=10).stdout.strip()
    win_h = int(float(raw.split(',')[1].strip()))
    return win_h - vp_h


def get_window_bounds():
    raw = subprocess.run(['osascript', '-e',
        'tell application "Safari" to get bounds of front window'],
        capture_output=True, text=True, timeout=10).stdout.strip()
    return [int(float(x)) for x in raw.replace(', ', ',').split(',')]


def get_element_viewport_center(selector):
    """获取元素在 viewport 中的中心坐标"""
    r = run_js(f'''
    (function() {{
        var el = document.querySelector("{selector}");
        if (!el) return "NF";
        var rect = el.getBoundingClientRect();
        return Math.round(rect.left + rect.width/2) + "," + Math.round(rect.top + rect.height/2);
    }})()
    ''')
    if r == "NF":
        return None, None
    return [int(x) for x in r.split(',')]


def click_iframe_center():
    """用 pyautogui 点击 iframe 中心（用于跨域播放按钮）"""
    vx, vy = get_element_viewport_center("#iframe")
    if vx is None:
        vx, vy = get_element_viewport_center("iframe")
    if vx is None:
        print("  [!] 找不到 iframe")
        return

    bounds = get_window_bounds()
    chrome_h = get_safari_chrome_h()
    sx = bounds[0] + vx
    sy = bounds[1] + chrome_h + vy

    # Retina 2x 缩放补偿
    dpr = float(run_js('window.devicePixelRatio') or "2")
    sx_scaled = int(sx * (2.0 / dpr)) if dpr != 2 else sx
    sy_scaled = int(sy * (2.0 / dpr)) if dpr != 2 else sy

    subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'],
                   capture_output=True, timeout=5)
    time.sleep(0.5)
    print(f"  [🖱] iframe 中心 ({sx_scaled}, {sy_scaled})")
    pyautogui.click(sx_scaled, sy_scaled)


def capture_and_compare(wait_sec=3):
    """截图 iframe 区域并比较像素差异来判断视频是否播放"""
    vx, vy = get_element_viewport_center("#iframe")
    if vx is None:
        return False

    # 获取 iframe 的 viewport 矩形
    r = run_js('''
    (function() {
        var f = document.querySelector("#iframe") || document.querySelector("iframe");
        if (!f) return "NF";
        var rect = f.getBoundingClientRect();
        return JSON.stringify({x:Math.round(rect.left),y:Math.round(rect.top),w:Math.round(rect.width),h:Math.round(rect.height)});
    })()
    ''')
    if r == "NF":
        return False
    rect = json.loads(r)

    bounds = get_window_bounds()
    chrome_h = get_safari_chrome_h()

    # 截取 iframe 中心 60% 区域
    margin = 0.2
    region = (
        bounds[0] + int(rect['x'] + rect['w'] * margin),
        bounds[1] + chrome_h + int(rect['y'] + rect['h'] * margin),
        int(rect['w'] * 0.6),
        int(rect['h'] * 0.6),
    )

    print(f"  截图区域: ({region[2]}x{region[3]})")
    img1 = pyautogui.screenshot(region=region)
    img1.save(os.path.join(SCREENSHOT_DIR, "video_before.png"))

    time.sleep(wait_sec)

    img2 = pyautogui.screenshot(region=region)
    img2.save(os.path.join(SCREENSHOT_DIR, "video_after.png"))

    # 采样比较
    p1 = list(img1.getdata())
    p2 = list(img2.getdata())
    total = min(len(p1), len(p2))
    sample = 50
    diff = sum(1 for i in range(0, total, sample) if p1[i] != p2[i])
    percent = diff / (total / sample) * 100

    print(f"  像素差异: {percent:.1f}%")
    return percent > 1.5


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60)
    print("宁夏继续教育培训平台 — 自动学习 v5")
    print("=" * 60)

    subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'],
                   capture_output=True, timeout=5)
    time.sleep(0.5)

    course_id = "9bLKpGpxb5xLFPLbXydsq"
    section_id = course_id + "1-2"
    trainplan_id = "906b3449ed6d4441a19ef36d24183514"

    # ---- 1. 培训计划列表 ----
    print("\n[1] 培训计划列表")
    vue_navigate("/v_trainplan_list")
    print(f"  {get_url()}")

    # ---- 2. 点击「继续学习」----
    print("\n[2] 点击「继续学习」")
    close_dialogs()
    # 先用 JS 点击(之前验证过有效)
    if not js_click(".column-btn-over"):
        js_click_text("继续学习", "button")
    time.sleep(4)
    close_dialogs()
    print(f"  {get_url()}")

    # ---- 3. 进入课程详情 ----
    print("\n[3] 进入课程详情")
    vue_navigate("/v_courseDetails", {
        "courseId": course_id, "trainplanId": trainplan_id,
        "platformId": "135", "fromPage": "selected"
    })
    print(f"  {get_url()}")

    # ---- 4. 进入视频页面 ----
    print("\n[4] 进入视频播放页")
    vue_navigate("/v_video", {
        "courseId": course_id, "sectionId": section_id,
        "trainplanId": trainplan_id, "platformId": "135"
    })
    print(f"  {get_url()}")

    # ---- 5. 启动视频 ----
    print("\n[5] 启动视频播放")
    vue_call("openVideoBySectionId")
    time.sleep(3)
    # 点击 iframe 中心（跨域播放按钮）
    click_iframe_center()
    time.sleep(2)
    click_iframe_center()  # 第二次确保播放

    # ---- 6. 检测视频播放 ----
    print("\n[6] 检测视频播放（截图对比）")
    playing = capture_and_compare(wait_sec=3)
    if not playing:
        print("  重试: 点击 iframe 偏下位置...")
        click_iframe_center()
        time.sleep(5)
        playing = capture_and_compare(wait_sec=3)
    print(f"  {'✓ 视频播放中' if playing else '⚠ 未检测到播放（继续执行）'}")

    # ---- 7. 等待 15 秒 ----
    print("\n[7] 等待学习时间...")
    for i in range(15, 0, -1):
        if i % 5 == 0 or i <= 3:
            print(f"  {i}s...", flush=True)
        time.sleep(1)

    # ---- 8. 结束学习 ----
    print("\n[8] 结束学习")
    # 调用 Vue 方法记录学习时间
    print(f"  endLearn: {vue_call('endLearn')}")
    time.sleep(1)

    # 点击「结束学习」(尝试 3 次)
    for attempt in range(3):
        print(f"  attempt {attempt+1}/3")
        js_click("p.fr")
        vx, vy = get_element_viewport_center("p.fr")
        if vx:
            bounds = get_window_bounds()
            chrome_h = get_safari_chrome_h()
            pyautogui.click(bounds[0] + vx, bounds[1] + chrome_h + vy)
        time.sleep(3)
        if 'v_video' not in get_url():
            print("  ✓ 已离开视频页")
            break
    else:
        print("  点击无效，回退到前页...")
        run_js('window.history.back()')
        time.sleep(3)

    # ---- 9. 返回选课列表 ----
    print("\n[9] 返回选课列表")
    current = get_url()
    if 'v_selected_course' not in current:
        # 先尝试点击页面上的"选课列表"面包屑
        clicked = js_click_text("选课列表", "a") or js_click_text("选课列表", "span")
        if not clicked:
            # Vue Router 导航兜底
            vue_navigate("/v_selected_course", {
                "trainplanId": trainplan_id, "platformId": "135", "hidePlanEndDate": "false"
            })
    print(f"  {get_url()}")

    print(f"\n{'=' * 60}")
    print(f"✓ 全部完成! 最终: {get_url()}")
    print(f"截图: {SCREENSHOT_DIR}/")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
