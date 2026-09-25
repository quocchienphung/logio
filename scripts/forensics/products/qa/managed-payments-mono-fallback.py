"""Monochrome copy of the globe fallback image for /managed-payments, using the project's ribbon
hue -> luminance map (scripts/mono-assets.py hue_map + LIGHT_KEYS: violet -> charcoal, pink -> mid grey,
coral -> light grey). Source: public/stripe/money-movement-fallback_2x-w894-1283768c.webp (the reference
GlobeFallback image). Output: public/sites/stripe-com-9ababc9a/managed-payments/globe-fallback-mono.webp
Run: python3 scripts/forensics/products/qa/managed-payments-mono-fallback.py
"""
import importlib.util
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
spec = importlib.util.spec_from_file_location("mono_assets", os.path.join(ROOT, "scripts", "mono-assets.py"))
mono = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mono)

src = os.path.join(ROOT, "public", "stripe", "money-movement-fallback_2x-w894-1283768c.webp")
dst = os.path.join(ROOT, "public", "sites", "stripe-com-9ababc9a", "managed-payments", "globe-fallback-mono.webp")
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float64) / 255
v = mono.hue_map(a, mono.LIGHT_KEYS)
Image.fromarray((np.clip(np.repeat(v[..., None], 3, -1), 0, 1) * 255).round().astype(np.uint8), "RGB").save(dst, quality=92)
print(dst, os.path.getsize(dst))
