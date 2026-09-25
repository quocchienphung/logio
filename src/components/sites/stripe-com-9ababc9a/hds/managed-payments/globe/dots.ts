// Dot placement (reference module 48343, run in the dotGeneration worker). A Fibonacci sphere of
// `dotCount` points, each nudged along its tangent plane by a hashed jitter (0.15 x poissonJitter),
// kept only where the equirectangular land mask has alpha > 0. Per-dot attributes drive size/opacity
// variation and the corona lift-off (25% of dots may participate).
// Pure function: no DOM, safe to run in a worker.

export interface DotGenerationParams {
  imageWidth: number;
  imageHeight: number;
  imageData: Uint8ClampedArray;
  dotCount: number;
  radius: number;
  poissonJitter: number;
  dotSizeVariation: number;
  dotOpacityVariation: number;
}

export interface DotData {
  positions: Float32Array;
  rndIds: Float32Array;
  sizeVariations: Float32Array;
  opacityVariations: Float32Array;
  coronaSeeds: Float32Array;
  varianceRates: Float32Array;
  varianceMotions: Float32Array;
  coronaCanParticipate: Float32Array;
}

/** Reference defaults (module 93534 `u`). */
export const DOT_DEFAULTS = { radius: 2, poissonJitter: 0.75, dotSizeVariation: 0.75, dotOpacityVariation: 0.3 };

const hash3 = (x: number, y: number, z: number) => {
  const v = 43758.5453 * Math.sin(12.9898 * x + 78.233 * y + 37.719 * z);
  return v - Math.floor(v);
};
const hash1 = (x: number) => {
  const v = 43758.5453 * Math.sin(x);
  return v - Math.floor(v);
};

export function generateDots(p: DotGenerationParams): DotData {
  const { imageWidth: iw, imageHeight: ih, imageData, dotCount: n, radius: r, poissonJitter, dotSizeVariation, dotOpacityVariation } = p;
  const positions: number[] = [];
  const rndIds: number[] = [];
  const sizes: number[] = [];
  const opacities: number[] = [];
  const seeds: number[] = [];
  const rates: number[] = [];
  const motions: number[] = [];
  const participate: number[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    const s = Math.sin(phi) * r;
    let x = s * Math.sin(theta);
    let y = Math.cos(phi) * r;
    let z = s * Math.cos(theta);
    if (poissonJitter > 0) {
      const amount = 0.15 * poissonJitter;
      let jx = (hash3(x, y, z) - 0.5) * 2;
      let jy = (hash3(y, z, x) - 0.5) * 2;
      let jz = (hash3(z, x, y) - 0.5) * 2;
      const nl = Math.hypot(x, y, z) || 1;
      const nx = x / nl;
      const ny = y / nl;
      const nz = z / nl;
      const d = jx * nx + jy * ny + jz * nz;
      jx -= nx * d;
      jy -= ny * d;
      jz -= nz * d;
      const jl = Math.hypot(jx, jy, jz);
      if (jl > 0) {
        jx /= jl;
        jy /= jl;
        jz /= jl;
      } else {
        jx = jy = jz = 0;
      }
      x += jx * amount;
      y += jy * amount;
      z += jz * amount;
      const ml = Math.hypot(x, y, z) || 1;
      x = (x / ml) * r;
      y = (y / ml) * r;
      z = (z / ml) * r;
    }
    // Equirectangular uv of (centre - point): the reference samples the antipodal direction and the
    // mask/group rotations are authored to match.
    const l = Math.hypot(x, y, z);
    const u = 1 - (0.5 + Math.atan2(-z / l, -x / l) / (2 * Math.PI));
    const v = 0.5 + Math.asin(-y / l) / Math.PI;
    if (imageData[4 * Math.floor(u * iw) + 4 * iw * Math.floor(v * ih) + 3] > 0) {
      positions.push(x, y, z);
      const rnd = Math.random();
      rndIds.push(rnd);
      sizes.push(1 + (rnd - 0.5) * dotSizeVariation);
      opacities.push(1 - hash3(100 * x, 100 * y, 100 * z) * dotOpacityVariation);
      const seed = hash1(173.17 * rnd);
      seeds.push(seed);
      rates.push(hash1((rnd + 0.31) * 97.13));
      motions.push(hash1((rnd + 0.73) * 57.77));
      participate.push(seed < 0.25 ? 1 : 0);
    }
  }
  return {
    positions: new Float32Array(positions),
    rndIds: new Float32Array(rndIds),
    sizeVariations: new Float32Array(sizes),
    opacityVariations: new Float32Array(opacities),
    coronaSeeds: new Float32Array(seeds),
    varianceRates: new Float32Array(rates),
    varianceMotions: new Float32Array(motions),
    coronaCanParticipate: new Float32Array(participate),
  };
}

export const transferables = (d: DotData): ArrayBuffer[] =>
  [d.positions, d.rndIds, d.sizeVariations, d.opacityVariations, d.coronaSeeds, d.varianceRates, d.varianceMotions, d.coronaCanParticipate].map(
    (a) => a.buffer as ArrayBuffer,
  );
