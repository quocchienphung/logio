"""Bake only this fixed inscription into SVG outlines from the app's local Inter font."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parents[2]
font = TTFont(root / 'public/sites/affectui-usage-meter/fonts/inter-latin-500-normal.woff2')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
text = '\u00a9 Remplac\u00e9 par Logio'
scale = 44 / font['head'].unitsPerEm
advances = [font['hmtx'][cmap[ord(char)]][0] * scale for char in text]
x = (720 - sum(advances)) / 2
paths = []
for char, advance in zip(text, advances):
    pen = SVGPathPen(glyphs, ntos=lambda n: str(round(n, 3)))
    glyphs[cmap[ord(char)]].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 63)))
    if char != ' ':
        paths.append({'char': char, 'd': pen.getCommands()})
    x += advance
(root / 'src/components/sites/guide-intro/engraving-paths.json').write_text(
    json.dumps({'text': text, 'paths': paths}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
