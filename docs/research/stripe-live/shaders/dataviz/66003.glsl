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
