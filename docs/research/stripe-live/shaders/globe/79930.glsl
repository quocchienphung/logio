varying vec2 vPlanePosition;

void main() {
  vPlanePosition = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
