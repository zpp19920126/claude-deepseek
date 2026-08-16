#!/usr/bin/env python3
"""
实时会议录音 + 讯飞 RTASR 大模型转写 + AI 纪要
==============================================
用法:
  python3 meeting_recorder.py
  python3 meeting_recorder.py --deepseek-key sk-xxx   # + AI 总结

Ctrl+C 停止。
"""

import hashlib
import hmac
import base64
import json
import os
import sys
import time
import ssl
import threading
import argparse
import uuid
import urllib.parse
import datetime
from datetime import datetime as dt

import numpy as np
import sounddevice as sd
from websocket import create_connection, WebSocketException

# ============================================================
# 讯飞 RTASR 大模型凭证
# apikey:  bf103946445d2272fca03632bc721891
# secret:  OGZhMTVmNjg1ODQ0NDE4Y2I5MjMzZjU0
# ============================================================
APP_ID = "958a1342"
ACCESS_KEY_ID = "bf103946445d2272fca03632bc721891"       # apikey
ACCESS_KEY_SECRET = "OGZhMTVmNjg1ODQ0NDE4Y2I5MjMzZjU0"  # apisecret

SAMPLE_RATE = 16000
AUDIO_FRAME_SIZE = 1280

FIXED_PARAMS = {
    "audio_encode": "pcm_s16le",
    "lang": "autodialect",
    "samplerate": "16000",
}

SSL_OPT = {"cert_reqs": ssl.CERT_NONE, "check_hostname": False}


def get_utc_time() -> str:
    tz = datetime.timezone(datetime.timedelta(hours=8))
    return dt.now(tz).strftime("%Y-%m-%dT%H:%M:%S%z")


def build_url() -> str:
    params = {
        "accessKeyId": ACCESS_KEY_ID,
        "appId": APP_ID,
        "uuid": uuid.uuid4().hex,
        "utc": get_utc_time(),
        **FIXED_PARAMS,
    }
    sorted_params = dict(sorted(
        (k, v) for k, v in params.items() if v is not None and str(v).strip()
    ))
    base_str = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted_params.items()
    )
    sig = hmac.new(
        ACCESS_KEY_SECRET.encode("utf-8"),
        base_str.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    params["signature"] = base64.b64encode(sig).decode("utf-8")
    return f"wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?{urllib.parse.urlencode(params)}"


class Transcriber:
    def __init__(self, output_file: str):
        self.output_file = output_file
        self.ws = None
        self.connected = False
        self.session_id = None
        self.last_text = ""
        self.last_flush = 0.0

    def connect(self) -> bool:
        try:
            self.ws = create_connection(
                build_url(), timeout=15, enable_multithread=True, sslopt=SSL_OPT,
            )
            self.connected = True
            print("  ● 已连接")
            time.sleep(0.5)
            t = threading.Thread(target=self._recv_loop, daemon=True)
            t.start()
            return True
        except WebSocketException as e:
            print(f"  ✗ 连接失败: {e}")
            return False
        except Exception as e:
            print(f"  ✗ 异常: {e}")
            return False

    def _recv_loop(self):
        while self.connected and self.ws:
            try:
                msg = self.ws.recv()
                if not msg:
                    self.connected = False
                    break
                if isinstance(msg, bytes):
                    continue

                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("msg_type", "")

                # 启动消息：提取 sessionId
                if msg_type == "action":
                    inner = data.get("data", {})
                    if isinstance(inner, dict):
                        sid = inner.get("sessionId", "")
                        if sid:
                            self.session_id = sid
                    continue

                # 错误
                if msg_type == "error":
                    print(f"\n  ✗ [{data.get('code','')}] {data.get('desc','')}")
                    continue

                # 转写结果
                if msg_type != "result":
                    continue

                result = data.get("data")
                if not isinstance(result, dict):
                    continue

                rt_list = result.get("cn", {}).get("st", {}).get("rt", [])
                words = []
                for seg in rt_list:
                    for ws_item in seg.get("ws", []):
                        for cw in ws_item.get("cw", []):
                            w = cw.get("w", "")
                            if w:
                                words.append(w)

                text = "".join(words).strip()
                if not text or len(text) < 2:
                    continue

                self.last_text = text
                if result.get("ls"):
                    # 完整句子：立即写入
                    now = dt.now().strftime("%H:%M:%S")
                    with open(self.output_file, "a", encoding="utf-8") as f:
                        f.write(f"✓ [{now}] {text}\n\n")
                    print(f"\n  ✓ [{now}] {text}")
                    self.last_text = ""
                    self.last_flush = 0
                else:
                    # 中间结果：屏幕实时显示 + 每 2 秒写入一次文件
                    sys.stdout.write(f"\r  … {text}     ")
                    sys.stdout.flush()
                    now = time.time()
                    if now - self.last_flush > 2.0:
                        with open(self.output_file, "a", encoding="utf-8") as f:
                            f.write(f"… [{dt.now().strftime('%H:%M:%S')}] {text}\n")
                        self.last_flush = now

            except WebSocketException:
                self.connected = False
                break
            except OSError:
                self.connected = False
                break
            except Exception:
                self.connected = False
                break

    def send_audio(self, pcm_bytes: bytes):
        if self.connected and self.ws:
            try:
                self.ws.send_binary(pcm_bytes)
            except Exception:
                self.connected = False

    def end_session(self):
        if self.connected and self.ws:
            try:
                m = {"end": True}
                if self.session_id:
                    m["sessionId"] = self.session_id
                self.ws.send(json.dumps(m, ensure_ascii=False))
                self.session_id = None
            except Exception:
                pass

    def close(self):
        self.connected = False
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass

    def flush(self):
        if self.last_text and self.last_text.strip():
            now = dt.now().strftime("%H:%M:%S")
            with open(self.output_file, "a", encoding="utf-8") as f:
                f.write(f"✓ [{now}] {self.last_text.strip()}\n\n")
            print(f"\n  ✓ [{now}] {self.last_text.strip()}")
            self.last_text = ""

    def dedup(self):
        """去除被完整句或更长版本覆盖的中间片段"""
        try:
            with open(self.output_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
            complete = set()
            for line in lines:
                if line.startswith("✓"):
                    complete.add(line[16:].strip())

            kept = []
            for line in lines:
                if line.startswith("…"):
                    txt = line[16:].strip()
                    if txt in complete:
                        continue
                kept.append(line)

            # 合并连续的 … 行：只保留每组最后（最长）的一条
            merged = []
            i = 0
            while i < len(kept):
                line = kept[i]
                if line.startswith("…"):
                    # 向后找所有连续的 … 行
                    group = [line]
                    j = i + 1
                    while j < len(kept) and kept[j].startswith("…"):
                        group.append(kept[j])
                        j += 1
                    # 只保留最后（最长）的
                    merged.append(group[-1])
                    i = j
                else:
                    merged.append(line)
                    i += 1

            with open(self.output_file, "w", encoding="utf-8") as f:
                f.writelines(merged)
        except Exception:
            pass


# ============================================================
def summarize(path: str, api_key: str) -> str:
    from openai import OpenAI
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    if len(raw) < 200:
        return raw
    print("\n  🤖 DeepSeek 生成结构化纪要...")
    prompt = f"""你是专业会议纪要助手。请将以下语音转写整理为结构化纪要：
1. 提炼核心主题，分节列小标题
2. 保留数字、日期、人名、决策
3. 要点列表，不编造
4. 末尾附待办事项

转写：
---
{raw}
---
Markdown 输出。"""
    try:
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        r = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=4096,
        )
        return r.choices[0].message.content
    except Exception as e:
        print(f"  ✗ DeepSeek: {e}")
        return raw


# ============================================================
def main():
    p = argparse.ArgumentParser(description="会议录音 + RTASR 大模型转写")
    p.add_argument("-o", "--output", default=None)
    p.add_argument("-d", "--device", type=int, default=None)
    p.add_argument("--list-devices", action="store_true")
    p.add_argument("--deepseek-key", default=os.environ.get("DEEPSEEK_API_KEY", ""))
    p.add_argument("--no-summary", action="store_true")
    args = p.parse_args()

    if args.list_devices:
        print("\n音频设备:")
        for i, d in enumerate(sd.query_devices()):
            ci, co = d.get("max_input_channels", 0), d.get("max_output_channels", 0)
            print(f"  {i}: {d['name']} ({'🎤输入' if ci else '🔊输出'})")
        return

    if args.output is None:
        output_file = f"meeting_notes_{dt.now().strftime('%Y%m%d_%H%M%S')}.md"
    else:
        output_file = args.output

    device = args.device
    if device is None:
        inputs = [(i, d) for i, d in enumerate(sd.query_devices())
                  if d.get("max_input_channels", 0) > 0]
        if not inputs:
            print("❌ 无输入设备")
            sys.exit(1)
        print("\n输入设备:")
        for i, d in inputs:
            print(f"  {i}: {d['name']}")
        device = inputs[0][0] if len(inputs) == 1 else int(input("选择: ").strip())

    dev_name = sd.query_devices()[device]["name"]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"# 会议纪要\n\n**日期**: {dt.now().strftime('%Y年%m月%d日 %H:%M')}\n")
        f.write(f"**引擎**: 讯飞 RTASR 大模型\n")
        if args.deepseek_key and not args.no_summary:
            f.write(" + DeepSeek")
        f.write("\n\n---\n\n")

    print(f"\n  🔴 {output_file}")
    print(f"     设备: {dev_name} | Ctrl+C 停止\n")

    t = Transcriber(output_file)
    if not t.connect():
        sys.exit(1)

    stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype=np.int16, device=device)
    stream.start()

    start_ms = time.time() * 1000
    frame_idx = 0
    running = True

    def sender():
        nonlocal start_ms, frame_idx, running
        try:
            while running:
                if not t.connected:
                    print("\n  ⟳ 重连中...")
                    t.close()
                    time.sleep(1)
                    if t.connect():
                        start_ms = time.time() * 1000
                        frame_idx = 0
                    else:
                        time.sleep(3)
                        continue

                expected = start_ms + (frame_idx * 40)
                diff = expected - time.time() * 1000
                if diff > 0.1:
                    time.sleep(diff / 1000)

                chunk, _ = stream.read(640)
                t.send_audio(chunk.tobytes())
                frame_idx += 1

        except Exception as e:
            print(f"\n  ✗ 发送异常: {e}")

    st = threading.Thread(target=sender, daemon=True)
    st.start()

    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n  ⏸ 停止...")

    running = False
    st.join(timeout=3)
    t.end_session()
    time.sleep(1)
    stream.stop()
    stream.close()
    t.flush()
    t.dedup()
    t.close()

    if args.deepseek_key and not args.no_summary:
        s = summarize(output_file, args.deepseek_key)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(s)
        print(f"\n  ✅ {output_file}")
    else:
        print(f"\n  ✅ {output_file}")


if __name__ == "__main__":
    main()
