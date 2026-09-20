uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_uv;

void main() {
  vec4 color = texture2D(u_texture, v_uv);
  gl_FragColor = color;
}
