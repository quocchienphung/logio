attribute vec3 tangent;

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
