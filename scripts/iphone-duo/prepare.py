"""Download the Apple iPhone Duo reference assets and flatten the model's unfolded pose.

Same preparation as chuspeeism/iphone-duo (scripts/prepare-assets.py): the Star White USDZ with its
"Pose" variant set to "Landscape", flattened to USDC with browser-relative texture paths, plus the
lock-screen overlay whose status glyph (Wi-Fi + battery ring) is reused on the homepage.

    python -m pip install usd-core==26.8
    python scripts/iphone-duo/prepare.py temp/iphone-duo
"""

import sys
from pathlib import Path
from urllib.request import urlretrieve
from zipfile import ZipFile

from pxr import Sdf, Usd

MODEL_URL = "https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz"
OVERLAY_URL = "https://www.apple.com/v/iphone-duo/a/static/uploads/dIFKSKvliUSYOBw/MszYeqEKDgnBqxc/CRqwzvoYesuhNwK/lockscreen_ui_inner-wallpaper_png.avif"

work = Path(sys.argv[1] if len(sys.argv) > 1 else "temp/iphone-duo").resolve()
textures = work / "textures"
textures.mkdir(parents=True, exist_ok=True)

model = work / "iPhone_Duo_Star_White.usdz"
if not model.exists():
    print("Downloading the Apple reference model...", flush=True)
    urlretrieve(MODEL_URL, model)
overlay = work / "clock-inner.avif"
if not overlay.exists():
    urlretrieve(OVERLAY_URL, overlay)

with ZipFile(model) as archive:
    for name in archive.namelist():
        if Path(name).suffix.lower() in {".png", ".jpg", ".jpeg", ".avif"}:
            (textures / Path(name).name).write_bytes(archive.read(name))

stage = Usd.Stage.Open(str(model))
stage.GetDefaultPrim().GetVariantSet("Pose").SetVariantSelection("Landscape")
flattened = Usd.Stage.Open(stage.Flatten())
for prim in flattened.Traverse():
    for attribute in prim.GetAttributes():
        value = attribute.Get()
        if isinstance(value, Sdf.AssetPath) and value.path:
            filename = Path(value.path.split("[")[-1].rstrip("]")).name
            attribute.Set(Sdf.AssetPath(f"textures/{filename}"))
flattened.GetRootLayer().Export(str(work / "iPhone_Duo_Render.usdc"))
print(f"Prepared {work}. Next: node scripts/iphone-duo/convert.mjs {work}")
