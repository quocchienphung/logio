"""Copy the core-group QA frames into docs/design-references/products/<slug>/ as palette PNGs (<= 400 KB).
python3 scripts/forensics/products/qa/core-evidence.py <qaDir>"""
import os
import sys

from PIL import Image

Q = sys.argv[1]
D = os.path.join(os.path.dirname(__file__), "../../../../docs/design-references/products")
FRAMES = {
    "1440x1000-hero-core-gradient-a.png": "payments/1440x1000-hero-core-gradient-fadein.png",
    "1440x1000-hero-core-gradient-b.png": "payments/1440x1000-hero-core-gradient-t5s.png",
    "1440x1000-hero-core-gradient-c.png": "payments/1440x1000-hero-core-gradient-afterscroll.png",
    "1440x900-stickynav-core-fixed.png": "payments/1440x900-stickynav-core-fixed.png",
    "390x844-stickynav-core-fixed.png": "payments/390x844-stickynav-core-fixed.png",
    "390x844-stickynav-core-expanded.png": "payments/390x844-stickynav-core-expanded.png",
    "390x844-mobilestickynav-core-sticky.png": "payments/390x844-mobilestickynav-core-sticky.png",
    "ff-strip.png": "payments/1440x900-fastforwardicon-core-start-mid-end.png",
    "payments/1440x900-globe-core-a.png": "payments/1440x900-globe-core-reveal.png",
    "payments/1440x900-globe-core-b.png": "payments/1440x900-globe-core-arcs.png",
    "payments/1440x900-globe-core-static.png": "payments/1440x900-globe-core-static.png",
    "1440x900-globe-core-b.png": "authorization-boost/1440x900-globe-core-arcs.png",
    "1440x900-tooltip-core-open.png": "payment-methods/1440x900-tooltip-core-open.png",
    "1440x900-productnav-core-dropdown-open.png": "invoicing/1440x900-productnav-core-dropdown-open.png",
    "guides-strip.png": "tax/1440x900-guidescard-core-start-mid-end.png",
}
for src, dst in FRAMES.items():
    path = os.path.join(Q, src)
    if not os.path.exists(path):
        print("missing", src)
        continue
    out = os.path.join(D, dst)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.open(path).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)
    print(dst, os.path.getsize(out) // 1024, "KB")
