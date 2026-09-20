// Stats data-viz shaders, verbatim from the reference bundle (index chunk string modules; ids noted).
// GLSL ES 3.0 features (uint hashing) require WebGL2, which three r178 targets by default.

/** rays: dot vertex (shimmer, noise, animValue morph) (module 8891). */
export const RAYS_DOTS_VERT = `
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
`;

/** rays: dot fragment (module 90258). */
export const RAYS_DOTS_FRAG = `
uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

uniform sampler2D pointTexture;
uniform float opacity;

varying float vOpacity;
varying float vDistance;
varying vec3 vWorldPosition;
varying float vNoiseFactor;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  vec4 textureColor = texture2D(pointTexture, gl_PointCoord);

  // Modulate opacity with noise
  float noiseModulation = 0.8 + vNoiseFactor * 0.2;

  gl_FragColor = vec4(gradientColor, textureColor.a * opacity * vOpacity * noiseModulation);
}
`;

/** rays: line vertex (simplex noise scale) (module 66003). */
export const RAYS_LINES_VERT = `
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDistance;
varying float vLineProgress;
varying float vScreenY;
attribute float lineId;
varying float vLineId;
varying float vNoiseFactor;
varying float vAnimValue;
varying vec2 vResolution;

uniform vec3 origin;
uniform float noiseStrength;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float time;
uniform float animValue;
uniform vec2 resolution;

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


void main() {
  vPosition = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vDistance = length(position - origin);
  vLineId = lineId;
  vAnimValue = animValue;
  vResolution = resolution;

  vec3 lineDirection = normalize(position);
  vec2 noiseUV = lineDirection.xy * 0.5 + 0.5;

  float noiseValue = simplexNoise(noiseUV * noiseScale + time * noiseSpeed);
  vNoiseFactor = noiseValue * 0.5 + 0.5;

  vec3 scaledPosition = position * (1.0 + (vNoiseFactor - 0.5) * noiseStrength);

  vLineProgress = vDistance / 3.8;
  vLineProgress = clamp(vLineProgress, 0.0, 1.0);

  vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
  gl_Position = clipPosition;

  vScreenY = clipPosition.y / clipPosition.w;
}
`;

/** rays: line fragment (module 82231). */
export const RAYS_LINES_FRAG = `
uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

uniform float opacity;
uniform float time;
uniform float shimmerSpeed;
uniform float fadeRadius;
uniform float fadeSharpness;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDistance;
varying float vLineProgress;
varying float vLineId;
varying float vScreenY;
varying float vNoiseFactor;
varying float vAnimValue;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float centerFade = smoothstep(0.0, fadeRadius, vDistance);

  float lineFade = smoothstep(0.0, fadeRadius / 4.0, vLineProgress);
  lineFade = pow(lineFade, fadeSharpness);

  float totalFade = max(lineFade, centerFade * 0.5);
  float shimmer = sin(time * shimmerSpeed + vLineId * 0.1) * 0.4 + 0.6;
  float noiseModulation = 0.8 + vNoiseFactor * 0.2;

  float transitionEnd = 1.0 - vNoiseFactor * 0.5;
  float iAnimValue = 1.0 - smoothstep(0.0, transitionEnd, vAnimValue);
  float transitionFade = smoothstep(iAnimValue, iAnimValue + 0.001, 1.0 - vLineProgress);
  transitionFade *= vAnimValue;

  gl_FragColor = vec4(gradientColor, opacity * shimmer * totalFade * noiseModulation * transitionFade);
}
`;

/** volume: trailing globe line vertex (depth fade, mouse ray) (module 69500). */
export const GLOBE_LINES_VERT = `
uniform vec3 customCameraPosition;
uniform float sphereRadius;
uniform float minOpacity;
uniform float maxOpacity;
uniform float zOrigin;
uniform float animValue;
uniform vec2 resolution;
uniform float mousePower;
uniform vec3 mouseRayDirection;
uniform vec3 mouseRayOrigin;

attribute float opacity;
attribute float percent;
attribute vec3 originPosition;
attribute vec3 endPosition;

varying float vOpacity;
varying float vAnimValue;
varying float vPercent;
varying vec2 vResolution;


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

vec3 mouseDisplace(vec3 position, vec3 mousePosition, vec3 mouseRayOrigin, vec3 mouseRayDir, float strength) {
  vec3 mouseDir;
  float mouseDistance = pointToRayDistance(mousePosition, mouseRayOrigin, mouseRayDir, mouseDir);
  float mousePower = 1.0 - clamp(pow(mouseDistance / 1.0, 1.0), 0.0, 1.0);
  mousePower = smoothstep(0.0, 1.0, mousePower);
  position += mouseDir * mousePower * strength * 0.2;
  return position;
}


void main() {
  vAnimValue = animValue;
  vPercent = percent;
  vResolution = resolution;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float distanceToCamera = distance(worldPosition.xyz, customCameraPosition);

  float minDistance = distance(customCameraPosition, vec3(0.0, 0.0, 0.0)) - zOrigin - sphereRadius;
  float maxDistance = distance(customCameraPosition, vec3(0.0, 0.0, 0.0)) - zOrigin + sphereRadius;

  float normalizedDistance = (distanceToCamera - minDistance) / (maxDistance - minDistance);
  normalizedDistance = clamp(normalizedDistance, 0.0, 1.0);

  float distanceOpacity = mix(maxOpacity, minOpacity, normalizedDistance);
  vOpacity = opacity * distanceOpacity;

  float dist = distance(endPosition, originPosition);
  dist = smoothstep(0.1, 1.0, min(dist, 1.0));
  vec3 pos = mouseDisplace(position, endPosition, mouseRayOrigin, mouseRayDirection, mousePower * dist * pow(percent, 1.0));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/** volume: trailing globe line fragment (module 80957). */
export const GLOBE_LINES_FRAG = `
uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

varying float vOpacity;
varying float vAnimValue;
varying float vPercent;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float iAnimValue = 1.0 - vAnimValue;
  float opacity = smoothstep(iAnimValue, iAnimValue + 0.001, 1.0 - vPercent);

  opacity *= vAnimValue;

  gl_FragColor = vec4(gradientColor, vOpacity * opacity);
}
`;

/** volume: depth-based dot vertex (module 4663). */
export const GLOBE_DOTS_VERT = `
uniform float size;
uniform float minOpacity;
uniform float maxOpacity;
uniform vec3 customCameraPosition;
uniform float sphereRadius;
uniform float zOrigin;
uniform float time;
uniform float animValue;
uniform float opacity;
uniform vec2 resolution;
uniform float mousePower;
uniform vec3 mouseRayDirection;
uniform vec3 mouseRayOrigin;

attribute float dotId;
attribute float dotScale;
attribute vec3 positionStart;
attribute vec3 positionMid;
attribute vec3 positionLineOrigin;

varying float vOpacity;
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

vec3 mouseDisplace(vec3 position, vec3 mousePosition, vec3 mouseRayOrigin, vec3 mouseRayDir, float strength) {
  vec3 mouseDir;
  float mouseDistance = pointToRayDistance(mousePosition, mouseRayOrigin, mouseRayDir, mouseDir);
  float mousePower = 1.0 - clamp(pow(mouseDistance / 1.0, 1.0), 0.0, 1.0);
  mousePower = smoothstep(0.0, 1.0, mousePower);
  position += mouseDir * mousePower * strength * 0.2;
  return position;
}


void main() {
  vAnimValue = animValue;
  vResolution = resolution;

  float lineDist = distance(position, positionLineOrigin);
  lineDist = smoothstep(0.5, 1.0, min(lineDist, 1.0));

  float pointProgress;
  vec3 pos = mouseDisplace(position, position, mouseRayOrigin, mouseRayDirection, lineDist * mousePower);
  pos = animatePoint(pos, positionStart, positionMid, animValue, pointProgress);

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float distanceToCamera = distance(worldPosition.xyz, customCameraPosition);

  float minDistance = distance(customCameraPosition, vec3(0.0, 0.0, 0.0)) - zOrigin - sphereRadius;
  float maxDistance = distance(customCameraPosition, vec3(0.0, 0.0, 0.0)) - zOrigin + sphereRadius;

  float normalizedDistance = (distanceToCamera - minDistance) / (maxDistance - minDistance);
  normalizedDistance = clamp(normalizedDistance, 0.0, 1.0);

  float distanceOpacity = mix(maxOpacity, minOpacity, normalizedDistance);
  vOpacity = distanceOpacity;
  vOpacity *= opacity;

  gl_PointSize = size * dotScale;
  gl_PointSize -= (gl_PointSize / 4.0 * pointProgress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/** volume: dot fragment (module 45244). */
export const GLOBE_DOTS_FRAG = `
uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

varying float vOpacity;
varying float vAnimValue;
varying vec2 vResolution;
uniform sampler2D pointTexture;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  vec4 textureColor = texture2D(pointTexture, gl_PointCoord);

  gl_FragColor = vec4(gradientColor, textureColor.a * vOpacity);
}
`;

/** subscriptions: spline end-point vertex (module 53628). */
export const SPLINE_POINTS_VERT = `
uniform float frame;
uniform float pointSize;
uniform float animValue;
uniform float opacity;
uniform vec2 resolution;
uniform float mousePower;
uniform vec3 mouseRayDirection;
uniform vec3 mouseRayOrigin;

attribute float randomness;
attribute float cycle;
attribute float type;
attribute vec2 pointUv;
attribute vec3 positionStart;
attribute vec3 positionMid;
attribute vec3 mouseStartPoint;
attribute vec3 mouseEndPoint;

varying vec2 vUv;
varying float vFrame;
varying float vRandom;
varying float vCycle;
varying float vType;
varying float vHeartbeatSpeed;
varying float vHeartbeatFrequency;
varying float vLineOpacity;
varying float vAnimValue;
varying float vPointOpacity;
varying vec2 vResolution;

uniform float lineOpacity;
uniform float heartbeatSpeed;
uniform float heartbeatFrequency;

uniform float floatSpeed;
uniform float floatPower;
uniform float floatAmount;

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

vec3 mouseDisplace(vec3 position, vec3 mousePosition, vec3 mouseRayOrigin, vec3 mouseRayDir, float strength) {
  vec3 mouseDir;
  float mouseDistance = pointToRayDistance(mousePosition, mouseRayOrigin, mouseRayDir, mouseDir);
  float mousePower = 1.0 - clamp(pow(mouseDistance / 1.0, 1.0), 0.0, 1.0);
  float distFromCenter = pow(length(position) / 3.0, 2.5);
  mousePower = smoothstep(0.3, 1.0, mousePower);
  position += mouseDir * 0.1 * mousePower * distFromCenter * strength;
  return position;
}


void main() {
  vUv = uv;
  vFrame = frame;
  vCycle = cycle;
  vType = type;
  vHeartbeatSpeed = heartbeatSpeed;
  vHeartbeatFrequency = heartbeatFrequency;
  vLineOpacity = lineOpacity;
  vAnimValue = animValue;
  vRandom = randomness;
  vResolution = resolution;

  vec3 pos = mouseDisplace(position, mouseStartPoint, mouseRayOrigin, mouseRayDirection, mousePower);
  pos = mouseDisplace(pos, mouseEndPoint, mouseRayOrigin, mouseRayDirection, mousePower);

  float pointProgress;
  pos = animatePoint(pos, positionStart, positionMid, animValue, pointProgress);

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  float randomFrame = vFrame + vHeartbeatFrequency * vCycle;
  float fractCycle = fract(randomFrame / vHeartbeatFrequency);
  float animCycle = linear(0.0, vHeartbeatSpeed, fractCycle);

  float playIn = linear(0.0, 0.5, animCycle);
  float playOut = linear(0.5, 1.0, animCycle);
  float startDotIn = linear(0.2, 0.3, playIn);
  float endDotIn = linear(0.3, 0.4, playIn);
  float startDotOut = linear(0.0, 0.1, playOut);
  float endDotOut = linear(0.1, 0.15, playOut);
  float pointIn = clamp(startDotIn - startDotOut, 0.0, 1.0);
  float pointOut = clamp(endDotIn - endDotOut, 0.0, 1.0);

  pointIn *= 1.0 - vType;
  pointOut *= vType;

  float pointAmbient = clamp(pointIn + pointOut, 0.0, 1.0);
  vPointOpacity = opacity;

  gl_PointSize = pointSize - (pointSize * (1.0 - pointAmbient));
  gl_PointSize -= (gl_PointSize / 4.0 * pointProgress);
}
`;

/** subscriptions: spline end-point fragment (module 70538). */
export const SPLINE_POINTS_FRAG = `
uniform sampler2D circleTexture;
uniform vec3 gradientColorTop;
uniform vec3 gradientColorBottom;
uniform vec2 gradientColorStop;

varying float vFrame;
varying float vRandom;
varying float vCycle;
varying float vType;
varying float vHeartbeatSpeed;
varying float vHeartbeatFrequency;
varying float vLineOpacity;
varying float vAnimValue;
varying float vPointOpacity;
varying vec2 vResolution;

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


void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float cycle = vHeartbeatFrequency * vCycle;
  float randomFrame = vFrame + cycle;
  float fractCycle = fract(randomFrame / vHeartbeatFrequency);
  float frame = linear(0.0, vHeartbeatSpeed, fractCycle);
  float frameIn = linear(0.0, 0.1, frame);

  vec4 color = texture2D(circleTexture, gl_PointCoord);
  color.rgb = gradientColor;

  color.a *= smoothstep(0.0, 0.1, st.y);
  color.a *= vPointOpacity;

  gl_FragColor = color;
}
`;

/** subscriptions: spline line vertex (heartbeat, float) (module 74820). */
export const SPLINE_LINES_VERT = `
uniform float frame;
uniform vec2 resolution;
uniform float animValue;
uniform float mousePower;
uniform vec3 mouseRayDirection;
uniform vec3 mouseRayOrigin;

attribute float cycle;
attribute float percent;
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float primary;

varying vec2 vUv;
varying float vFrame;
varying float vCycle;
varying float vRandom;
varying float vPercent;
varying vec2 vResolution;
varying float vAnimValue;
varying float vPrimary;

uniform float floatSpeed;
uniform float floatPower;
uniform float floatAmount;

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

vec3 mouseDisplace(vec3 position, vec3 mousePosition, vec3 mouseRayOrigin, vec3 mouseRayDir, float strength) {
  vec3 mouseDir;
  float mouseDistance = pointToRayDistance(mousePosition, mouseRayOrigin, mouseRayDir, mouseDir);
  float mousePower = 1.0 - clamp(pow(mouseDistance / 1.0, 1.0), 0.0, 1.0);
  float distFromCenter = pow(length(position) / 3.0, 2.5);
  mousePower = smoothstep(0.3, 1.0, mousePower);
  position += mouseDir * 0.1 * mousePower * distFromCenter * strength;
  return position;
}


void main() {
  vUv = uv;
  vFrame = frame;
  vCycle = cycle;
  vPercent = percent;
  vResolution = resolution;
  vAnimValue = animValue;
  vRandom = simplexNoise(startPoint.xy);
  vPrimary = primary;

  vec3 pos = mouseDisplace(position, startPoint, mouseRayOrigin, mouseRayDirection, mousePower);
  pos = mouseDisplace(pos, endPoint, mouseRayOrigin, mouseRayDirection, mousePower);

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 startModelPosition = modelMatrix * vec4(startPoint, 1.0);
  vec4 endModelPosition = modelMatrix * vec4(endPoint, 1.0);

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
`;

/** subscriptions: spline line fragment (module 90761). */
export const SPLINE_LINES_FRAG = `
varying vec2 vUv;
varying float vFrame;
varying float vCycle;
varying float vRandom;
varying float vPercent;
varying vec2 vResolution;
varying float vAnimValue;
varying float vPrimary;

uniform float lineOpacity;
uniform float heartbeatSpeed;
uniform float heartbeatFrequency;

uniform vec3 gradientColorTop;
uniform vec3 gradientColorBottom;
uniform vec2 gradientColorStop;

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


void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float randomFrame = vFrame + heartbeatFrequency * vCycle;
  float fractCycle = fract(randomFrame / heartbeatFrequency);
  float cycle = linear(0.0, heartbeatSpeed, fractCycle);

  float playIn = linear(0.0, 0.5, cycle);
  playIn = expoInOut(playIn);

  float playOut = linear(0.5, 0.54, cycle);
  playOut = sineOut(playOut);

  float smoothIn = smoothstep(vPercent, min(vPercent + 0.001, 1.0), playIn);
  float smoothOut = smoothstep(vPercent, min(vPercent + 0.001, 1.0), playOut);

  float overallAlpha = lineOpacity;
  float alphaArea = smoothstep(0.4, 0.5, vPercent) - smoothstep(0.53, 0.7, vPercent);
  overallAlpha *= 1.0 - (alphaArea * 0.96);

  // Business dots and lines stay faintly visible
  float minAlpha = 0.15 * smoothstep(0.6, 0.8, vPercent);

  vec3 color = gradientColor;
  float alpha = overallAlpha * (smoothIn - playOut);
  alpha *= smoothstep(0.0, 0.1, st.y);

  float transitionValue = (vAnimValue + (vAnimValue * vRandom * 1.0)) / (1.0 + (vAnimValue * vRandom * 1.0));
  float transitionEdge = transitionValue * 0.5;
  float transitionAlpha = smoothstep(0.5 - transitionEdge, 0.5 - transitionEdge, vPercent) -
    smoothstep(0.5 + transitionEdge, 0.5 + transitionEdge, vPercent);

  float finalAlpha = max(alpha, minAlpha) * transitionAlpha;
  //finalAlpha *= 1.0 - mix(smoothstep(0.5, 0.55, vPercent), 0.0, vPrimary);
  gl_FragColor = vec4(color, finalAlpha);
}
`;

/** uptime: wave dot vertex (pulse) (module 54333). */
export const WAVE_DOTS_VERT = `
uniform float size;
uniform float time;
uniform float animValue;
uniform float opacity;
uniform vec2 resolution;
uniform float pulseSizeBoost;

attribute float lineId;
attribute float normalizedY;
attribute float depthOpacity;
attribute float noiseValue;
attribute float linePercent;
attribute vec3 positionStart;
attribute vec3 positionMid;
attribute float pulseIntensity;
attribute float pulseDisplacement;

varying float vOpacity;
varying float vNormalizedY;
varying vec3 vWorldPosition;
varying float vDepthOpacity;
varying float vNoiseValue;
varying float vPositionNoise;
varying float vAnimValue;
varying vec2 vResolution;
varying float vPulseIntensity;
varying float vLinePercent;

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
  vNormalizedY = normalizedY;
  vDepthOpacity = depthOpacity;
  vOpacity = opacity;
  vNoiseValue = noiseValue;
  vAnimValue = animValue;
  vPositionNoise = simplexNoise(position.xy * 1.0);
  vResolution = resolution;
  vPulseIntensity = pulseIntensity;
  vLinePercent = linePercent;

  float pointProgress;
  vec3 pos = animatePoint(position, positionStart, positionMid, animValue, pointProgress);

  pos.y += pulseDisplacement;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;

  float baseSize = size - (size / 3.0 * (1.0 - depthOpacity));
  baseSize -= (baseSize / 4.0 * pointProgress);
  gl_PointSize = baseSize * (1.0 + pulseIntensity * pulseSizeBoost);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/** uptime: wave dot fragment (module 32832). */
export const WAVE_DOTS_FRAG = `
uniform sampler2D pointTexture;
uniform float opacity;
uniform float noiseIntensity;

uniform vec3 gradientColorTop;
uniform vec3 gradientColorBottom;
uniform vec2 gradientColorStop;
uniform vec3 pulseColor;
uniform vec3 pulseColorBrightness;
uniform float pulseOpacityBoost;
uniform float pulseColorMode;
uniform float pulseSaturationBoost;
uniform float pulseLightnessBoost;
uniform float pulseOpacityFalloffEnd;

varying float vNormalizedY;
varying vec3 vWorldPosition;
varying float vDepthOpacity;
varying float vNoiseValue;
varying float vPositionNoise;
varying float vAnimValue;
varying vec2 vResolution;
varying float vPulseIntensity;
varying float vLinePercent;


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


vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  float h = 0.0;
  float s = 0.0;
  if (maxC != minC) {
    float d = maxC - minC;
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float colorMix = vPulseIntensity * vPulseIntensity;
  vec3 finalColor;
  
  if (pulseColorMode < 0.5) {
    vec3 brightPulse = pulseColor + pulseColorBrightness;
    finalColor = mix(gradientColor, brightPulse, colorMix);
  } else {
    vec3 hsl = rgb2hsl(gradientColor);
    hsl.y = clamp(hsl.y + pulseSaturationBoost * colorMix, 0.0, 1.0);
    hsl.z = clamp(hsl.z + pulseLightnessBoost * colorMix, 0.0, 1.0);
    finalColor = hsl2rgb(hsl);
  }

  vec4 textureColor = texture2D(pointTexture, gl_PointCoord);

  float noiseModulation = 1.0 - (vNoiseValue * noiseIntensity);
  float baseOpacity = textureColor.a * opacity * vDepthOpacity * noiseModulation;

  float animNoise = map(vPositionNoise, -1.0, 1.0, 0.0, 1.0);
  float animStart = animNoise * 0.75;
  baseOpacity *= opacity;

  float opacityFalloff = 1.0 - smoothstep(0.0, pulseOpacityFalloffEnd, vLinePercent);
  float opacityBoost = 1.0 + vPulseIntensity * pulseOpacityBoost * opacityFalloff;
  float finalOpacity = baseOpacity * opacityBoost;

  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;

/** uptime: wave line vertex (module 7249). */
export const WAVE_LINES_VERT = `
uniform vec2 resolution;
uniform float animValue;
uniform float pulseLineYOffset;
uniform float pulseSizeBoost;

attribute float lineId;
attribute float linePercent;
attribute float linePosition;
attribute float lineCount;
attribute float noiseValue;
attribute float lineOpacity;
attribute float pulseIntensity;
attribute float pulseDisplacement;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNormalizedY;
varying float vLineId;
varying float vLinePosition;
varying float vNoiseValue;
varying float vLinePercent;
varying float vLineCount;
varying vec2 vUv;
varying float vAnimValue;
varying vec2 vResolution;
varying float vLineOpacity;
varying float vPulseIntensity;


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


void main() {
  vec3 pos = position;

  vPosition = pos;
  vLineId = lineId;
  vLinePosition = linePosition;
  vNoiseValue = noiseValue;
  vLinePercent = linePercent;
  vLineCount = lineCount;
  vUv = uv;
  vAnimValue = animValue;
  vResolution = resolution;
  vLineOpacity = lineOpacity;
  vPulseIntensity = pulseIntensity;

  float animProgress = 1.0 - smoothstep(vLinePercent, min(vLinePercent + 0.5, 1.0), animValue);
  animProgress = expoOut(animProgress);
  pos.y -= animProgress * 4.0;

  pos.y += pulseDisplacement * linePosition;
  pos.y -= pulseIntensity * pulseLineYOffset * pulseSizeBoost;
  pos.y -= linePosition * 0.025;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;

  vNormalizedY = (worldPosition.y + 6.0) / 12.0;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/** uptime: wave line fragment (module 93649). */
export const WAVE_LINES_FRAG = `
uniform float opacity;
uniform float lineFadeBottom;
uniform float lineFadeTop;
uniform float noiseIntensity;

uniform vec3 gradientColorTop;
uniform vec3 gradientColorBottom;
uniform vec2 gradientColorStop;
uniform vec3 pulseColor;
uniform vec3 pulseColorBrightness;
uniform float pulseOpacityBoost;
uniform float pulseColorMode;
uniform float pulseSaturationBoost;
uniform float pulseLightnessBoost;
uniform float pulseOpacityFalloffEnd;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNormalizedY;
varying float vLineId;
varying float vLinePosition;
varying float vNoiseValue;
varying float vLinePercent;
varying float vLineCount;
varying vec2 vUv;
varying float vAnimValue;
varying vec2 vResolution;
varying float vLineOpacity;
varying float vPulseIntensity;

vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  float h = 0.0;
  float s = 0.0;
  if (maxC != minC) {
    float d = maxC - minC;
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float colorMix = vPulseIntensity * vPulseIntensity;
  vec3 finalColor;
  
  if (pulseColorMode < 0.5) {
    vec3 brightPulse = pulseColor + pulseColorBrightness;
    finalColor = mix(gradientColor, brightPulse, colorMix);
  } else {
    vec3 hsl = rgb2hsl(gradientColor);
    hsl.y = clamp(hsl.y + pulseSaturationBoost * colorMix, 0.0, 1.0);
    hsl.z = clamp(hsl.z + pulseLightnessBoost * colorMix, 0.0, 1.0);
    finalColor = hsl2rgb(hsl);
  }

  float animProgress = smoothstep(vLinePercent, min(vLinePercent + 0.1, 1.0), 1.0 - vAnimValue);
  float animOpacity = smoothstep(animProgress, min(animProgress + 0.6, 1.0), vLinePosition);

  float distanceFade = 1.0 - smoothstep(8.0, 16.0, abs(vWorldPosition.x));
  float verticalFade = mix(lineFadeBottom, lineFadeTop, vLinePosition);
  float noiseModulation = 1.0 - (vNoiseValue * noiseIntensity);
  float baseOpacity = opacity * distanceFade * verticalFade * noiseModulation * vLineOpacity;

  baseOpacity *= animOpacity;

  float opacityFalloff = 1.0 - smoothstep(0.0, pulseOpacityFalloffEnd, vLinePercent);
  float opacityBoost = 1.0 + vPulseIntensity * pulseOpacityBoost * opacityFalloff;
  float finalOpacity = baseOpacity * opacityBoost;

  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;
