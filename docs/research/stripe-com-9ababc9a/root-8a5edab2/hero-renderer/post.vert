varying vec2 v_uv;

void main() {
  v_uv = uv;

  // Normal projection sequence for reference
  // vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  // vec4 viewPosition = viewMatrix * modelPosition;
  // vec4 projectedPosition = projectionMatrix * viewPosition;

  vec4 projectedPosition = vec4(position, 1.0);
  gl_Position = projectedPosition;
}
