#!/usr/bin/env python3
"""Extract still frames from a placement video so they can be analysed step by step.

Run this on your own machine (YouTube blocks downloads from cloud IPs).

    pip install yt-dlp            # ffmpeg must also be on PATH
    # either let it download the needed section itself:
    python extract_frames.py --url https://www.youtube.com/watch?v=aVUqaB0IMh4 \
        --trace phil65/placement_trace.jsonl --out phil65/frames
    # or point it at a file you already downloaded (e.g. via the googlevideo link):
    python extract_frames.py --file video.mp4 --trace phil65/placement_trace.jsonl --out phil65/frames

It grabs a frame every --every seconds across [--start, --end] plus one frame
just after every timestamp in the trace (+3 s, when the action is usually done).
Frames are named by video time, e.g. f_3543.jpg = 59:03.
"""
import argparse
import json
import subprocess
from pathlib import Path


def mmss(t: str) -> int:
    m, s = t.split(":")
    return int(m) * 60 + int(s)


def main() -> None:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--url")
    src.add_argument("--file")
    ap.add_argument("--trace", help="placement_trace.jsonl; adds a frame after each step")
    ap.add_argument("--out", required=True)
    ap.add_argument("--start", default="52:00")
    ap.add_argument("--end", default="94:00")
    ap.add_argument("--every", type=int, default=10, help="seconds between periodic frames")
    ap.add_argument("--width", type=int, default=1600)
    a = ap.parse_args()

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    start, end = mmss(a.start), mmss(a.end)

    video, offset = a.file, 0
    if a.url:
        video = str(out / "_section.mp4")
        subprocess.run(["yt-dlp", "-f", "bv*[height<=1080][ext=mp4]/bv*[height<=1080]",
                        "--download-sections", f"*{start}-{end}", "--force-keyframes-at-cuts",
                        "-o", video, a.url], check=True)
        offset = start  # the section file starts at 0

    times = set(range(start, end + 1, a.every))
    if a.trace:
        for line in Path(a.trace).read_text().splitlines():
            t = json.loads(line)["t_sec"] + 3
            if start <= t <= end:
                times.add(t)

    for t in sorted(times):
        dst = out / f"f_{t}.jpg"
        if dst.exists():
            continue
        subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t - offset), "-i", video,
                        "-frames:v", "1", "-vf", f"scale={a.width}:-2", "-q:v", "3", str(dst)],
                       check=True)
    if a.url:
        Path(video).unlink(missing_ok=True)
    print(f"{len(times)} frames in {out}")


if __name__ == "__main__":
    main()
