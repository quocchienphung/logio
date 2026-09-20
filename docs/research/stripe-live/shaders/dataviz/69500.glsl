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
