"""Side-by-side / diff montage and ink-box measurements: video frame vs local render (716 x 574)."""
import sys, cv2, numpy as np
D = "docs/research/guide-navigation/"
def pair(frame):
    a = cv2.imread(f"{D}video-frames/{frame}.png"); b = cv2.imread(f"{D}comparison/local-{frame}.png")
    return a, b
def ink(g, box, thr):
    x0, y0, x1, y1 = box; m = g[y0:y1, x0:x1] < thr; ys, xs = np.where(m)
    return (xs.min() + x0, ys.min() + y0, xs.max() + x0, ys.max() + y0) if len(xs) else None
BOXES = {"heading": ((160, 160, 370, 200), 130), "sup": ((368, 160, 420, 180), 200),
         "bar": ((150, 200, 164, 420), 90), "preview": ((320, 200, 560, 420), None)}
for frame in sys.argv[1:] or ["f000", "f096", "f174"]:
    a, b = pair(frame)
    ga, gb = (cv2.cvtColor(x, cv2.COLOR_BGR2GRAY) for x in (a, b))
    print(frame, "mean abs diff", round(float(np.abs(ga.astype(int) - gb.astype(int)).mean()), 2))
    for name, (box, thr) in BOXES.items():
        if thr is None:
            ma = np.abs(ga.astype(int) - 250) > 12; mb = np.abs(gb.astype(int) - 250) > 12
            x0, y0, x1, y1 = box
            def bb(m):
                ys, xs = np.where(m[y0:y1, x0:x1]); return (xs.min() + x0, ys.min() + y0, xs.max() + x0, ys.max() + y0)
            print(" ", name, "video", bb(ma), "local", bb(mb))
        else:
            print(" ", name, "video", ink(ga, box, thr), "local", ink(gb, box, thr))
    # text rows: ink of each label (exclude bar column)
    for name, box, thr in (("label1", (178, 225, 300, 262), 215), ("label2", (178, 285, 300, 335), 215), ("label3", (178, 355, 300, 405), 215), ("num", (164, 225, 180, 262), 235)):
        print(" ", name, "video", ink(ga, box, thr), "local", ink(gb, box, thr))
    diff = cv2.absdiff(a, b)
    overlay = cv2.addWeighted(a, .5, b, .5, 0)
    cv2.imwrite(f"{D}comparison/montage-{frame}.png", np.hstack([a, b, 255 - cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)[..., None].repeat(3, 2), overlay]))
