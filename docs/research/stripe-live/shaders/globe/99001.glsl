varying float vGradient;
varying float vFresnel;
uniform vec3 u_gradientDir;
uniform vec3 u_cameraPosition;
uniform vec3 u_cameraRight;
uniform vec3 u_cameraUp;
uniform vec3 u_cameraForward;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vec3 surfaceDir = normalize(worldPosition.xyz);
  vec3 surfaceCamera;
  surfaceCamera.x = dot(surfaceDir, u_cameraRight);
  surfaceCamera.y = dot(surfaceDir, u_cameraUp);
  surfaceCamera.z = dot(surfaceDir, u_cameraForward);
  vGradient = dot(surfaceCamera, normalize(u_gradientDir)) * 0.5 + 0.5;
  vec3 viewDir = normalize(u_cameraPosition - worldPosition.xyz);
  float fresnel = clamp(1.0 - max(dot(viewDir, worldNormal), 0.0), 0.0, 1.0);
  vFresnel = fresnel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
