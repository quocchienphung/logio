"""Side-by-side contact sheets of the frozen reference vs the local capture at one phone width.
python pairs.py <width> <out_dir> <ref_y0> <ref_y1> [step=1500] [local_offset=0]
Left column = reference, right column = local (shifted by local_offset px), `cols` pairs per sheet."""
import sys, os
from PIL import Image, ImageDraw
w = int(sys.argv[1]); out = sys.argv[2]; y0 = int(sys.argv[3]); y1 = int(sys.argv[4])
step = int(sys.argv[5]) if len(sys.argv) > 5 else 1500
off = int(sys.argv[6]) if len(sys.argv) > 6 else 0
ref = Image.open(f"docs/research/stripe-live/full-{w}.png").convert("RGB")
loc = Image.open(f"docs/design-references/mobile/full-{w}.png").convert("RGB")
os.makedirs(out, exist_ok=True)
cols = 2
y = y0
n = 0
while y < y1:
    pairs = []
    for c in range(cols):
        yy = y + c * step
        if yy >= y1: break
        h = min(step, y1 - yy)
        a = ref.crop((0, yy, w, yy + h))
        b = loc.crop((0, yy + off, w, yy + off + h))
        im = Image.new("RGB", (w * 2 + 10, h), (255, 0, 255))
        im.paste(a, (0, 0)); im.paste(b, (w + 10, 0))
        d = ImageDraw.Draw(im)
        d.text((4, 2), f"REF y{yy}", fill=(255, 0, 0)); d.text((w + 14, 2), f"LOCAL y{yy + off}", fill=(255, 0, 0))
        pairs.append(im)
    sheet = Image.new("RGB", (sum(p.width for p in pairs) + 20 * (len(pairs) - 1), max(p.height for p in pairs)), (40, 40, 40))
    x = 0
    for p in pairs:
        sheet.paste(p, (x, 0)); x += p.width + 20
    path = os.path.join(out, f"pair-{w}-{n:02d}.png")
    sheet.save(path)
    print(path, sheet.size)
    n += 1
    y += step * cols
