// Helpers for the compact frames produced by canvas-trace.mjs.
export const pairs = flat => { const out = []; for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]); return out; };
export const rgbOf = s => { const m = /rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
export const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
export const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/** One frame -> { t, platform, cells: [{ left, front, top, colors }], labels, extra } assuming the painter draws a platform and then 3 faces per cell. */
export function structure(frame) {
  const polys = frame.polys.map(poly => ({ ...poly, pts: pairs(poly.p) }));
  const platform = polys[0];
  const rest = polys.slice(1);
  const cells = [];
  for (let i = 0; i + 2 < rest.length; i += 3) cells.push({ side: rest[i], front: rest[i + 1], top: rest[i + 2] });
  return { t: frame.t, now: frame.now, platform, cells, labels: frame.labels, lines: frame.lines, other: frame.other, count: polys.length };
}

const near = (p, q) => Math.abs(p[0] - q[0]) < 0.011 && Math.abs(p[1] - q[1]) < 0.011;
/** Like `structure`, but tolerates culled faces: a cell is a (front, top) pair sharing two vertices; a side face may precede it. */
export function structureFlexible(frame) {
  const polys = frame.polys.map(poly => ({ ...poly, pts: pairs(poly.p) }));
  const platform = polys[0], cells = [];
  for (let k = 1; k < polys.length - 1; k++) {
    const a = polys[k], b = polys[k + 1];
    if (a.pts.length === 4 && b.pts.length === 4 && near(a.pts[2], b.pts[2]) && near(a.pts[3], b.pts[3])) {
      const maybeSide = polys[k - 1];
      const side = k >= 2 && maybeSide.pts.length === 4 && !(cells.length && cells.at(-1).topIndex === k - 1) && (near(maybeSide.pts[1], b.pts[0]) || near(maybeSide.pts[1], b.pts[1])) ? maybeSide : null;
      cells.push({ side, front: a, top: b, topIndex: k + 1 });
      k += 1;
    }
  }
  return { t: frame.t, platform, cells, labels: frame.labels, lines: frame.lines, other: frame.other, count: polys.length };
}
