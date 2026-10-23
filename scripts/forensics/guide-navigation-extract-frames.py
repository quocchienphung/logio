"""Extracts every frame of the reference clip to docs/research/guide-navigation/video-frames/fNNN.png.
Usage: python -I scripts/forensics/guide-navigation-extract-frames.py [path-to-clip]
The clip is kept at docs/SaveThreads.com_Threads_Media_4010696791841344291_001_574p.mp4."""
import os, sys, cv2
clip = sys.argv[1] if len(sys.argv) > 1 else "docs/SaveThreads.com_Threads_Media_4010696791841344291_001_574p.mp4"
out = "docs/research/guide-navigation/video-frames"
os.makedirs(out, exist_ok=True)
video = cv2.VideoCapture(clip)
index = 0
while True:
    ok, frame = video.read()
    if not ok:
        break
    cv2.imwrite(f"{out}/f{index:03d}.png", frame)
    index += 1
print(index, "frames")
