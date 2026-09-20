varying vec2 v_uv;

void main() {
  v_uv = uv;
  vec4 projectedPosition = vec4(position, 1.0);
  gl_Position = projectedPosition;
}
