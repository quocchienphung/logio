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
