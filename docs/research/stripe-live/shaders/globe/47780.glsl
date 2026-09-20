uniform vec3 u_color;
uniform float u_intensity;
uniform float u_opacity;
uniform float u_innerRadius;
uniform float u_outerRadius;
uniform float u_outerFade;

varying vec2 vPlanePosition;

void main() {
  float dist = length(vPlanePosition);
  float inner = u_innerRadius;
  float outer = max(inner + 0.001, u_outerRadius);
  float fadeEnd = outer + max(0.001, u_outerFade);

  float grow = smoothstep(inner, outer, dist);
  float fade = 1.0 - smoothstep(outer, fadeEnd, dist);
  float halo = clamp(grow * fade, 0.0, 1.0);

  vec3 color = u_color;
  float alpha = halo * u_intensity * u_opacity;
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(color, alpha);
}
