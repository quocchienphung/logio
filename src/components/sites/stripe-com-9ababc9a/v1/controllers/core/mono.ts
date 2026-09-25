// Monochrome mapping for colours that come from JavaScript/GLSL (docs/research/MONOCHROME_SYSTEM.md).
// Same curve as scripts/forensics/products/mono.py / build_css.mjs, so a colour set in JS lands on the
// grey the CSS build gives the same hex: neutrals keep perceptual luminance, saturated colours use the
// designed hue → luminance keys.
const LIGHT_KEYS: [number, number][] = [
  [0, 0.54], [25, 0.63], [45, 0.72], [70, 0.78], [150, 0.76], [200, 0.82], [235, 0.72], [255, 0.4],
  [270, 0.26], [290, 0.28], [310, 0.34], [330, 0.42], [350, 0.5], [360, 0.54],
];

function interp(x: number, keys: [number, number][]): number {
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [x0, y0] = keys[i - 1];
      const [x1, y1] = keys[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return keys[keys.length - 1][1];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Grey value (0–1) for an sRGB colour given as 0–1 components. */
export function monoValue(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const c = mx - mn;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (c < 0.12) return lum;
  let h: number;
  if (mx === r) h = (((g - b) / c) % 6 + 6) % 6;
  else if (mx === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  h *= 60;
  const l = (mx + mn) / 2;
  const hv = interp(h, LIGHT_KEYS);
  const w = smooth(0.08, 0.55, c);
  const hue = Math.min(1, Math.max(0, l * (1 - w) + hv * (0.7 + 0.55 * l) * w));
  const t = smooth(0.12, 0.35, c);
  return lum * (1 - t) + hue * t;
}

/** Grey value for a colour given as a 0xRRGGBB number or a "#rgb"/"#rrggbb" string. */
export function monoOf(color: number | string): number {
  let n: number;
  if (typeof color === "number") n = color;
  else {
    let h = color.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    n = parseInt(h.slice(0, 6), 16);
    if (Number.isNaN(n)) return 0;
  }
  return monoValue(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
