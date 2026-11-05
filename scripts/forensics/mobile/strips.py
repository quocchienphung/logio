"""Contact sheet of one local capture cut into vertical strips side by side.
python strips.py <width> <y0> <y1> <strip_h> <out.png> [scale=1.0]"""
import sys
from PIL import Image, ImageDraw
w=int(sys.argv[1]); y0=int(sys.argv[2]); y1=int(sys.argv[3]); sh=int(sys.argv[4]); out=sys.argv[5]
scale=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
im=Image.open(f"docs/design-references/mobile/full-{w}.png").convert("RGB")
strips=[]
y=y0
while y<y1:
    c=im.crop((0,y,w,min(y+sh,y1,im.height)))
    d=ImageDraw.Draw(c); d.text((3,2),f"y{y}",fill=(255,0,0))
    strips.append(c); y+=sh
tw=int(w*scale); th=int(sh*scale)
sheet=Image.new("RGB",((tw+8)*len(strips),th),(40,40,40))
for i,s in enumerate(strips):
    sheet.paste(s.resize((tw,int(s.height*scale))),(i*(tw+8),0))
sheet.save(out); print(out,sheet.size)
