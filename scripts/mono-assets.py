"""Generate monochrome variants of the raster assets referenced by the site and repoint the references.

Ribbon-style visuals get the same hue -> luminance mapping as the hero shader (orange -> light grey,
pink -> mid grey, violet -> charcoal) so they read as designed material rather than desaturated colour;
photos and UI fallbacks use perceptual luminance. Brand artwork (BRAND) is never converted, and the Visa
logo inside the issuing card placeholder is left byte-identical. Output: <name>-mono.<ext> next to the source, references rewritten.
Run: python scripts/mono-assets.py
"""
import glob, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public", "stripe")
SRC = os.path.join(ROOT, "src")

LIGHT_KEYS = [(0,0.54),(25,0.63),(45,0.72),(70,0.78),(150,0.76),(200,0.82),(235,0.72),(255,0.40),(270,0.26),(290,0.28),(310,0.34),(330,0.42),(350,0.50),(360,0.54)]
DARK_KEYS  = [(0,0.72),(25,0.82),(45,0.92),(70,0.96),(150,0.90),(200,0.94),(235,0.86),(255,0.55),(270,0.40),(290,0.46),(310,0.58),(330,0.68),(350,0.70),(360,0.72)]

RIBBON = ("payment-bento-background", "connect-bento-card-background-image", "ConnectMobileBackground",
          "platform-graphic-background_2x", "card_startups", "wave-fallback-desktop", "wave_crop",
          "annual-letter-", "particles-", "card-placeholder_2x")
DARK_BG = ("dataviz-fallback", "uptime-fallback", "volume-fallback", "subscriptions-fallback")
SKIP = ("palette-", "issuing-palette", "issuing_card", "map_dots", "point_spritesheet", "DatavizStatic3x",
        "QRCode", "WorkInProgressIcon", "money-movement-fallback")
# Third-party brand artwork keeps its official colours: case-study covers carry the company's mark.
BRAND = ("lovable-", "Gamma-", "Runway-", "Supabase-", "decagon-", "browserbase-", "linear-", "Eleven_Labs-")
# Visa logo bounds in card-placeholder_2x (fraction of width/height), padded.
VISA_BOX = (0.578, 0.705, 0.732, 0.766)

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def hue_map(rgb, keys):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1); c = mx - mn; l = (mx + mn) / 2
    cs = np.where(c == 0, 1, c)
    h = np.where(mx == r, ((g - b) / cs) % 6, np.where(mx == g, (b - r) / cs + 2, (r - g) / cs + 4)) * 60
    h = np.where(c > 1e-6, h, 0)
    hv = np.interp(h, [k[0] for k in keys], [k[1] for k in keys])
    w = smoothstep(0.08, 0.55, c)
    return np.clip(l * (1 - w) + hv * (0.70 + 0.55 * l) * w, 0, 1)

def luminance(rgb):
    return np.clip(rgb @ np.array([0.2126, 0.7152, 0.0722]), 0, 1)

def convert(path, name):
    im = Image.open(path); mode = "RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB"
    a = np.asarray(im.convert("RGBA")).astype(np.float64) / 255
    rgb, alpha = a[..., :3], a[..., 3:4]
    if name.startswith(RIBBON):
        v = hue_map(rgb, LIGHT_KEYS)
        if name.startswith("card-placeholder_2x"):
            # dark premium card: saturated (card) pixels compress into charcoal..silver, pale haze stays light
            c = rgb.max(-1) - rgb.min(-1)
            v = np.where(c > 0.12, 0.03 + 0.63 * v, v)
            h, w = v.shape
            keep = np.zeros((h, w), bool)
            keep[int(VISA_BOX[2] * h):int(VISA_BOX[3] * h), int(VISA_BOX[0] * w):int(VISA_BOX[1] * w)] = True
            out = np.where(keep[..., None], rgb, np.repeat(v[..., None], 3, -1))
            return finish(out, alpha, mode, im)
    elif name.startswith(DARK_BG):
        v = hue_map(rgb, DARK_KEYS)
    else:
        v = luminance(rgb)
    return finish(np.repeat(v[..., None], 3, -1), alpha, mode, im)

def finish(rgb, alpha, mode, im):
    arr = np.concatenate([rgb, alpha], -1) if mode == "RGBA" else rgb
    out = Image.fromarray((np.clip(arr, 0, 1) * 255).round().astype(np.uint8), mode)
    return out

def main():
    refs = set()
    for f in glob.glob(os.path.join(SRC, "**", "*.ts*"), recursive=True):
        refs |= set(re.findall(r"/stripe/([^\"'\s]+\.(?:webp|png|jpg|jpeg))", open(f, encoding="utf-8").read()))
    # references may already point at -mono variants (re-runs): resolve back to the source asset
    refs = {re.sub(r"-mono(\.\w+)$", r"\1", n) for n in refs}
    mapping = {}
    for name in sorted(refs):
        if name.startswith(BRAND):
            base, ext = os.path.splitext(name)
            mono = os.path.join(PUB, f"{base}-mono{ext}")
            if os.path.exists(mono): os.remove(mono)
            mapping[f"{base}-mono{ext}"] = name  # point references back at the original asset
            continue
        if any(s in name for s in SKIP): continue
        path = os.path.join(PUB, name)
        if not os.path.exists(path): print("missing", name); continue
        base, ext = os.path.splitext(name); outname = f"{base}-mono{ext}"
        out = convert(path, name)
        kw = {"quality": 92} if ext in (".jpg", ".jpeg", ".webp") else {}
        if name.startswith("card-placeholder_2x") and ext == ".webp":
            kw = {"lossless": True}  # keep the Visa logo byte-exact
        out.save(os.path.join(PUB, outname), **kw)
        mapping[name] = outname
    for f in glob.glob(os.path.join(SRC, "**", "*.ts*"), recursive=True):
        s = open(f, encoding="utf-8").read(); s2 = s
        for a, b in mapping.items(): s2 = s2.replace("/stripe/" + a, "/stripe/" + b)
        if s2 != s: open(f, "w", encoding="utf-8").write(s2)
    print(f"converted {len(mapping)} assets")

if __name__ == "__main__":
    main()
