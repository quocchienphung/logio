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
