"""GPU / compositor cost of one traced transition (trace.mjs): python gpu.py trace.json [more.json ...]"""
import json, sys, collections

def summarize(path):
    d = json.load(open(path, encoding="utf8"))
    ev = d["traceEvents"] if isinstance(d, dict) else d
    names = {(e["pid"], e["tid"]): e["args"]["name"] for e in ev if e.get("ph") == "M" and e.get("name") == "thread_name"}
    pr = [e for e in ev if e.get("name") == "EventDispatch" and e.get("args", {}).get("data", {}).get("type") == "pagereveal"]
    t0 = pr[-1]["ts"] if pr else min(e["ts"] for e in ev if e.get("name") == "navigationStart")
    win = (t0, t0 + 2000000)
    gpu = [k for k, v in names.items() if v == "CrGpuMain"]
    busy = 0
    fin = 0
    raster = 0
    worst = 0
    for e in ev:
        if e.get("ph") != "X" or (e["pid"], e["tid"]) not in gpu or not (win[0] <= e["ts"] <= win[1]):
            continue
        if e["name"] == "ThreadControllerImpl::RunTask":
            busy += e["dur"]
            worst = max(worst, e["dur"])
        elif e["name"] == "SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass":
            fin += e["dur"]
        elif e["name"] == "RasterDecoderImpl::DoEndRasterCHROMIUM":
            raster += e["dur"]
    return busy / 1000, fin / 1000, raster / 1000, worst / 1000

for p in sys.argv[1:]:
    b, f, r, w = summarize(p)
    print(f"{p.split('/')[-1]:28s} gpu-busy {b:6.0f}ms  render-pass {f:6.0f}ms  raster {r:6.0f}ms  longest-task {w:5.0f}ms")
