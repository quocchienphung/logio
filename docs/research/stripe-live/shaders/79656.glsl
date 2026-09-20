
uniform sampler2D u_pointSpriteSheet;
varying vec2 v_pointSpriteUv;
varying float v_time;
varying float v_random;
varying float v_alpha;
varying vec2 v_resolution;
varying vec2 v_mousePosition;

#define SPRITE_SIZE 1.0 / 4.0

void main() {
  vec2 pixel = 1.0 / v_resolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec2 spriteCoord = vec2(v_pointSpriteUv.x + gl_PointCoord.x * SPRITE_SIZE, v_pointSpriteUv.y + gl_PointCoord.y * SPRITE_SIZE);
  vec4 color = texture2D(u_pointSpriteSheet, spriteCoord);

  vec3 colorTop = vec3(1.0, 0.25, 0.41);
  vec3 colorBot = vec3(0.52, 0.21, 0.96);
  color.rgb = mix(colorTop, colorBot, 1.0 - st.y);
  color.a *= pow(v_alpha, 2.0);

  gl_FragColor = color;
}
