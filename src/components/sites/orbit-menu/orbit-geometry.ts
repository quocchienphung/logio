export interface OrbitPoint { x: number; y: number }
export interface OrbitBoundary { left: number; top: number; right: number; bottom: number }

export function orbitPoints(count: number, radius = 104, spread = 150, direction = -90): OrbitPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (direction - spread / 2 + (count === 1 ? spread / 2 : index * spread / (count - 1))) * Math.PI / 180;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

const angularDistance = (a: number, b: number) => ((a - b + 540) % 360) - 180;

/** Pie targeting follows the observed public demo: a dead zone, then angular sectors. */
export function orbitTarget(point: OrbitPoint, count: number, spread = 150, direction = -90, deadZone = 34): number {
  if (count === 0 || Math.hypot(point.x, point.y) < deadZone) return -1;
  const delta = angularDistance(Math.atan2(point.y, point.x) * 180 / Math.PI, direction);
  if (Math.abs(delta) > spread / 2 + 12) return -1;
  return count === 1 ? 0 : Math.max(0, Math.min(count - 1, Math.round((delta + spread / 2) * (count - 1) / spread)));
}

/** Keep the trigger anchored; rotate the fan, then narrow it only at a tight corner. */
export function fitOrbit(origin: OrbitPoint, count: number, boundary: OrbitBoundary, radius = 104, spread = 150, direction = -90) {
  let best = { direction, spread, radius, score: Infinity };
  for (const fan of [spread, Math.min(spread, 120), Math.min(spread, 90)]) {
    // A narrowed six-action fan needs a larger radius to keep 46px targets separate.
    const fittedRadius = count > 1 ? Math.max(radius, 50 / (2 * Math.sin(fan / (count - 1) * Math.PI / 360))) : radius;
    for (let turn = 0; turn < 24; turn++) {
      const candidateDirection = direction + (turn % 2 ? -1 : 1) * Math.ceil(turn / 2) * 15;
      const points = orbitPoints(count, fittedRadius, fan, candidateDirection);
      const overflow = points.reduce((sum, point) => sum + Math.max(0, boundary.left + 28 - origin.x - point.x) + Math.max(0, origin.x + point.x + 28 - boundary.right) + Math.max(0, boundary.top + 28 - origin.y - point.y) + Math.max(0, origin.y + point.y + 28 - boundary.bottom), 0);
      const score = overflow * 100 + (spread - fan) * 2 + Math.abs(angularDistance(candidateDirection, direction)) * 0.05;
      if (score < best.score) best = { direction: candidateDirection, spread: fan, radius: fittedRadius, score };
    }
    if (best.score < 100) break;
  }
  return { direction: best.direction, spread: best.spread, radius: best.radius };
}
