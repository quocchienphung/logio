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
