#!/usr/bin/env python3
"""
实时会议录音 + 转写 + 纪要生成
================================
用法:
  # 使用 OpenAI Whisper API（需要 API Key）
  export OPENAI_API_KEY=sk-xxx
  python3 meeting_recorder.py

  # 或传入 API Key
  python3 meeting_recorder.py --api-key sk-xxx

  # 使用本地 Whisper 模型（首次需下载模型，约 1.5GB）
  pip3 install openai-whisper
  python3 meeting_recorder.py --local

  # 指定输出文件和音频设备
  python3 meeting_recorder.py --output training_notes.md --device 2

运行后按 Ctrl+C 停止录音，自动生成会议纪要。
"""

import sounddevice as sd
import numpy as np
import wave
import tempfile
import os
import sys
import time
import threading
import queue
import argparse
from datetime import datetime
from pathlib import Path

# ============================================================
# 配置
# ============================================================
SAMPLE_RATE = 16000          # Whisper 推荐 16kHz
CHANNELS = 1                 # 单声道
CHUNK_SECONDS = 15           # 每段录音时长（秒）
OVERLAP_SECONDS = 2          # 片段重叠时长（避免切掉句子）
AUDIO_DTYPE = np.int16       # 16-bit PCM

# ============================================================
# 转写线程
# ============================================================
def transcriber_worker(
    audio_queue: queue.Queue,
    output_file: str,
    client,
    use_local: bool,
):
    """后台线程：从队列取音频片段，转写后写入文件"""
    segment_index = 0

    while True:
        item = audio_queue.get()
        if item is None:  # 结束信号
            break

        audio_data, timestamp_str = item
        segment_index += 1

        # 保存为临时 WAV 文件
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name
            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(CHANNELS)
                wf.setsampwidth(2)  # 16-bit = 2 bytes
                wf.setframerate(SAMPLE_RATE)
                wf.writeframes(audio_data.tobytes())

        try:
            if use_local:
                text = _transcribe_local(wav_path)
            else:
                text = _transcribe_api(client, wav_path)

            if text and text.strip():
                # 追加到纪要文件
                with open(output_file, "a", encoding="utf-8") as f:
                    f.write(f"\n### [{timestamp_str}]\n")
                    f.write(f"{text.strip()}\n")
                print(f"  ✓ [{timestamp_str}] {text.strip()[:80]}...")

        except Exception as e:
            print(f"  ✗ 转写失败 [{timestamp_str}]: {e}")

        finally:
            os.unlink(wav_path)  # 清理临时文件


def _transcribe_api(client, wav_path: str) -> str:
    """通过 OpenAI Whisper API 转写"""
    with open(wav_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
            language="zh",  # 中文为主，自动检测
        )
    return transcript if isinstance(transcript, str) else str(transcript)


def _transcribe_local(wav_path: str) -> str:
    """通过本地 Whisper 转写"""
    import whisper

    if not hasattr(_transcribe_local, "_model"):
        print("加载本地 Whisper 模型（首次较慢）...")
        _transcribe_local._model = whisper.load_model("medium")  # small/medium/large
        print("模型加载完成")

    model = _transcribe_local._model
    result = model.transcribe(wav_path, language="zh", task="transcribe")
    return result["text"]


# ============================================================
# 主流程
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="实时会议录音转写工具"
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="输出 Markdown 文件路径（默认: meeting_notes_YYYYMMDD_HHMMSS.md）",
    )
    parser.add_argument(
        "--chunk-seconds",
        type=int,
        default=CHUNK_SECONDS,
        help=f"每段录音秒数（默认 {CHUNK_SECONDS}）",
    )
    parser.add_argument(
        "--device", "-d",
        type=int,
        default=None,
        help="音频输入设备 ID（不指定则列出设备供选择）",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENAI_API_KEY", ""),
        help="OpenAI API Key（也可通过 OPENAI_API_KEY 环境变量设置）",
    )
    parser.add_argument(
        "--local",
        action="store_true",
        help="使用本地 Whisper 模型而非 API",
    )
    parser.add_argument(
        "--list-devices",
        action="store_true",
        help="列出所有音频设备后退出",
    )
    args = parser.parse_args()

    # 列出设备
    if args.list_devices:
        print("\n可用音频设备:\n")
        devices = sd.query_devices()
        for i, d in enumerate(devices):
            ch_in = d.get("max_input_channels", 0)
            ch_out = d.get("max_output_channels", 0)
            label = "🎤 输入" if ch_in > 0 else "🔊 输出"
            print(f"  {i}: {d['name']} ({label} | {ch_in}in/{ch_out}out)")
        print()
        return

    # 验证模式
    use_local = args.local
    if use_local:
        try:
            import whisper  # noqa: F401
        except ImportError:
            print("未安装 whisper，请先安装: pip3 install openai-whisper")
            sys.exit(1)

    client = None
    if not use_local:
        if not args.api_key:
            print("错误: 请设置 OPENAI_API_KEY 或通过 --api-key 传入")
            print("或者使用 --local 模式（需安装 openai-whisper）")
            sys.exit(1)
        from openai import OpenAI

        client = OpenAI(api_key=args.api_key)

    # 输出文件
    if args.output is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"meeting_notes_{timestamp}.md"
    else:
        output_file = args.output

    # 选择设备
    device = args.device
    if device is None:
        devices = sd.query_devices()
        print("\n可用音频输入设备:")
        inputs = [(i, d) for i, d in enumerate(devices) if d.get("max_input_channels", 0) > 0]
        if not inputs:
            print("  未发现输入设备！")
            sys.exit(1)
        for i, d in inputs:
            print(f"  {i}: {d['name']}")
        if len(inputs) == 1:
            device = inputs[0][0]
            print(f"自动选择设备 {device}: {inputs[0][1]['name']}")
        else:
            choice = input("输入设备编号: ").strip()
            try:
                device = int(choice)
            except ValueError:
                print("无效输入")
                sys.exit(1)

    chunk_frames = args.chunk_seconds * SAMPLE_RATE
    overlap_frames = OVERLAP_SECONDS * SAMPLE_RATE

    # 初始化输出文件
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"# 会议纪要\n\n")
        f.write(f"**日期**: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}\n")
        f.write(f"**模式**: {'本地 Whisper' if use_local else 'OpenAI Whisper API'}\n\n")
        f.write("---\n")

    # 启动转写线程
    audio_queue: queue.Queue = queue.Queue()
    trans_thread = threading.Thread(
        target=transcriber_worker,
        args=(audio_queue, output_file, client, use_local),
        daemon=True,
    )
    trans_thread.start()

    # 录音缓冲区（保留 overlap 帧用于下一段）
    buffer = np.array([], dtype=AUDIO_DTYPE)

    print(f"\n🔴 开始录音 → {output_file}")
    print(f"   设备: {sd.query_devices()[device]['name']}")
    print(f"   每段 {args.chunk_seconds} 秒，重叠 {OVERLAP_SECONDS} 秒")
    print(f"   按 Ctrl+C 停止\n")

    stream = sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype=AUDIO_DTYPE,
        device=device,
    )
    stream.start()

    try:
        while True:
            # 读取一块音频
            frames_needed = chunk_frames
            new_data, _ = stream.read(frames_needed)
            new_data = new_data.flatten()

            # 拼上之前保留的 overlap
            segment = np.concatenate([buffer, new_data]) if len(buffer) > 0 else new_data

            # 保留最后 overlap 帧给下一段
            if len(segment) > overlap_frames:
                buffer = segment[-overlap_frames:]
                segment = segment[:-overlap_frames]
            else:
                buffer = np.array([], dtype=AUDIO_DTYPE)

            timestamp_str = datetime.now().strftime("%H:%M:%S")
            audio_queue.put((segment, timestamp_str))

    except KeyboardInterrupt:
        print("\n⏹ 停止录音...")

    finally:
        stream.stop()
        stream.close()

        # 处理缓冲区剩余音频
        if len(buffer) > SAMPLE_RATE:  # 至少 1 秒
            timestamp_str = datetime.now().strftime("%H:%M:%S")
            audio_queue.put((buffer, timestamp_str))

        # 通知转写线程结束
        audio_queue.put(None)
        trans_thread.join(timeout=30)

        print(f"\n✅ 纪要已保存至: {output_file}")


if __name__ == "__main__":
    main()
