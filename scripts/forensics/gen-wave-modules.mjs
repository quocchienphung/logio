// Generate src/components/stripe/Hero/wave/{shaders,config}.ts from the decoded renderer research.
import fs from "node:fs";

const R = "docs/research/stripe-com-9ababc9a/root-8a5edab2/hero-renderer";
const OUT = "src/components/stripe/Hero/wave";
fs.mkdirSync(OUT, { recursive: true });

const rd = (f) => fs.readFileSync(`${R}/${f}`, "utf8").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const shaders = `// GLSL sources decoded from the frozen stripe.com hero renderer bundle (see
// docs/research/stripe-com-9ababc9a/root-8a5edab2/hero-renderer/README.md). Kept verbatim.
export const WAVE_VERT = \`${rd("wave.vert")}\`;

export const WAVE_LIGHT_FRAG = \`${rd("wave-light.frag")}\`;

export const WAVE_DARK_FRAG = \`${rd("wave-dark.frag")}\`;

export const POST_VERT = \`${rd("post.vert")}\`;

export const POST_FRAG = \`${rd("post.frag")}\`;
`;
fs.writeFileSync(`${OUT}/shaders.ts`, shaders);

const c = JSON.parse(fs.readFileSync(`${R}/configs.json`, "utf8"));
const pick = (k) => {
  const m = { ...c[k].materialProps };
  delete m.lights;
  return m;
};
const fmt = (o) => JSON.stringify(o, null, 2).replace(/\n/g, "\n  ").replace(/"([a-zA-Z]+)":/g, "$1:");
const pp = c.heroDesktop.guiState.folders["Post Processing"].controllers;
const cam = c.heroDesktop.camState;
const cfg = `// Renderer configuration decoded from the frozen stripe.com bundle (module 89224: gj/P1/y7 exports).
// Breakpoints: mobile <=639, tablet 640..1263, desktop >=1264.
export interface WaveMaterialProps {
  speed: number;
  timeOffset: number;
  colorContrast: number;
  colorSaturation: number;
  colorHueShift: number;
  displaceFrequencyX: number;
  displaceFrequencyZ: number;
  displaceAmount: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  twistFrequencyX: number;
  twistFrequencyY: number;
  twistFrequencyZ: number;
  twistPowerX: number;
  twistPowerY: number;
  twistPowerZ: number;
  glowRamp: number;
  glowAmount: number;
  glowPower: number;
  lineThickness: number;
  lineAmount: number;
  lineDerivativePower: number;
}

export interface WaveConfig {
  materialProps: WaveMaterialProps;
  post: { blurAmount: number; grainAmount: number };
  camera: { position: [number, number, number]; zoom: number };
}

const CAMERA: WaveConfig["camera"] = { position: [${cam.position.x}, ${cam.position.y}, ${cam.position.z}], zoom: ${cam.zoom} };
const POST = { blurAmount: ${pp.blurAmount}, grainAmount: ${pp.grainAmount} };

export const WAVE_DESKTOP: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: ${fmt(pick("heroDesktop"))},
};
export const WAVE_TABLET: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: ${fmt(pick("heroTablet"))},
};
export const WAVE_MOBILE: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: ${fmt(pick("heroMobile"))},
};
/** Developers section (dark theme, no post-processing). */
export const WAVE_DEVELOPER: WaveConfig = {
  camera: CAMERA,
  post: { blurAmount: ${c.developer.guiState.folders["Post Processing"].controllers.blurAmount}, grainAmount: ${c.developer.guiState.folders["Post Processing"].controllers.grainAmount} },
  materialProps: ${fmt(pick("developer"))},
};
`;
fs.writeFileSync(`${OUT}/config.ts`, cfg);
console.log("ok");

// ---- Issuing card (shaders decoded by extract-shader-modules.mjs, config "issuing") ----
const D = "docs/research/stripe-live/shaders";
const rdf = (f) => fs.readFileSync(f, "utf8").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const IOUT = "src/components/stripe/Solutions/graphics/issuing";
fs.mkdirSync(IOUT, { recursive: true });
fs.writeFileSync(
  `${IOUT}/shaders.ts`,
  `// GLSL decoded from the frozen stripe.com bundle (index chunk modules 4732/82273/84113/50800) — issuing card.
export const CARD_VERT = \`${rdf(D + "/4732.glsl")}\`;

export const CARD_FRAG = \`${rdf(D + "/82273.glsl")}\`;

export const ISSUING_POST_VERT = \`${rdf(D + "/84113.glsl")}\`;

export const ISSUING_POST_FRAG = \`${rdf(D + "/50800.glsl")}\`;
`,
);
const ic = c.issuing;
const im = { ...ic.materialProps };
delete im.lights;
fs.writeFileSync(
  `${IOUT}/config.ts`,
  `// Issuing card wave configuration decoded from the frozen bundle (configs.json "issuing").
import type { WaveConfig } from "@/components/stripe/Hero/wave/config";

export const ISSUING_WAVE: WaveConfig = {
  camera: { position: [${ic.camState.position.x}, ${ic.camState.position.y}, ${ic.camState.position.z}], zoom: ${ic.camState.zoom} },
  post: { blurAmount: ${ic.guiState.folders["Post Processing"].controllers.blurAmount}, grainAmount: ${ic.guiState.folders["Post Processing"].controllers.grainAmount} },
  materialProps: ${fmt(im)},
};
`,
);
console.log("issuing ok");

// ---- Agentic particles (shaders decoded from index chunk modules 73316/79656) ----
const AOUT = "src/components/stripe/Solutions/graphics/agentic";
fs.mkdirSync(AOUT, { recursive: true });
fs.writeFileSync(
  `${AOUT}/shaders.ts`,
  `// GLSL decoded from the frozen stripe.com bundle (index chunk modules 73316/79656) — agentic particles.
export const POINTS_VERT = \`${rdf(D + "/73316.glsl")}\`;

export const POINTS_FRAG = \`${rdf(D + "/79656.glsl")}\`;
`,
);
console.log("agentic ok");
