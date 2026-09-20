// Dot placement, port of the reference dotGeneration worker (bundle module 48343).
// Fibonacci-sphere sampling with tangent-plane jitter, kept only where the equirectangular land
// mask has alpha > 0. Runs once per page and is shared by every globe instance.

import { GLOBE } from "./config";

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

interface V3 {
  x: number;
  y: number;
  z: number;
}

const hash3 = (x: number, y: number, z: number) => {
  const v = 43758.5453 * Math.sin(12.9898 * x + 78.233 * y + 37.719 * z);
  return v - Math.floor(v);
};

const hash1 = (x: number) => {
  const v = 43758.5453 * Math.sin(x);
  return v - Math.floor(v);
};

const normalize = (v: V3): V3 => {
  const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return l === 0 ? { x: 0, y: 0, z: 0 } : { x: v.x / l, y: v.y / l, z: v.z / l };
};

const spherical = (r: number, phi: number, theta: number): V3 => {
  const s = Math.sin(phi) * r;
  return { x: s * Math.sin(theta), y: Math.cos(phi) * r, z: s * Math.cos(theta) };
};

/**
 * Equirectangular uv of a point. The reference subtracts the point from the centre (centre − point),
 * i.e. it samples the antipode; the land mask is authored to match, so keep that orientation.
 */
const toUv = (p: V3, c: V3) => {
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  const dz = c.z - p.z;
  const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    u: 1 - (0.5 + Math.atan2(dz / l, dx / l) / (2 * Math.PI)),
    v: 0.5 + Math.asin(dy / l) / Math.PI,
  };
};

export function generateDots(p: DotGenerationParams): DotData {
  const {
    imageWidth,
    imageHeight,
    imageData,
    dotCount,
    radius,
    poissonJitter,
    dotSizeVariation,
    dotOpacityVariation,
  } = p;
  const positions: number[] = [];
  const rndIds: number[] = [];
  const sizeVariations: number[] = [];
  const opacityVariations: number[] = [];
  const coronaSeeds: number[] = [];
  const varianceRates: number[] = [];
  const varianceMotions: number[] = [];
  const coronaCanParticipate: number[] = [];
  const centre: V3 = { x: 0, y: 0, z: 0 };

  for (let i = dotCount - 1; i >= 0; i -= 1) {
    const phi = Math.acos(-1 + (2 * i) / dotCount);
    const theta = Math.sqrt(dotCount * Math.PI) * phi;
    let pos = spherical(radius, phi, theta);

    if (poissonJitter > 0) {
      const amount = 0.15 * poissonJitter;
      let jitter: V3 = {
        x: (hash3(pos.x, pos.y, pos.z) - 0.5) * 2,
        y: (hash3(pos.y, pos.z, pos.x) - 0.5) * 2,
        z: (hash3(pos.z, pos.x, pos.y) - 0.5) * 2,
      };
      const n = normalize(pos);
      const d = jitter.x * n.x + jitter.y * n.y + jitter.z * n.z;
      jitter = normalize({ x: jitter.x - n.x * d, y: jitter.y - n.y * d, z: jitter.z - n.z * d });
      const moved = normalize({
        x: pos.x + jitter.x * amount,
        y: pos.y + jitter.y * amount,
        z: pos.z + jitter.z * amount,
      });
      pos = { x: moved.x * radius, y: moved.y * radius, z: moved.z * radius };
    }

    const uv = toUv(pos, centre);
    const alpha =
      imageData[4 * Math.floor(uv.u * imageWidth) + 4 * imageWidth * Math.floor(uv.v * imageHeight) + 3];
    if (alpha > 0) {
      positions.push(pos.x, pos.y, pos.z);
      const r = Math.random();
      rndIds.push(r);
      sizeVariations.push(1 + (r - 0.5) * dotSizeVariation);
      opacityVariations.push(1 - hash3(100 * pos.x, 100 * pos.y, 100 * pos.z) * dotOpacityVariation);
      const seed = hash1(173.17 * r);
      coronaSeeds.push(seed);
      varianceRates.push(hash1((r + 0.31) * 97.13));
      varianceMotions.push(hash1((r + 0.73) * 57.77));
      coronaCanParticipate.push(seed < 0.25 ? 1 : 0);
    }
  }

  return {
    positions: new Float32Array(positions),
    rndIds: new Float32Array(rndIds),
    sizeVariations: new Float32Array(sizeVariations),
    opacityVariations: new Float32Array(opacityVariations),
    coronaSeeds: new Float32Array(coronaSeeds),
    varianceRates: new Float32Array(varianceRates),
    varianceMotions: new Float32Array(varianceMotions),
    coronaCanParticipate: new Float32Array(coronaCanParticipate),
  };
}

const DOT_DEFAULTS = { radius: 2, poissonJitter: 0.75, dotSizeVariation: 0.75, dotOpacityVariation: 0.3 };

/** Coarse-pointer touch device check used by the reference for dot count / camera distance. */
export const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;

let shared: Promise<DotData> | null = null;

/** Page-level cache (module 53366): the land mask is decoded and sampled once. */
export function loadSharedDots(): Promise<DotData> {
  if (shared) return shared;
  shared = new Promise<DotData>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      resolve(
        generateDots({
          imageWidth: data.width,
          imageHeight: data.height,
          imageData: data.data,
          dotCount: isTouchDevice() ? GLOBE.DOT_COUNT_MAX_MOBILE : GLOBE.DOT_COUNT_MAX_DESKTOP,
          ...DOT_DEFAULTS,
        }),
      );
    };
    img.onerror = () => reject(new Error("map_dots.png failed to load"));
    img.src = GLOBE.IMAGE_PATH;
  });
  return shared;
}
