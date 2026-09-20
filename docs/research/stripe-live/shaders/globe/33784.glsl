varying vec2 vPlaneUv;

void main() {
  // PlaneGeometry(1, 1) vertices run from -0.5 to 0.5; the mesh's own
  // scale (set to match the camera frustum) turns this into a uv that
  // spans the full visible viewport regardless of aspect ratio.
  vPlaneUv = position.xy + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
