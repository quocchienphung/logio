"""Compare two full-page screenshots: per-band mismatch table + side-by-side/diff images.
python3 diff.py ref.png local.png out_prefix [band=900]"""
import sys
import numpy as np
from PIL import Image, ImageChops
ref, loc, out = sys.argv[1:4]
band = int(sys.argv[4]) if len(sys.argv) > 4 else 900
a = Image.open(ref).convert("RGB"); b = Image.open(loc).convert("RGB")
w = min(a.width, b.width); h = max(a.height, b.height)
A = Image.new("RGB", (w, h), (255, 0, 255)); A.paste(a.crop((0, 0, w, a.height)))
B = Image.new("RGB", (w, h), (255, 0, 255)); B.paste(b.crop((0, 0, w, b.height)))
# compare in luminance: the local build is monochrome by design, so hue differences are intentional
la = np.asarray(A.convert("L")).astype(int); lb = np.asarray(B.convert("L")).astype(int)
d = np.abs(la - lb) > 24
print(f"ref {a.size} local {b.size}  overall mismatch {d.mean()*100:.2f}%")
for y in range(0, h, band):
    m = d[y:y+band].mean() * 100
    print(f"  y {y:6d}-{min(h, y+band):6d}: {m:6.2f}% {'#' * int(m / 2)}")
diff = Image.fromarray((d * 255).astype(np.uint8))
side = Image.new("RGB", (w * 3, h), "white")
side.paste(A, (0, 0)); side.paste(B, (w, 0)); side.paste(diff.convert("RGB"), (2 * w, 0))
side.save(out + "-side.png")
