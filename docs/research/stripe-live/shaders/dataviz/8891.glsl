uniform float size;
uniform float time;
uniform float shimmerSpeed;
uniform float noiseStrength;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float animValue;
uniform vec3 origin;
uniform vec2 resolution;

attribute float distance;
attribute float lineId;
attribute vec3 positionStart;
attribute vec3 positionMid;

varying float vOpacity;
varying float vDistance;
varying vec3 vWorldPosition;
varying float vScreenY;
varying float vNoiseFactor;
varying float vAnimValue;
varying vec2 vResolution;

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


#ifndef STRIPE_MATH_LINEAR
#define STRIPE_MATH_LINEAR
float linear(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}
#endif

#ifndef STRIPE_MATH_MAP
#define STRIPE_MATH_MAP
float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}
#endif

#ifndef STRIPE_MATH_ROTATION_3D
#define STRIPE_MATH_ROTATION_3D
mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0, 0.0, 0.0, 0.0, 1.0);
}
#endif

#ifndef STRIPE_MATH_ROTATE_VEC3
#define STRIPE_MATH_ROTATE_VEC3
vec3 rotate(vec3 v, vec3 axis, float angle) {
  return (rotation3d(axis, angle) * vec4(v, 1.0)).xyz;
}
#endif

#ifndef STRIPE_MATH_POINT_TO_RAY_DIST
#define STRIPE_MATH_POINT_TO_RAY_DIST
float pointToRayDistance(vec3 pointM, vec3 rayOriginP, vec3 rayDirectionV, inout vec3 mouseDir) {
  vec3 pm_vector = pointM - rayOriginP;
  vec3 cross_product = cross(pm_vector, rayDirectionV);
  float distance = length(cross_product) / length(rayDirectionV);
  mouseDir = normalize(cross_product);
  return distance;
}
#endif


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


#ifndef STRIPE_EASING
#define STRIPE_EASING
float sineIn(float t) {
  return sin((t - 1.0) * M_PI_2) + 1.0;
}

float sineOut(float t) {
  return sin(t * M_PI_2);
}

float sineInOut(float t) {
  return -0.5 * (cos(M_PI * t) - 1.0);
}

float expoIn(float t) {
  return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
}

float expoOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

float expoInOut(float t) {
  return t == 0.0 || t == 1.0 ? t : t < 0.5 ? +0.5 * pow(2.0, (20.0 * t) - 10.0) : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float cubicIn(float t) {
  return t * t * t;
}

float cubicOut(float t) {
  float f = t - 1.0;
  return f * f * f + 1.0;
}

float cubicInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

float quadraticIn(float t) {
  return t * t;
}

float quadraticOut(float t) {
  return -t * (t - 2.0);
}

float quadraticInOut(float t) {
  float p = 2.0 * t * t;
  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

float elasticOut(float t) {
  return sin(-13.0 * (t + 1.0) * M_PI_2) * pow(2.0, -10.0 * t) + 1.0;
}

float elasticInOut(float t) {
  return t < 0.5 ? 0.5 * sin(+13.0 * M_PI_2 * 2.0 * t) * pow(2.0, 10.0 * (2.0 * t - 1.0)) : 0.5 * sin(-13.0 * M_PI_2 * ((2.0 * t - 1.0) + 1.0)) * pow(2.0, -10.0 * (2.0 * t - 1.0)) + 1.0;
}
#endif

vec3 animatePoint(vec3 point, vec3 startPoint, vec3 midPoint, float progress, inout float pointProgress) {
  float noise = simplexNoise(midPoint.xy * 10.0);

  float inProgress = linear(0.0, 0.44 + (noise * 0.1), progress);
  float outProgress = linear(0.34, 0.8 + (noise * 0.1), progress * 1.0);
  float easedInProgress = quadraticInOut(inProgress);
  float easedOutProgress = quadraticInOut(outProgress);
  float opacityProgressIn = linear(0.0, 0.5, progress);
  float opacityProgressOut = linear(0.5, 1.0, progress);

  vec3 finalPoint = mix(startPoint, midPoint, easedInProgress);
  finalPoint = mix(finalPoint, point, easedOutProgress);

  pointProgress = (opacityProgressIn - opacityProgressOut);
  return finalPoint;
}


void main() {
  vDistance = distance;
  vAnimValue = animValue;
  vResolution = resolution;

  float pointProgress;
  vec3 animatedPosition = animatePoint(position, positionStart, positionMid, animValue, pointProgress);

  vec3 lineDirection = normalize(animatedPosition);
  vec2 noiseUV = lineDirection.xy * 0.5 + 0.5;

  float noiseValue = simplexNoise(noiseUV * noiseScale + time * noiseSpeed);
  vNoiseFactor = noiseValue * 0.5 + 0.5;

  vec3 scaledPosition = animatedPosition * (1.0 + (vNoiseFactor - 0.5) * noiseStrength);

  vec4 worldPosition = modelMatrix * vec4(scaledPosition, 1.0);
  vWorldPosition = worldPosition.xyz;

  float shimmer = sin(time * shimmerSpeed + lineId * 0.1) * 0.4 + 0.6;
  vOpacity = shimmer;

  float sizeMultiplier = 0.6 + (distance / 9.0);
  float noiseSizeMultiplier = 1.0 + (vNoiseFactor - 0.5) * noiseStrength * 0.5;
  gl_PointSize = size * sizeMultiplier * shimmer * noiseSizeMultiplier;
  gl_PointSize -= (gl_PointSize / 4.0 * pointProgress);

  vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
  gl_Position = clipPosition;

  vScreenY = clipPosition.y / clipPosition.w;
}
