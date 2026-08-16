#!/usr/bin/env python3
"""
桌面实时语音转文字工具
======================
基于讯飞 RTASR 大模型。中间结果原地更新，完整句子换行保留。
"""

import hashlib
import hmac
import base64
import json
import ssl
import threading
import time
import uuid
import urllib.parse
import datetime
import queue
import tkinter as tk
from tkinter import ttk, font

import numpy as np
import sounddevice as sd
from websocket import create_connection, WebSocketException

# ============================================================
APP_ID = "958a1342"
ACCESS_KEY_ID = "bf103946445d2272fca03632bc721891"
ACCESS_KEY_SECRET = "OGZhMTVmNjg1ODQ0NDE4Y2I5MjMzZjU0"
SAMPLE_RATE = 16000
FRAME_MS = 40

FIXED = {"audio_encode": "pcm_s16le", "lang": "autodialect", "samplerate": "16000"}
SSL_OPT = {"cert_reqs": ssl.CERT_NONE, "check_hostname": False}


def get_utc():
    tz = datetime.timezone(datetime.timedelta(hours=8))
    return datetime.datetime.now(tz).strftime("%Y-%m-%dT%H:%M:%S%z")


def build_url():
    params = {"accessKeyId": ACCESS_KEY_ID, "appId": APP_ID,
              "uuid": uuid.uuid4().hex, "utc": get_utc(), **FIXED}
    sp = dict(sorted((k, v) for k, v in params.items() if v and str(v).strip()))
    bs = "&".join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
                  for k, v in sp.items())
    sig = hmac.new(ACCESS_KEY_SECRET.encode(), bs.encode(), hashlib.sha1).digest()
    params["signature"] = base64.b64encode(sig).decode()
    return f"wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?{urllib.parse.urlencode(params)}"


class ASREngine:

    def __init__(self):
        self.ws = None
        self.connected = False
        self.session_id = None
        self.text_queue = queue.Queue()

    def connect(self):
        try:
            self.ws = create_connection(
                build_url(), timeout=15, enable_multithread=True, sslopt=SSL_OPT)
            self.connected = True
            self._start_recv()
            return True
        except Exception as e:
            self.text_queue.put((f"[连接失败: {e}]", True))
            return False

    def _start_recv(self):
        def loop():
            while self.connected and self.ws:
                try:
                    msg = self.ws.recv()
                    if not msg:
                        break
                    if isinstance(msg, bytes):
                        continue
                    data = json.loads(msg)
                    mt = data.get("msg_type", "")
                    if mt == "action":
                        sid = data.get("data", {}).get("sessionId", "")
                        if sid:
                            self.session_id = sid
                        continue
                    if mt == "error":
                        self.text_queue.put((f"[错误: {data.get('desc', '')}]", True))
                        continue
                    if mt != "result":
                        continue
                    result = data.get("data")
                    if not isinstance(result, dict):
                        continue
                    rt = result.get("cn", {}).get("st", {}).get("rt", [])
                    words = []
                    for seg in rt:
                        for ws_item in seg.get("ws", []):
                            for cw in ws_item.get("cw", []):
                                w = cw.get("w", "")
                                if w:
                                    words.append(w)
                    text = "".join(words).strip()
                    if text and len(text) >= 2:
                        is_final = result.get("ls", False)
                        self.text_queue.put((text, is_final))
                except Exception:
                    break
            self.connected = False

        t = threading.Thread(target=loop, daemon=True)
        t.start()

    def send_audio(self, pcm):
        if self.connected and self.ws:
            try:
                self.ws.send_binary(pcm)
            except Exception:
                self.connected = False

    def end_session(self):
        if self.connected and self.ws:
            try:
                m = {"end": True}
                if self.session_id:
                    m["sessionId"] = self.session_id
                self.ws.send(json.dumps(m, ensure_ascii=False))
            except Exception:
                pass

    def close(self):
        self.connected = False
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass


class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("实时语音转文字")
        self.root.geometry("800x600")
        self.root.configure(bg="#1e1e1e")

        self.text_font = font.Font(family="PingFang SC, Microsoft YaHei, sans-serif", size=16)
        self.btn_font = font.Font(family="PingFang SC, Microsoft YaHei, sans-serif", size=13, weight="bold")

        # 状态标签
        self.status_var = tk.StringVar(value="● 就绪")
        status_frame = tk.Frame(self.root, bg="#1e1e1e")
        status_frame.pack(fill=tk.X, padx=20, pady=(20, 5))
        self.status_label = tk.Label(
            status_frame, textvariable=self.status_var, font=("sans-serif", 12),
            fg="#4ec94e", bg="#1e1e1e")
        self.status_label.pack(side=tk.LEFT)

        # 设备选择
        devices = self._list_devices()
        self.device_var = tk.StringVar()
        self.device_menu = ttk.Combobox(
            status_frame, textvariable=self.device_var, values=devices,
            state="readonly", width=38, font=("sans-serif", 11))
        if devices:
            self.device_var.set(devices[0])
        self.device_menu.pack(side=tk.RIGHT)

        # 主文本区
        text_frame = tk.Frame(self.root, bg="#2d2d2d")
        text_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.text_area = tk.Text(
            text_frame, wrap=tk.WORD, font=self.text_font,
            bg="#2d2d2d", fg="#e0e0e0", insertbackground="#e0e0e0",
            relief=tk.FLAT, padx=24, pady=20,
            borderwidth=0, highlightthickness=0)
        self.text_area.pack(fill=tk.BOTH, expand=True)

        scrollbar = tk.Scrollbar(self.text_area, bg="#3d3d3d")
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.text_area.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.text_area.yview)

        self.text_area.tag_configure("partial", foreground="#aaaaaa")
        self.text_area.tag_configure("final", foreground="#e0e0e0", font=self.text_font)
        self.text_area.tag_configure("error", foreground="#ff6b6b")

        # 按钮区
        btn_frame = tk.Frame(self.root, bg="#1e1e1e")
        btn_frame.pack(fill=tk.X, padx=20, pady=(5, 20))

        self.start_btn = tk.Button(
            btn_frame, text="▶  开始录音", font=self.btn_font,
            bg="#4ec94e", fg="#ffffff", activebackground="#3da83d",
            relief=tk.FLAT, padx=32, pady=10, cursor="hand2",
            command=self.toggle)
        self.start_btn.pack(side=tk.LEFT)

        self.clear_btn = tk.Button(
            btn_frame, text="清空", font=self.btn_font,
            bg="#555555", fg="#e0e0e0", activebackground="#666666",
            relief=tk.FLAT, padx=24, pady=10, cursor="hand2",
            command=self.clear_text)
        self.clear_btn.pack(side=tk.RIGHT)

        self.engine = ASREngine()
        self.recording = False
        self.stream = None
        self.sender_thread = None
        self.poll_id = None

        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()

    def _list_devices(self):
        result = []
        try:
            for i, d in enumerate(sd.query_devices()):
                if d.get("max_input_channels", 0) > 0:
                    result.append(f"[{i}] {d['name']}")
        except Exception:
            result = ["[0] 默认设备"]
        return result if result else ["[0] 默认设备"]

    def _get_device_id(self):
        s = self.device_var.get()
        try:
            return int(s.split("]")[0].replace("[", ""))
        except (ValueError, IndexError):
            return 0

    def toggle(self):
        if self.recording:
            self.stop()
        else:
            self.start()

    def start(self):
        self.engine = ASREngine()
        if not self.engine.connect():
            return

        device = self._get_device_id()
        try:
            self.stream = sd.InputStream(
                samplerate=SAMPLE_RATE, channels=1, dtype=np.int16, device=device)
            self.stream.start()
        except Exception as e:
            self._append(f"[录音设备错误: {e}]\n", "error")
            self.engine.close()
            return

        self.recording = True
        self.start_btn.config(text="■  停止录音", bg="#e74c3c", activebackground="#c0392b")
        self.status_var.set("● 录音中...")
        self.status_label.config(fg="#e74c3c")
        self.device_menu.config(state="disabled")

        def sender():
            start_ms = time.time() * 1000
            idx = 0
            try:
                while self.recording and self.engine.connected:
                    expected = start_ms + (idx * FRAME_MS)
                    diff = expected - time.time() * 1000
                    if diff > 0.1:
                        time.sleep(diff / 1000)
                    chunk, _ = self.stream.read(640)
                    self.engine.send_audio(chunk.tobytes())
                    idx += 1
            except Exception:
                pass

        self.sender_thread = threading.Thread(target=sender, daemon=True)
        self.sender_thread.start()
        self._poll_results()

    def _poll_results(self):
        try:
            while True:
                text, is_final = self.engine.text_queue.get_nowait()
                if is_final:
                    # 完整句子：把当前灰色行变白，换行，准备下一句
                    self._commit_final(text)
                else:
                    # 中间结果：原地替换当前行
                    self._update_partial(text)
        except queue.Empty:
            pass

        if self.recording:
            self.poll_id = self.root.after(80, self._poll_results)

    def _update_partial(self, text):
        """原地更新最后一个灰色行，不删除历史内容"""
        # 先删掉 tag="partial" 的所有行，只保留历史上的 final 行
        ranges = self.text_area.tag_ranges("partial")
        if ranges:
            start = ranges[0]
            end = ranges[-1]
            # 检查 end 是否是最后一行（末尾无换行）
            last_char = self.text_area.index("end-1c")
            if self.text_area.compare(end, ">=", last_char):
                end = tk.END
            self.text_area.delete(start, end)
        self.text_area.insert(tk.END, text, "partial")
        self.text_area.see(tk.END)

    def _commit_final(self, text):
        """把当前灰色行替换为白色行并换行"""
        ranges = self.text_area.tag_ranges("partial")
        if ranges:
            start = ranges[0]
            end = ranges[-1]
            last_char = self.text_area.index("end-1c")
            if self.text_area.compare(end, ">=", last_char):
                end = tk.END
            self.text_area.delete(start, end)
        self.text_area.insert(tk.END, text + "\n", "final")
        self.text_area.see(tk.END)

    def _append(self, text, tag="final"):
        self.text_area.insert(tk.END, text, tag)
        self.text_area.see(tk.END)

    def stop(self):
        self.recording = False
        if self.poll_id:
            self.root.after_cancel(self.poll_id)
            self.poll_id = None

        self.engine.end_session()
        if self.sender_thread:
            self.sender_thread.join(timeout=2)

        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

        self.engine.close()

        # 停止时把最后一行灰色转为白色
        ranges = self.text_area.tag_ranges("partial")
        if ranges:
            text = self.text_area.get(ranges[0], ranges[-1])
            self.text_area.delete(ranges[0], tk.END)
            # 去掉末尾换行
            self.text_area.insert(tk.END, text.rstrip("\n") + "\n", "final")

        self.start_btn.config(text="▶  开始录音", bg="#4ec94e", activebackground="#3da83d")
        self.status_var.set("● 就绪")
        self.status_label.config(fg="#4ec94e")
        self.device_menu.config(state="readonly")

    def clear_text(self):
        self.text_area.delete("1.0", tk.END)

    def on_close(self):
        if self.recording:
            self.stop()
        self.root.destroy()


if __name__ == "__main__":
    App()
