// GLSL sources decoded from the frozen stripe.com hero renderer bundle (see
// docs/research/stripe-com-9ababc9a/root-8a5edab2/hero-renderer/README.md). Kept verbatim apart
// from the monochrome palette mapping below (STRIPE_MONO), which replaces the hue of the palette
// texture with a designed luminance so the ribbon renders as a black/grey/white material.

/** Hue (degrees) -> luminance keyframes. Each hue band of the reference palette gets its own grey value. */
type HueKey = [hue: number, value: number];
/** Hero, lit zone: the original light mapping (orange -> light/mid grey, violet -> charcoal). Used where
 *  the headline sits so the type keeps the backdrop it was designed against. */
const MONO_KEYS_LIT: HueKey[] = [
  [0, 0.54], [25, 0.63], [45, 0.72], [70, 0.78], [150, 0.76], [200, 0.82], [235, 0.72],
  [255, 0.40], [270, 0.26], [290, 0.28], [310, 0.34], [330, 0.42], [350, 0.50], [360, 0.54],
];
/** Hero, deep zone: the same hue ordering pushed toward black so the ribbon reads as a black -> grey
 *  material. Pale, low-chroma areas keep their own lightness (see monoValue), which preserves the white
 *  highlights along the folds. */
const MONO_KEYS_DEEP: HueKey[] = [
  [0, 0.30], [25, 0.40], [45, 0.52], [70, 0.60], [150, 0.56], [200, 0.64], [235, 0.46],
  [255, 0.17], [270, 0.06], [290, 0.08], [310, 0.14], [330, 0.20], [350, 0.25], [360, 0.30],
];
/** Developers (near-black section): same ordering, lifted so the line-work reads mid grey -> white on dark. */
const MONO_KEYS_DARK: HueKey[] = [
  [0, 0.72], [25, 0.82], [45, 0.92], [70, 0.96], [150, 0.90], [200, 0.94], [235, 0.86],
  [255, 0.55], [270, 0.40], [290, 0.46], [310, 0.58], [330, 0.68], [350, 0.70], [360, 0.72],
];

/** Emits `name(float h)` returning the designed grey for a hue, as a chain of clamped ramps. */
function hueRamp(name: string, keys: HueKey[]): string {
  const segs = keys
    .slice(1)
    .map(([h1, v1], i) => {
      const [h0, v0] = keys[i];
      return `  v += ${(v1 - v0).toFixed(4)} * clamp((h - ${h0.toFixed(1)}) / ${(h1 - h0).toFixed(1)}, 0.0, 1.0);`;
    })
    .join("\n");
  return `float ${name}(float h) {
  float v = ${keys[0][1].toFixed(4)};
${segs}
  return v;
}`;
}

/**
 * Builds the STRIPE_MONO chunk: monoValue(rgb, deep) returns a single grey level. Chroma decides how much
 * the hue band (vs. the source lightness) drives the value, so pale highlights stay light and saturated
 * bands take their designed grey; lightness still modulates within a band so folds keep their shading.
 * `deep` blends between the two key sets (0 = lit, 1 = deep) so one shader can carry both zones.
 */
function monoChunk(lit: HueKey[], deep?: HueKey[]): string {
  return `#ifndef STRIPE_MONO
#define STRIPE_MONO
${hueRamp("monoHueLit", lit)}
${hueRamp("monoHueDeep", deep ?? lit)}
float monoValue(vec3 rgb, float deep) {
  float mx = max(rgb.r, max(rgb.g, rgb.b));
  float mn = min(rgb.r, min(rgb.g, rgb.b));
  float c = mx - mn;
  float l = (mx + mn) * 0.5;
  float h = 0.0;
  if (c > 1e-5) {
    if (mx == rgb.r) h = mod((rgb.g - rgb.b) / c, 6.0);
    else if (mx == rgb.g) h = (rgb.b - rgb.r) / c + 2.0;
    else h = (rgb.r - rgb.g) / c + 4.0;
    h *= 60.0;
  }
  float band = mix(monoHueLit(h), monoHueDeep(h), deep) * (0.70 + 0.55 * l);
  float w = smoothstep(0.08, 0.55, c);
  return clamp(mix(l, band, w), 0.0, 1.0);
}
#endif
`;
}

export const WAVE_VERT = `attribute vec3 tangent;

uniform float u_time;
uniform float u_speed;
uniform vec2 u_resolution;

uniform float u_twistFrequencyX;
uniform float u_twistFrequencyY;
uniform float u_twistFrequencyZ;

uniform float u_twistPowerX;
uniform float u_twistPowerY;
uniform float u_twistPowerZ;

uniform float u_displaceFrequencyX;
uniform float u_displaceFrequencyZ;
uniform float u_displaceAmount;

varying float v_time;
varying float v_speed;
varying vec2 v_uv;
varying vec3 v_position;
varying vec4 v_clipPosition;
varying vec2 v_resolution;

// TODO(weston): glsl-loader.js is looking for paths relative to the shader source.
// We should update it to start from a configurable root location

// Stefan Gustavson's version;
// https://www.shadertoy.com/view/43tBDr
// https://www.researchgate.net/publication/216813608_Simplex_noise_demystified

// https://xxhash.com/
// https://github.com/Cyan4973/xxHash/blob/dev/LICENSE

#ifndef STRIPE_HASH
#define STRIPE_HASH
float xxhash(vec2 x) {
  uvec2 t = floatBitsToUint(x);
  uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h += 0xc2b2ae3du * t.y;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h ^= h >> 15u;
  h *= 0x85ebca77u;
  h ^= h >> 13u;
  h *= 0xc2b2ae3du;
  h ^= h >> 16u;
  return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}

vec2 hash(vec2 x) {
  float k = 6.283185307 * xxhash(x);
  return vec2(cos(k), sin(k));
}
#endif


#ifndef STRIPE_SIMPLEX_NOISE
#define STRIPE_SIMPLEX_NOISE
float simplexNoise(in vec2 p) {
  const float K1 = 0.366025404; // (sqrt(3)-1)/2;
  const float K2 = 0.211324865; // (3-sqrt(3))/6;

  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0))); // changed to h^3 [1]

  return dot(n, vec3(32.99)); // analytic factor (= 2916*sqrt(2)/125)
}
#endif

// Shaping functions by Inigo Quilez
// https://iquilezles.org/articles/functions/
// https://thebookofshaders.com/05/


// Taken from glm's math.h

#ifndef STRIPE_CONSTANTS
#define STRIPE_CONSTANTS

#define M_E         2.71828182845904523536028747135266250   /* e */
#define M_LOG2E     1.44269504088896340735992468100189214   /* log 2e */
#define M_LOG10E    0.434294481903251827651128918916605082  /* log 10e */
#define M_LN2       0.693147180559945309417232121458176568  /* log e2 */
#define M_LN10      2.30258509299404568401799145468436421   /* log e10 */
#define M_PI        3.14159265358979323846264338327950288   /* pi */
#define M_PI_2      1.57079632679489661923132169163975144   /* pi/2 */
#define M_PI_4      0.785398163397448309615660845819875721  /* pi/4 */
#define M_1_PI      0.318309886183790671537767526745028724  /* 1/pi */
#define M_2_PI      0.636619772367581343075535053490057448  /* 2/pi */
#define M_2_SQRTPI  1.12837916709551257389615890312154517   /* 2/sqrt(pi) */
#define M_SQRT2     1.41421356237309504880168872420969808   /* sqrt(2) */
#define M_SQRT1_2   0.707106781186547524400844362104849039  /* 1/sqrt(2) */

#endif


#ifndef STRIPE_SHAPING
#define STRIPE_SHAPING

float almostIdentity(float x, float n) {
  return sqrt(x * x + n * n);
}

float integralSmoothstep(float x, float T) {
  if(x > T)
    return x - T / 2.0;
  return x * x * x * (1.0 - x * 0.5 / T) / T / T;
}

// Impulses

float expImpulse(float x, float k) {
  float h = k * x;
  return h * exp(1.0 - h);
}

float quadImpulse(float k, float x) {
  return 2.0 * sqrt(k) * x / (1.0 + k * x * x);
}

float polyImpulse(float k, float n, float x) {
  return (n / (n - 1.0)) *
    pow((n - 1.0) * k, 1.0 / n) *
    x / (1.0 + k * pow(x, n));
}

float expSustainedImpulse(float x, float f, float k) {
  float s = max(x - f, 0.0);
  return min(x * x / (f * f), 1.0 + (2.0 / f) * s * exp(-k * s));
}

float sincImpulse(float x, float k) {
  float a = M_PI * (k * x - 1.0);
  return sin(a) / a;
}

// Falloff

float quadFallof(float x, float m) {
  x /= m;
  return (x - 2.0) * x + 1.0;
}

// Unitary

float almostUnitIdentity(float x) {
  return x * x * (2.0 - x);
}

float gain(float x, float k) {
  float a = 0.5 * pow(2.0 * ((x < 0.5) ? x : 1.0 - x), k);
  return (x < 0.5) ? a : 1.0 - a;
}

float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

float pcurve(float x, float a, float b) {
  float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}

float tone(float x, float k) {
  return (k + 1.0) / (1.0 + k * x);
}

// Pulse

float cubicPulse(float c, float w, float x) {
  x = abs(x - c);
  if(x > w)
    return 0.0;
  x /= w;
  return 1.0 - x * x * (3.0 - 2.0 * x);
}

float rationalBump(float x, float k) {
  return 1.0 / (1.0 + k * x * x);
}

float expStep(float x, float n) {
  return exp2(-exp2(n) * pow(x, n));
}

#endif

#ifndef STRIPE_UTILS
#define STRIPE_UTILS

float mapLinear(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0, 0.0, 0.0, 0.0, 1.0);
}

#endif


vec3 displace(vec2 uv, vec3 position, float time, float frequencyX, float frequencyY, float amount) {
  float noise = simplexNoise(vec2(position.x * frequencyX + time, position.z * frequencyY + time));
  float dist = mapLinear(uv.x, 0.0, 1.0, -1.0, 1.0);
  position.y += amount * noise;
  return position;
}

void main(void) {
  v_time = u_time;
  v_uv = uv;
  v_resolution = u_resolution;

  mat4 rotationA = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyY * expStep(v_uv.x, u_twistPowerY));
  mat4 rotationB = rotationMatrix(vec3(0.0, 0.5, 0.5), u_twistFrequencyX * expStep(v_uv.y, u_twistPowerX));
  mat4 rotationC = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyZ * expStep(v_uv.y, u_twistPowerZ));

  vec3 displacedPosition = displace(uv, position.xyz, u_time * u_speed, u_displaceFrequencyX, u_displaceFrequencyZ, u_displaceAmount);

  v_position = displacedPosition;
  v_position = (vec4(v_position, 1.0) * rotationA).xyz;
  v_position = (vec4(v_position, 1.0) * rotationB).xyz;
  v_position = (vec4(v_position, 1.0) * rotationC).xyz;

  v_clipPosition = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
  vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
  gl_Position = v_clipPosition;
}
`;

export const WAVE_LIGHT_FRAG = `precision highp float;

varying float v_time;
varying vec2 v_uv;
varying vec3 v_position;
varying vec4 v_clipPosition;
varying vec2 v_resolution;

uniform vec2 u_mousePosition;

uniform sampler2D u_paletteTexture;
uniform sampler2D u_lutTexture;
uniform sampler2D u_blueNoiseTexture;

uniform float u_colorSaturation;
uniform float u_colorContrast;
uniform float u_colorHueShift;
// Monochrome output range (lo, hi): the hero uses (0,1); the issuing card compresses to charcoal..silver.
uniform vec2 u_monoRange;
// Tone curve applied to the monochrome value: >1 deepens the mid/shadow range while leaving the
// specular highlights at 1.0, so the ribbon gets black anchors without losing its light edges.
uniform float u_monoGamma;
// How far the deep (black-anchored) mapping is pushed: 0 = the lit mapping everywhere.
uniform float u_monoDeep;
// Screen-space zone that stays lit, in canvas UV with y measured from the top: xy = centre,
// zw = half size of the fully-lit core. The headline is composited over the ribbon with a
// multiplying blend, so this keeps a legible backdrop under the type.
uniform vec4 u_monoLit;
// Falloff (canvas UV) around that core; the whole hero would go black without it.
uniform vec2 u_monoLitFeather;
uniform vec2 u_canvasSize;

uniform float u_lineAmount;
uniform float u_lineThickness;
uniform float u_lineDerivativePower;

uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;

uniform vec3 u_clearColor;

#ifdef USE_NOISE_BANDS
const int MAX_NOISE_BANDS = 2;
uniform int u_numNoiseBands;
uniform vec4 u_noiseBandBounds[2];
uniform vec4 u_noiseBandParams[2];
uniform float u_noiseBandParabolaPower[2];
#endif

// TODO(weston): glsl-loader.js is looking for paths relative to the shader source.
// We should update it to start from a configurable root location

// Stefan Gustavson's version;
// https://www.shadertoy.com/view/43tBDr
// https://www.researchgate.net/publication/216813608_Simplex_noise_demystified

// https://xxhash.com/
// https://github.com/Cyan4973/xxHash/blob/dev/LICENSE

#ifndef STRIPE_HASH
#define STRIPE_HASH
float xxhash(vec2 x) {
  uvec2 t = floatBitsToUint(x);
  uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h += 0xc2b2ae3du * t.y;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h ^= h >> 15u;
  h *= 0x85ebca77u;
  h ^= h >> 13u;
  h *= 0xc2b2ae3du;
  h ^= h >> 16u;
  return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}

vec2 hash(vec2 x) {
  float k = 6.283185307 * xxhash(x);
  return vec2(cos(k), sin(k));
}
#endif


#ifndef STRIPE_SIMPLEX_NOISE
#define STRIPE_SIMPLEX_NOISE
float simplexNoise(in vec2 p) {
  const float K1 = 0.366025404; // (sqrt(3)-1)/2;
  const float K2 = 0.211324865; // (3-sqrt(3))/6;

  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0))); // changed to h^3 [1]

  return dot(n, vec3(32.99)); // analytic factor (= 2916*sqrt(2)/125)
}
#endif

// Shaping functions by Inigo Quilez
// https://iquilezles.org/articles/functions/
// https://thebookofshaders.com/05/


// Taken from glm's math.h

#ifndef STRIPE_CONSTANTS
#define STRIPE_CONSTANTS

#define M_E         2.71828182845904523536028747135266250   /* e */
#define M_LOG2E     1.44269504088896340735992468100189214   /* log 2e */
#define M_LOG10E    0.434294481903251827651128918916605082  /* log 10e */
#define M_LN2       0.693147180559945309417232121458176568  /* log e2 */
#define M_LN10      2.30258509299404568401799145468436421   /* log e10 */
#define M_PI        3.14159265358979323846264338327950288   /* pi */
#define M_PI_2      1.57079632679489661923132169163975144   /* pi/2 */
#define M_PI_4      0.785398163397448309615660845819875721  /* pi/4 */
#define M_1_PI      0.318309886183790671537767526745028724  /* 1/pi */
#define M_2_PI      0.636619772367581343075535053490057448  /* 2/pi */
#define M_2_SQRTPI  1.12837916709551257389615890312154517   /* 2/sqrt(pi) */
#define M_SQRT2     1.41421356237309504880168872420969808   /* sqrt(2) */
#define M_SQRT1_2   0.707106781186547524400844362104849039  /* 1/sqrt(2) */

#endif


#ifndef STRIPE_SHAPING
#define STRIPE_SHAPING

float almostIdentity(float x, float n) {
  return sqrt(x * x + n * n);
}

float integralSmoothstep(float x, float T) {
  if(x > T)
    return x - T / 2.0;
  return x * x * x * (1.0 - x * 0.5 / T) / T / T;
}

// Impulses

float expImpulse(float x, float k) {
  float h = k * x;
  return h * exp(1.0 - h);
}

float quadImpulse(float k, float x) {
  return 2.0 * sqrt(k) * x / (1.0 + k * x * x);
}

float polyImpulse(float k, float n, float x) {
  return (n / (n - 1.0)) *
    pow((n - 1.0) * k, 1.0 / n) *
    x / (1.0 + k * pow(x, n));
}

float expSustainedImpulse(float x, float f, float k) {
  float s = max(x - f, 0.0);
  return min(x * x / (f * f), 1.0 + (2.0 / f) * s * exp(-k * s));
}

float sincImpulse(float x, float k) {
  float a = M_PI * (k * x - 1.0);
  return sin(a) / a;
}

// Falloff

float quadFallof(float x, float m) {
  x /= m;
  return (x - 2.0) * x + 1.0;
}

// Unitary

float almostUnitIdentity(float x) {
  return x * x * (2.0 - x);
}

float gain(float x, float k) {
  float a = 0.5 * pow(2.0 * ((x < 0.5) ? x : 1.0 - x), k);
  return (x < 0.5) ? a : 1.0 - a;
}

float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

float pcurve(float x, float a, float b) {
  float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}

float tone(float x, float k) {
  return (k + 1.0) / (1.0 + k * x);
}

// Pulse

float cubicPulse(float c, float w, float x) {
  x = abs(x - c);
  if(x > w)
    return 0.0;
  x /= w;
  return 1.0 - x * x * (3.0 - 2.0 * x);
}

float rationalBump(float x, float k) {
  return 1.0 / (1.0 + k * x * x);
}

float expStep(float x, float n) {
  return exp2(-exp2(n) * pow(x, n));
}

#endif

#ifndef STRIPE_COLOR
#define STRIPE_COLOR

vec3 contrast(in vec3 v, in float a) {
  return (v - 0.5) * a + 0.5;
}

vec3 desaturate(vec3 color, float factor) {
  // generic, rgb values are arbitrary
  vec3 lum = vec3(0.299, 0.587, 0.114);
  vec3 gray = vec3(dot(lum, color));
  return mix(color, gray, factor);
}

// https://godotshaders.com/shader/hue-shift/
// CC0 license, https://creativecommons.org/publicdomain/zero/1.0/
vec3 hueShift(vec3 color, float shift) {
  vec3 gray = vec3(0.57735);
  vec3 projection = gray * dot(gray, color);
  vec3 U = color - projection;
  vec3 V = cross(gray, U);
  vec3 shifted = U * cos(shift) + V * sin(shift) + projection;
  return shifted;
}

// By Inigo Quilez, under MIT license
// https://www.shadertoy.com/view/ttcyRS
vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
  const mat3 kCONEtoLMS = mat3(0.4121656120, 0.2118591070, 0.0883097947, 0.5362752080, 0.6807189584, 0.2818474174, 0.0514575653, 0.1074065790, 0.6302613616);
  const mat3 kLMStoCONE = mat3(4.0767245293, -1.2681437731, -0.0041119885, -3.3072168827, 2.6093323231, -0.7034763098, 0.2307590544, -0.3411344290, 1.7068625689);
  vec3 lms1 = pow(kCONEtoLMS * lin1, vec3(1.0 / 3.0));
  vec3 lms2 = pow(kCONEtoLMS * lin2, vec3(1.0 / 3.0));
  vec3 lms = mix(lms1, lms2, a);
  lms *= 1.0 + 0.2 * a * (1.0 - a);
  return kLMStoCONE * (lms * lms * lms);
}

#endif

#ifndef STRIPE_UTILS
#define STRIPE_UTILS

float mapLinear(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0, 0.0, 0.0, 0.0, 1.0);
}

#endif


${monoChunk(MONO_KEYS_LIT, MONO_KEYS_DEEP)}
/** 1 inside the lit zone, 0 well outside it, smooth in between (rounded box in canvas UV). */
float monoLitAmount() {
  vec2 cuv = gl_FragCoord.xy / max(u_canvasSize, vec2(1.0));
  vec2 p = vec2(cuv.x, 1.0 - cuv.y);
  vec2 d = max(abs(p - u_monoLit.xy) - u_monoLit.zw, 0.0) / max(u_monoLitFeather, vec2(1e-4));
  return 1.0 - smoothstep(0.0, 1.0, length(d));
}

vec3 surfaceColor(vec2 uv, vec3 pos, float pdy, float deep) {
  // Monochrome: the palette hue picks a grey level (MONO_KEYS_LIT / MONO_KEYS_DEEP), folds keep shading.
  vec3 color = vec3(monoValue(texture2D(u_paletteTexture, vec2(uv.x, uv.y)).rgb, deep));

  float strength = 0.2;
  float freq = 600.0;
  float colorAtten = 0.9;
  float paraPow = 3.0;

  #ifdef USE_NOISE_BANDS
  for (int i = 0; i < MAX_NOISE_BANDS; i++) {
    if (i >= u_numNoiseBands) break;
    vec4 bounds = u_noiseBandBounds[i];
    vec4 nbp = u_noiseBandParams[i];
    float feather = nbp.x;
    float left = smoothstep(bounds.x - feather, bounds.x, uv.x);
    float right = 1.0 - smoothstep(bounds.y, bounds.y + feather, uv.x);
    float bottom = smoothstep(bounds.z - feather, bounds.z, uv.y);
    float top = 1.0 - smoothstep(bounds.w, bounds.w + feather, uv.y);
    float blend = left * right * bottom * top;
    strength = mix(strength, nbp.y, blend);
    freq = mix(freq, nbp.z, blend);
    colorAtten = mix(colorAtten, nbp.w, blend);
    paraPow = mix(paraPow, u_noiseBandParabolaPower[i], blend);
  }
  #endif

  float p = 1.0 - parabola(uv.x, paraPow);
  float n0 = simplexNoise(vec2(v_uv.x * 0.1, v_uv.y * 0.5));
  float n1 = simplexNoise(vec2(v_uv.x * (freq + (freq * 0.5 * n0)), v_uv.y * 4.0 * n0));
  n1 = mapLinear(n1, -1.0, 1.0, 0.0, 1.0);

  vec3 textureColor = color;
  textureColor += (n1 * strength * (1.0 - textureColor.b * colorAtten) * pdy * p);

  color = textureColor;
  return color;
}

void main(void) {
  vec2 st = gl_FragCoord.xy / v_resolution.xy;

  vec2 dy = dFdy(v_uv);
  float pdy = dy.y * v_resolution.y * u_glowAmount;
  pdy = mapLinear(pdy, -1.0, 1.0, 0.0, 1.0);
  pdy = clamp(pdy, 0.0, 1.0);
  pdy = pow(pdy, u_glowPower);
  pdy = smoothstep(0.0, u_glowRamp, pdy);
  pdy = clamp(pdy, 0.0, 1.0);

  // Deep everywhere except the lit zone behind the headline, so the type keeps its backdrop.
  float deep = u_monoDeep * (1.0 - monoLitAmount());
  vec4 color = vec4(surfaceColor(v_uv, v_position, pdy, deep), 1.0);

  color.rgb = contrast(color.rgb, u_colorContrast);
  color.rgb = desaturate(color.rgb, 1.0 - u_colorSaturation);
  color.rgb = hueShift(color.rgb, u_colorHueShift);

  color += (1.0 - pdy) * 0.25;
  color.rgb = pow(clamp(color.rgb, 0.0, 1.0), vec3(mix(1.0, u_monoGamma, deep)));
  color.rgb = mix(vec3(u_monoRange.x), vec3(u_monoRange.y), clamp(color.rgb, 0.0, 1.0));
  // The mesh blends src*src on screen; sqrt so the designed grey levels land on the page as authored.
  color.rgb = sqrt(clamp(color.rgb, 0.0, 1.0));
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`;

export const WAVE_DARK_FRAG = `precision highp float;

varying float v_time;
varying vec2 v_uv;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_position;
varying vec4 v_clipPosition;
varying vec2 v_resolution;

uniform vec2 u_mousePosition;
uniform vec3 u_clearColor;

uniform sampler2D u_paletteTexture;
uniform sampler2D u_lutTexture;
uniform sampler2D u_blueNoiseTexture;

uniform float u_colorSaturation;
uniform float u_colorContrast;
uniform float u_colorHueShift;

uniform float u_lineAmount;
uniform float u_lineThickness;
uniform float u_lineDerivativePower;

uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;

uniform float u_maxWidth;

// TODO(weston): glsl-loader.js is looking for paths relative to the shader source.
// We should update it to start from a configurable root location

// Stefan Gustavson's version;
// https://www.shadertoy.com/view/43tBDr
// https://www.researchgate.net/publication/216813608_Simplex_noise_demystified

// https://xxhash.com/
// https://github.com/Cyan4973/xxHash/blob/dev/LICENSE

#ifndef STRIPE_HASH
#define STRIPE_HASH
float xxhash(vec2 x) {
  uvec2 t = floatBitsToUint(x);
  uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h += 0xc2b2ae3du * t.y;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h ^= h >> 15u;
  h *= 0x85ebca77u;
  h ^= h >> 13u;
  h *= 0xc2b2ae3du;
  h ^= h >> 16u;
  return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}

vec2 hash(vec2 x) {
  float k = 6.283185307 * xxhash(x);
  return vec2(cos(k), sin(k));
}
#endif


#ifndef STRIPE_SIMPLEX_NOISE
#define STRIPE_SIMPLEX_NOISE
float simplexNoise(in vec2 p) {
  const float K1 = 0.366025404; // (sqrt(3)-1)/2;
  const float K2 = 0.211324865; // (3-sqrt(3))/6;

  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0))); // changed to h^3 [1]

  return dot(n, vec3(32.99)); // analytic factor (= 2916*sqrt(2)/125)
}
#endif

// Shaping functions by Inigo Quilez
// https://iquilezles.org/articles/functions/
// https://thebookofshaders.com/05/


// Taken from glm's math.h

#ifndef STRIPE_CONSTANTS
#define STRIPE_CONSTANTS

#define M_E         2.71828182845904523536028747135266250   /* e */
#define M_LOG2E     1.44269504088896340735992468100189214   /* log 2e */
#define M_LOG10E    0.434294481903251827651128918916605082  /* log 10e */
#define M_LN2       0.693147180559945309417232121458176568  /* log e2 */
#define M_LN10      2.30258509299404568401799145468436421   /* log e10 */
#define M_PI        3.14159265358979323846264338327950288   /* pi */
#define M_PI_2      1.57079632679489661923132169163975144   /* pi/2 */
#define M_PI_4      0.785398163397448309615660845819875721  /* pi/4 */
#define M_1_PI      0.318309886183790671537767526745028724  /* 1/pi */
#define M_2_PI      0.636619772367581343075535053490057448  /* 2/pi */
#define M_2_SQRTPI  1.12837916709551257389615890312154517   /* 2/sqrt(pi) */
#define M_SQRT2     1.41421356237309504880168872420969808   /* sqrt(2) */
#define M_SQRT1_2   0.707106781186547524400844362104849039  /* 1/sqrt(2) */

#endif


#ifndef STRIPE_SHAPING
#define STRIPE_SHAPING

float almostIdentity(float x, float n) {
  return sqrt(x * x + n * n);
}

float integralSmoothstep(float x, float T) {
  if(x > T)
    return x - T / 2.0;
  return x * x * x * (1.0 - x * 0.5 / T) / T / T;
}

// Impulses

float expImpulse(float x, float k) {
  float h = k * x;
  return h * exp(1.0 - h);
}

float quadImpulse(float k, float x) {
  return 2.0 * sqrt(k) * x / (1.0 + k * x * x);
}

float polyImpulse(float k, float n, float x) {
  return (n / (n - 1.0)) *
    pow((n - 1.0) * k, 1.0 / n) *
    x / (1.0 + k * pow(x, n));
}

float expSustainedImpulse(float x, float f, float k) {
  float s = max(x - f, 0.0);
  return min(x * x / (f * f), 1.0 + (2.0 / f) * s * exp(-k * s));
}

float sincImpulse(float x, float k) {
  float a = M_PI * (k * x - 1.0);
  return sin(a) / a;
}

// Falloff

float quadFallof(float x, float m) {
  x /= m;
  return (x - 2.0) * x + 1.0;
}

// Unitary

float almostUnitIdentity(float x) {
  return x * x * (2.0 - x);
}

float gain(float x, float k) {
  float a = 0.5 * pow(2.0 * ((x < 0.5) ? x : 1.0 - x), k);
  return (x < 0.5) ? a : 1.0 - a;
}

float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

float pcurve(float x, float a, float b) {
  float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
  return k * pow(x, a) * pow(1.0 - x, b);
}

float tone(float x, float k) {
  return (k + 1.0) / (1.0 + k * x);
}

// Pulse

float cubicPulse(float c, float w, float x) {
  x = abs(x - c);
  if(x > w)
    return 0.0;
  x /= w;
  return 1.0 - x * x * (3.0 - 2.0 * x);
}

float rationalBump(float x, float k) {
  return 1.0 / (1.0 + k * x * x);
}

float expStep(float x, float n) {
  return exp2(-exp2(n) * pow(x, n));
}

#endif

#ifndef STRIPE_COLOR
#define STRIPE_COLOR

vec3 contrast(in vec3 v, in float a) {
  return (v - 0.5) * a + 0.5;
}

vec3 desaturate(vec3 color, float factor) {
  // generic, rgb values are arbitrary
  vec3 lum = vec3(0.299, 0.587, 0.114);
  vec3 gray = vec3(dot(lum, color));
  return mix(color, gray, factor);
}

// https://godotshaders.com/shader/hue-shift/
// CC0 license, https://creativecommons.org/publicdomain/zero/1.0/
vec3 hueShift(vec3 color, float shift) {
  vec3 gray = vec3(0.57735);
  vec3 projection = gray * dot(gray, color);
  vec3 U = color - projection;
  vec3 V = cross(gray, U);
  vec3 shifted = U * cos(shift) + V * sin(shift) + projection;
  return shifted;
}

// By Inigo Quilez, under MIT license
// https://www.shadertoy.com/view/ttcyRS
vec3 oklab_mix(vec3 lin1, vec3 lin2, float a) {
  const mat3 kCONEtoLMS = mat3(0.4121656120, 0.2118591070, 0.0883097947, 0.5362752080, 0.6807189584, 0.2818474174, 0.0514575653, 0.1074065790, 0.6302613616);
  const mat3 kLMStoCONE = mat3(4.0767245293, -1.2681437731, -0.0041119885, -3.3072168827, 2.6093323231, -0.7034763098, 0.2307590544, -0.3411344290, 1.7068625689);
  vec3 lms1 = pow(kCONEtoLMS * lin1, vec3(1.0 / 3.0));
  vec3 lms2 = pow(kCONEtoLMS * lin2, vec3(1.0 / 3.0));
  vec3 lms = mix(lms1, lms2, a);
  lms *= 1.0 + 0.2 * a * (1.0 - a);
  return kLMStoCONE * (lms * lms * lms);
}

#endif


${monoChunk(MONO_KEYS_DARK)}
void main(void) {
  vec2 st = gl_FragCoord.xy / v_resolution.xy;

  vec2 dx = dFdx(v_uv);
  vec2 dy = dFdy(v_uv);

  // TODO(weston): implement hover effect
  // float mouseDistance = distance(st, u_mousePosition);
  vec4 color = texture2D(u_paletteTexture, vec2(v_uv.x, v_uv.y));
  // Monochrome: the palette hue picks a grey level (see MONO_KEYS_DARK) for the line-work.
  color.rgb = vec3(monoValue(color.rgb, 0.0));

  color.rgb = contrast(color.rgb, u_colorContrast);
  color.rgb = desaturate(color.rgb, 1.0 - u_colorSaturation);
  color.rgb = hueShift(color.rgb, u_colorHueShift);

  float lineThickness = u_lineThickness * pow(abs(dy.s * u_maxWidth), u_lineDerivativePower);
  float a = abs(sin(v_uv.x * u_lineAmount));
  a = smoothstep(lineThickness, 0.0, a);

  float depthFade = clamp(0.0, 1.0, v_clipPosition.z * 6.0);
  color.rgb = mix(u_clearColor, color.rgb, a * (1.0 - depthFade));
  gl_FragColor = color;
}
`;

export const POST_VERT = `varying vec2 v_uv;

void main() {
  v_uv = uv;

  // Normal projection sequence for reference
  // vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  // vec4 viewPosition = viewMatrix * modelPosition;
  // vec4 projectedPosition = projectionMatrix * viewPosition;

  vec4 projectedPosition = vec4(position, 1.0);
  gl_Position = projectedPosition;
}
`;

export const POST_FRAG = `uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform sampler2D u_derivative;
uniform float u_blurAmount;
uniform int u_blurSamples;
uniform float u_diffuseBlur;
uniform float u_grainAmount;
uniform float u_opaque;
uniform vec2 u_resolution;
uniform vec3 u_clearColor;
// Fraction of the canvas height that is the extended lower tail (0 = reference behaviour).
uniform float u_tailFraction;
varying vec2 v_uv;

// TODO(weston): glsl-loader.js is looking for paths relative to the shader source.
// We should update it to start from a configurable root location

// The origin of these popular glsl functions is a mystery, but it seems they
// were likely derived from a paper titled "On generating random numbers, with
// help of y=[(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of
// Statisticians and the 7th Vilnius Conference on Probability Theory and
// Mathematical Statistics, August 1998.

// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner

#ifndef STRIPE_RANDOM
#define STRIPE_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
#endif


#ifndef STRIPE_GRAIN
#define STRIPE_GRAIN
vec3 grain(vec3 color, float amount) {
  float grid_position = random(gl_FragCoord.xy * 0.01);
  vec3 dither_shift_RGB = vec3(4.0 / 255.0, 4.0 / 255.0, 4.0 / 255.0);
  dither_shift_RGB = mix(amount * dither_shift_RGB, -amount * dither_shift_RGB, grid_position);
  return color + dither_shift_RGB;
}
#endif

#ifndef STRIPE_BLUR_ANGULAR
#define STRIPE_BLUR_ANGULAR

// Rotational blur about the centre of the reference region. tail is the fraction of the canvas
// height that extends below that region; the rotation is evaluated in reference uv space so the
// samples are identical to an un-extended canvas.
vec4 blurAngular(sampler2D tex, vec2 uv, float angle, int samples, float tail) {
  vec4 total = vec4(0);
  float refScale = max(1.0 - tail, 0.0001);
  vec2 coord = vec2(uv.x, (uv.y - tail) / refScale) - 0.5;

  float dist = 1.0 / float(samples);
  vec2 dir = vec2(cos(angle * dist), sin(angle * dist));
  mat2 rot = mat2(dir.xy, -dir.y, dir.x);
  
  for(int i = 0; i < samples; i += 1) {
    vec2 refUv = coord + 0.5;
    vec4 color = texture(tex, vec2(refUv.x, refUv.y * refScale + tail));
    total += color;
    coord *= rot;
  }

  return total * dist;
}

#endif

// The origin of these popular glsl functions is a mystery, but it seems they
// were likely derived from a paper titled "On generating random numbers, with
// help of y=[(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of
// Statisticians and the 7th Vilnius Conference on Probability Theory and
// Mathematical Statistics, August 1998.

// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner

#ifndef STRIPE_RANDOM
#define STRIPE_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
#endif


// Noise-based blur function from NouveauBloomWave
// Creates dramatic Gaussian-style blur with random sampling
vec4 noiseBlur(sampler2D tex, vec2 st, vec2 texel, float radius) {
  vec4 total = vec4(0.0);
  float totalWeight = 0.0;
  
  // Take 16 random samples in a circular pattern
  for(int i = 0; i < 16; i++) {
    // Generate pseudo-random angle and distance
    float angle = random(st + float(i) * 0.1) * 6.28318530718; // 2*PI
    float distance = random(st + float(i) * 0.2);
    
    // Calculate sample offset in a circle
    vec2 offset = vec2(cos(angle), sin(angle)) * distance * radius * texel;
    
    // Sample the texture
    vec4 sampleColor = texture2D(tex, st + offset);
    
    // Weight samples by distance (closer = more weight)
    float weight = 1.0 - distance;
    total += sampleColor * weight;
    totalWeight += weight;
  }
  
  return total / totalWeight;
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 st = gl_FragCoord.xy * texel;

  vec4 sceneColor = texture2D(u_scene, v_uv);
  vec4 blurColor = blurAngular(u_scene, v_uv, u_blurAmount, u_blurSamples, u_tailFraction);
  // Evaluate the blur ramp in the reference (un-extended) canvas space so the upper ribbon is unchanged;
  // the tail below it keeps the same blur as the reference bottom edge.
  float refY = (v_uv.y - u_tailFraction) / max(1.0 - u_tailFraction, 0.0001);
  float blurPower = smoothstep(0.0, 0.7, refY) - smoothstep(0.2, 1.0, refY);

  vec4 finalColor = mix(blurColor, sceneColor, blurPower);
  
  // Apply diffuse blur effect (dramatic gaussian-style blur)
  // Implementation from NouveauBloomWave
  if (u_diffuseBlur > 0.0) {
    // Scale the blur radius dramatically - multiply by 100 for visible effect
    float blurRadius = u_diffuseBlur * 100.0;
    vec4 diffuseBlurred = noiseBlur(u_scene, st, texel, blurRadius);
    // Mix between current result and heavily blurred version
    finalColor = mix(finalColor, diffuseBlurred, min(u_diffuseBlur * 2.0, 1.0));
  }
  
  finalColor.rgb = grain(finalColor.rgb, u_grainAmount);

  float alpha = mix(finalColor.a, 1.0, u_opaque);
  gl_FragColor = vec4(min(finalColor.rgb, 1.0), alpha);
}
`;
