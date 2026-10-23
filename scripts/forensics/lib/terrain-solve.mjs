import { structure, structureFlexible } from './terrain-parse.mjs';
import { homography, applyH, invertH, lm } from './numeric.mjs';

// The measured scene: a pitch-unit grid (24 hours x 7 days), a platform with a margin, a pinhole orbit camera.
export const MARGIN = 0.29, HALF = 0.4, W = 24 + 2 * MARGIN, D = 7 + 2 * MARGIN;

export function project(p, cam, size) {
  const { yaw, pitch, dist, F, ty, cx = 0, cy = 0, tx = 0, tz = 0 } = cam;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const C = [tx + dist * cp * Math.sin(yaw), ty + dist * sp, tz + dist * cp * Math.cos(yaw)];
  let f = [tx - C[0], ty - C[1], tz - C[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
  let r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map(v => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const q = [p[0] - C[0], p[1] - C[1], p[2] - C[2]];
  const xc = q[0] * r[0] + q[1] * r[1] + q[2] * r[2], yc = q[0] * u[0] + q[1] * u[1] + q[2] * u[2], zc = q[0] * f[0] + q[1] * f[1] + q[2] * f[2];
  return [size[0] / 2 + cx + F * xc / zc, size[1] / 2 + cy - F * yc / zc, zc];
}

/** Fit yaw, pitch, dist, ty (F and the principal point given) to the platform's four corners. */
export function fitPlatform(platform, base, size, guess) {
  const world = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [-W / 2, 0, D / 2]];
  const residual = x => { const cam = { ...base, yaw: x[0], pitch: x[1], dist: x[2], ty: x[3] }; return world.flatMap((p, k) => { const q = project(p, cam, size); return [q[0] - platform[k][0], q[1] - platform[k][1]]; }); };
  let best = guess ? lm(residual, guess, { iterations: 100 }) : null;
  if (!best || best.cost > 1e-2) {
    for (const yaw of [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]) for (const pitch of [0.4, 0.6, 0.8, 1.0, 1.25, 1.5]) for (const dist of [25, 40, 60]) {
      const fit = lm(residual, [yaw, pitch, dist, 0.5], { iterations: 60 });
      if (Number.isFinite(fit.cost) && (!best || fit.cost < best.cost)) best = fit;
    }
  }
  return { cam: { ...base, yaw: best.x[0], pitch: best.x[1], dist: best.x[2], ty: best.x[3] }, rms: Math.sqrt(best.cost / 8) };
}

/** Ground correspondences of a full frame: platform corners and the two ground vertices of every column's front face. */
export function groundPoints(frame) {
  const s = structure(frame);
  const Hi = invertH(homography([[0, 0], [1, 0], [1, 1], [0, 1]], s.platform.pts));
  const world = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [-W / 2, 0, D / 2]], screen = s.platform.pts.slice();
  for (const c of s.cells) {
    const fr = c.front.pts, [a, b] = applyH(Hi, fr[1]);
    const i = Math.round(a * W - MARGIN - 0.9), j = Math.round(b * D - MARGIN - 0.9);
    if (i < 0 || i > 23 || j < 0 || j > 6) continue;
    const X1 = i + 0.5 - 12 + HALF, X0 = i + 0.5 - 12 - HALF, Z = j + 0.5 - 3.5 + HALF;
    world.push([X0, 0, Z], [X1, 0, Z]); screen.push(fr[0], fr[1]);
  }
  return { world, screen };
}

/** Fit every camera parameter (yaw, pitch, dist, F, ty, cx, cy) to the ground correspondences of one frame, starting from `guess`. */
export function fitGround(frame, size, guess) {
  const { world, screen } = groundPoints(frame);
  const residual = x => { const cam = { yaw: x[0], pitch: x[1], dist: x[2], F: x[3], ty: x[4], cx: x[5], cy: x[6] }; return world.flatMap((p, k) => { const q = project(p, cam, size); return [q[0] - screen[k][0], q[1] - screen[k][1]]; }); };
  const fit = lm(residual, guess, { iterations: 200 });
  const [yaw, pitch, dist, F, ty, cx, cy] = fit.x;
  return { cam: { yaw, pitch, dist, F, ty, cx, cy, tx: 0, tz: 0 }, rms: Math.sqrt(fit.cost / (world.length * 2)), points: world.length };
}

/** Same ground fit, but the principal point is the canvas centre (plus `centre` offset) and the target (tx, ty, tz) is free. */
export function fitTarget(frame, size, guess, centre = [0, 0]) {
  const { world, screen } = groundPoints(frame);
  const residual = x => { const cam = { yaw: x[0], pitch: x[1], dist: x[2], F: x[3], tx: x[4], ty: x[5], tz: x[6], cx: centre[0], cy: centre[1] }; return world.flatMap((p, k) => { const q = project(p, cam, size); return [q[0] - screen[k][0], q[1] - screen[k][1]]; }); };
  const fit = lm(residual, guess, { iterations: 300 });
  const [yaw, pitch, dist, F, tx, ty, tz] = fit.x;
  return { cam: { yaw, pitch, dist, F, tx, ty, tz, cx: centre[0], cy: centre[1] }, rms: Math.sqrt(fit.cost / (world.length * 2)) };
}

/** Height (world units) of a column whose top vertex was drawn at `top` above ground point (X, Z). */
export function heightAt(X, Z, top, cam, size) {
  let h = 0.5;
  for (let k = 0; k < 40; k++) {
    const q = project([X, h, Z], cam, size), q2 = project([X, h + 1e-4, Z], cam, size);
    const dy = (q2[1] - q[1]) / 1e-4, dx = (q2[0] - q[0]) / 1e-4;
    const err = [q[0] - top[0], q[1] - top[1]];
    const step = (err[0] * dx + err[1] * dy) / (dx * dx + dy * dy);
    h -= step; if (Math.abs(step) < 1e-9) break;
  }
  return h;
}

/** Cells of a full frame (3 faces each, painter order) as { i, j, h, colors }. Needs the camera of that frame. */
export function cellsOf(frame, cam, size, flexible = false) {
  const s = (flexible ? structureFlexible : structure)(frame);
  const Hi = invertH(homography([[0, 0], [1, 0], [1, 1], [0, 1]], s.platform.pts));
  const out = [];
  for (const c of s.cells) {
    const fr = c.front.pts, ground = fr[1], top = fr[2];
    const [a, b] = applyH(Hi, ground);
    const i = Math.round(a * W - MARGIN - 0.9), j = Math.round(b * D - MARGIN - 0.9);
    if (i < 0 || i > 23 || j < 0 || j > 6) { out.push({ bad: true, a, b }); continue; }
    const X = i + 0.5 - 12 + HALF, Z = j + 0.5 - 3.5 + HALF;
    out.push({ i, j, h: heightAt(X, Z, top, cam, size), top: c.top.f, front: c.front.f, side: c.side?.f });
  }
  return { cells: out, platform: s.platform.pts, labels: s.labels, count: s.count };
}
