#!/usr/bin/env python3
"""Fetch a YouTube video's English captions + chapters and write a timestamped,
de-duplicated transcript chunked into ~30 s paragraphs.

Usage:
    pip install yt-dlp
    python fetch_transcript.py <youtube-url> <out-dir> [start_min end_min]

Transcripts are not committed to the repo (they are the creator's content);
regenerate them locally with this script.
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def fetch(url: str, out: Path) -> tuple[Path, Path]:
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["yt-dlp", "--skip-download", "--write-auto-subs", "--write-subs",
         "--sub-langs", "en", "--sub-format", "vtt", "--write-info-json",
         "-o", str(out / "video"), url],
        check=True,
    )
    return out / "video.en.vtt", out / "video.info.json"


def parse_vtt(path: Path) -> list[tuple[int, str]]:
    rows, last, t = [], "", 0
    for line in path.read_text().splitlines():
        m = re.match(r"(\d+):(\d+):(\d+)\.\d+ -->", line)
        if m:
            t = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
            continue
        line = line.strip()
        # Auto-captions repeat each line with inline <c> word timings; keep the clean copy.
        if not line or "<" in line or line.startswith(("WEBVTT", "Kind", "Language")):
            continue
        if line != last:
            rows.append((t, line))
            last = line
    return rows


def chunk(rows, start=0, end=10**9, every=30) -> list[str]:
    out, buf, t0 = [], [], None
    for t, text in rows:
        if not start <= t < end:
            continue
        t0 = t if t0 is None else t0
        buf.append(text)
        if t - t0 >= every:
            out.append(f"[{t0 // 60}:{t0 % 60:02d}] " + " ".join(buf))
            buf, t0 = [], None
    if buf:
        out.append(f"[{t0 // 60}:{t0 % 60:02d}] " + " ".join(buf))
    return out


def main() -> None:
    url, out = sys.argv[1], Path(sys.argv[2])
    start = int(sys.argv[3]) * 60 if len(sys.argv) > 3 else 0
    end = int(sys.argv[4]) * 60 if len(sys.argv) > 4 else 10**9
    vtt, info = fetch(url, out)
    meta = json.loads(info.read_text())
    chapters = [f"{int(c['start_time']) // 60}:{int(c['start_time']) % 60:02d} {c['title']}"
                for c in meta.get("chapters") or []]
    (out / "chapters.txt").write_text("\n".join(chapters) + "\n")
    (out / "transcript.txt").write_text("\n".join(chunk(parse_vtt(vtt), start, end)) + "\n")
    print(f"{meta['title']} ({meta['duration']} s): wrote {out}/transcript.txt, chapters.txt")


if __name__ == "__main__":
    main()
