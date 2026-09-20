uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec2 u_center;
uniform vec2 u_radius;
uniform float u_opacity;

varying vec2 vPlaneUv;

void main() {
  // y grows downward to match how the center/radius are authored (CSS-style).
  vec2 cssUv = vec2(vPlaneUv.x, 1.0 - vPlaneUv.y);
  vec2 delta = (cssUv - u_center) / u_radius;
  float dist = length(delta);
  if (dist >= 1.0) discard;

  vec3 color = mix(u_colorA, u_colorB, clamp(dist, 0.0, 1.0));

  // Soft radial falloff so this reads as a glow blob fading to transparent,
  // rather than a flat color wash across the whole plane.
  float falloff = pow(clamp(1.0 - dist, 0.0, 1.0), 1.4);
  float alpha = u_opacity * falloff;
  if (alpha <= 0.001) discard;

  gl_FragColor = vec4(color, alpha);
}
