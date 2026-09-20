// GLSL decoded from the frozen stripe.com bundle (index chunk modules 4732/82273/84113/50800) — issuing card.
export const CARD_VERT = `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;
}
`;

export const CARD_FRAG = `uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_uv;

void main() {
  vec4 color = texture2D(u_texture, v_uv);
  gl_FragColor = color;
}
`;

export const ISSUING_POST_VERT = `varying vec2 v_uv;

void main() {
  v_uv = uv;
  vec4 projectedPosition = vec4(position, 1.0);
  gl_Position = projectedPosition;
}
`;

export const ISSUING_POST_FRAG = `uniform sampler2D u_wave;
uniform sampler2D u_cardWindow;
uniform sampler2D u_card;
uniform float u_blurAmount;
uniform int u_blurSamples;
uniform float u_grainAmount;
uniform vec2 u_resolution;
varying vec2 v_uv;

// TODO(weston): glsl-loader.js is looking for paths relative to the shader source.
// We should update it to start from a configurable root location

// The origin of these popular glsl functions is a mystery, but it seems they
// were likely derived from a paper titled "On generating random numbers, with
// help of y=[(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of
// Statisticians and the 7th Vilnius Conference on Probability Theory and
// Mathematical Statistics, August 1998.

// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner

#ifndef STRIPE_RANDOM
#define STRIPE_RANDOM
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random(in vec3 pos) {
  return fract(sin(dot(pos.xyz, vec3(70.9898, 78.233, 32.4355))) * 43758.5453123);
}
#endif


#ifndef STRIPE_GRAIN
#define STRIPE_GRAIN
vec3 grain(vec3 color, float amount) {
  float grid_position = random(gl_FragCoord.xy * 0.01);
  vec3 dither_shift_RGB = vec3(4.0 / 255.0, 4.0 / 255.0, 4.0 / 255.0);
  dither_shift_RGB = mix(amount * dither_shift_RGB, -amount * dither_shift_RGB, grid_position);
  return color + dither_shift_RGB;
}
#endif

#ifndef STRIPE_BLUR_ANGULAR
#define STRIPE_BLUR_ANGULAR

vec4 blurAngular(sampler2D tex, vec2 uv, float angle, int samples) {
  vec4 total = vec4(0);
  vec2 coord = uv - 0.5;

  float dist = 1.0 / float(samples);
  vec2 dir = vec2(cos(angle * dist), sin(angle * dist));
  mat2 rot = mat2(dir.xy, -dir.y, dir.x);
  
  for(int i = 0; i < samples; i += 1) {
    vec4 color = texture(tex, coord + 0.5);
    total += color;
    coord *= rot;
  }

  return total * dist;
}

#endif


void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 st = gl_FragCoord.xy * texel;

  vec2 center = vec2(0.5, 0.5);
  vec2 offset = v_uv - center;
  vec2 scaledOffset = offset / 1.5;
  vec2 zoomedUv = center + scaledOffset;
  zoomedUv = clamp(zoomedUv, 0.0, 1.0);

  vec4 whiteColor = vec4(1.0);
  vec4 waveColor = texture2D(u_wave, zoomedUv);
  vec4 cardColor = texture2D(u_card, v_uv);
  vec4 cardWindowColor = texture2D(u_cardWindow, v_uv);

  vec4 blurColor = blurAngular(u_wave, v_uv, 0.14, u_blurSamples);
  vec4 zoomedBlurColor = blurAngular(u_wave, zoomedUv, 0.14, u_blurSamples);
  waveColor = mix(waveColor, zoomedBlurColor, 0.25);

  float a = 1.0 - cardWindowColor.a;
  // Outside the card window the (now dark) wave is lifted further toward white so the halo stays a soft grey.
  vec4 finalColor = mix(waveColor, mix(blurColor, whiteColor, a * 0.84), a);
  finalColor = mix(finalColor, cardColor, cardColor.a);
  finalColor.rgb = grain(finalColor.rgb, u_grainAmount);

  gl_FragColor = finalColor;
}
`;
