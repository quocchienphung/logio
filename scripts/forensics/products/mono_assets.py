"""Monochrome pass over the localized product-page assets (public/sites/stripe-com-9ababc9a/products).

Rules follow docs/research/MONOCHROME_SYSTEM.md: third-party marks (company logos, case-study covers,
analyst report covers, payment-method marks, flags) keep their colours; brand-wave / gradient
backgrounds use the designed hue -> luminance curve (scripts/mono-assets.py LIGHT_KEYS); photos and UI
screenshots use perceptual luminance. Files are rewritten in place (the pristine originals stay in the
download mirror); converted files are listed in docs/research/products/_build/mono-assets.json so the
pass is idempotent.
Run: python3 scripts/forensics/products/mono_assets.py
"""
import json, os, re, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from mono import mono_text  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DIR = os.path.join(ROOT, "public/sites/stripe-com-9ababc9a/products")
LOG = os.path.join(ROOT, "docs/research/products/_build/mono-assets.json")
LIGHT_KEYS = [(0, 0.54), (25, 0.63), (45, 0.72), (70, 0.78), (150, 0.76), (200, 0.82), (235, 0.72), (255, 0.40), (270, 0.26), (290, 0.28), (310, 0.34), (330, 0.42), (350, 0.50), (360, 0.54)]

BRAND = re.compile(
    r"^(Adobe|Amazon|Anthropic|Atlassian|Figma|figma|Intercom|Lovable|Oracle|shopify|uber|WooCommerce|typeform-|ghost-|"
    r"assembled-|keap|retool|thinkific|ProductBoard|LogRocket|ChowNow|Jam|Partner_circular_logos|apple-pay-logo|"
    r"Klarna-|flags|CaseStudyCarousel_|forrester-chippy|gartner-chippy|\w+CaseStudyChip|hip-|togethere-icon|"
    r"Sprout-|Streamline|Showflix|Cryptee|Learnetto|Mindvalley|ContactMonkey|Felyx|Terminal49|ValueMyStuff|"
    r"US_Mobile|URBN|Eight_Sleep|Fox_Sports|beautiful_ai|Scribble|3dusher|content-|code-)",
)
RIBBON = re.compile(r"(WAVE|[Ww]ave|graphic-bg|BackgroundWave|brand_wave|stepper_background|glitch-bg|Background|S700_background|Bento_Card)")


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hue_map(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    c = mx - mn
    l = (mx + mn) / 2
    cs = np.where(c == 0, 1, c)
    h = np.where(mx == r, ((g - b) / cs) % 6, np.where(mx == g, (b - r) / cs + 2, (r - g) / cs + 4)) * 60
    h = np.where(c > 1e-6, h, 0)
    hv = np.interp(h, [k[0] for k in LIGHT_KEYS], [k[1] for k in LIGHT_KEYS])
    w = smoothstep(0.08, 0.55, c)
    return np.clip(l * (1 - w) + hv * (0.70 + 0.55 * l) * w, 0, 1)


def luminance(rgb):
    return np.clip(rgb @ np.array([0.2126, 0.7152, 0.0722]), 0, 1)


def convert_raster(path, ribbon):
    im = Image.open(path)
    fmt = im.format
    has_alpha = im.mode in ("RGBA", "LA", "P") and ("transparency" in im.info or im.mode in ("RGBA", "LA"))
    a = np.asarray(im.convert("RGBA")).astype(np.float64) / 255
    v = hue_map(a[..., :3]) if ribbon else luminance(a[..., :3])
    g = (v * 255).round().astype(np.uint8)
    if has_alpha:
        out = Image.fromarray(np.dstack([g, (a[..., 3] * 255).round().astype(np.uint8)]), "LA")
    else:
        out = Image.fromarray(g, "L")
    if fmt == "JPEG":
        out.convert("L").save(path, "JPEG", quality=90)
    elif fmt == "WEBP":
        out.convert("RGBA" if has_alpha else "RGB").save(path, "WEBP", quality=90)
    else:
        out.save(path, "PNG", optimize=True)


def main():
    done = set(json.load(open(LOG))) if os.path.exists(LOG) else set()
    counts = {"brand": 0, "ribbon": 0, "luminance": 0, "svg": 0, "skipped": 0}
    for name in sorted(os.listdir(DIR)):
        path = os.path.join(DIR, name)
        ext = name.rsplit(".", 1)[-1].lower()
        if name in done:
            continue
        if BRAND.match(name):
            counts["brand"] += 1
            continue
        if ext == "svg":
            s = open(path, encoding="utf-8", errors="ignore").read()
            open(path, "w", encoding="utf-8").write(mono_text(s))
            counts["svg"] += 1
        elif ext in ("png", "jpg", "jpeg", "webp", "gif"):
            try:
                ribbon = bool(RIBBON.search(name))
                convert_raster(path, ribbon)
                counts["ribbon" if ribbon else "luminance"] += 1
            except Exception as e:  # animated gifs etc.
                print("skip", name, e)
                counts["skipped"] += 1
                continue
        else:
            counts["skipped"] += 1
            continue
        done.add(name)
    json.dump(sorted(done), open(LOG, "w"), indent=0)
    print(counts)


if __name__ == "__main__":
    main()
