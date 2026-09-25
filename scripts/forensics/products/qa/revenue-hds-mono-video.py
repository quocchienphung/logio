"""Monochrome pass for the /billing/usage-based-billing hero background video.

Frames are mapped with the same hue -> luminance ribbon curve as the poster image
(scripts/forensics/products/mono_assets.py hue_map), so the poster -> video cross-fade does not shift.
Run: python3 scripts/forensics/products/qa/revenue-hds-mono-video.py
"""
import os
import subprocess
import sys

import imageio_ffmpeg
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from mono_assets import hue_map  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
SRC = "/home/user/mirror/videos.stripeassets.com/fzn2n1nzq965/1nCK5nu1sPBwcrf3QailhU/67db058d7508e20ce08a32e88fd3290b/output.mp4"
OUT = os.path.join(ROOT, "public/sites/stripe-com-9ababc9a/revenue/ubb-hero-background-mono.mp4")
W, H = 1600, 640
FF = imageio_ffmpeg.get_ffmpeg_exe()

dec = subprocess.Popen([FF, "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(
    [FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", "30", "-i", "-",
     "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", OUT],
    stdin=subprocess.PIPE,
)
n = 0
size = W * H * 3
while True:
    buf = dec.stdout.read(size)
    if len(buf) < size:
        break
    rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32) / 255
    g = (hue_map(rgb) * 255).round().astype(np.uint8)
    enc.stdin.write(g.tobytes())
    n += 1
enc.stdin.close()
enc.wait()
dec.wait()
print(n, "frames ->", OUT, os.path.getsize(OUT))
