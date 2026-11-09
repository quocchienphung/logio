/** The ribbon is antialiased in its render target; keep the final composite sharp.
 * A single texture fetch replaces the six rotated blur taps and their ghosted silhouettes.
 * Subtle, stationary dither prevents gradient banding without crawling film grain.
 */
export const HERO_POST_FRAG = `
uniform sampler2D u_scene;
varying vec2 v_uv;

void main() {
  vec4 color = texture2D(u_scene, v_uv);
  vec3 p = fract(vec3(gl_FragCoord.xyx) * 0.1031);
  p += dot(p, p.yzx + 33.33);
  float dither = (fract((p.x + p.y) * p.z) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(color.rgb + dither * 0.35, 0.0, 1.0), color.a);
}
`;
