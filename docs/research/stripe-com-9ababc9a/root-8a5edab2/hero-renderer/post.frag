uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform sampler2D u_derivative;
uniform float u_blurAmount;
uniform int u_blurSamples;
uniform float u_diffuseBlur;
uniform float u_grainAmount;
uniform float u_opaque;
uniform vec2 u_resolution;
uniform vec3 u_clearColor;
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


// Noise-based blur function from NouveauBloomWave
// Creates dramatic Gaussian-style blur with random sampling
vec4 noiseBlur(sampler2D tex, vec2 st, vec2 texel, float radius) {
  vec4 total = vec4(0.0);
  float totalWeight = 0.0;
  
  // Take 16 random samples in a circular pattern
  for(int i = 0; i < 16; i++) {
    // Generate pseudo-random angle and distance
    float angle = random(st + float(i) * 0.1) * 6.28318530718; // 2*PI
    float distance = random(st + float(i) * 0.2);
    
    // Calculate sample offset in a circle
    vec2 offset = vec2(cos(angle), sin(angle)) * distance * radius * texel;
    
    // Sample the texture
    vec4 sampleColor = texture2D(tex, st + offset);
    
    // Weight samples by distance (closer = more weight)
    float weight = 1.0 - distance;
    total += sampleColor * weight;
    totalWeight += weight;
  }
  
  return total / totalWeight;
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 st = gl_FragCoord.xy * texel;

  vec4 sceneColor = texture2D(u_scene, v_uv);
  vec4 blurColor = blurAngular(u_scene, v_uv, u_blurAmount, u_blurSamples);
  float blurPower = smoothstep(0.0, 0.7, v_uv.y) - smoothstep(0.2, 1.0, v_uv.y);

  vec4 finalColor = mix(blurColor, sceneColor, blurPower);
  
  // Apply diffuse blur effect (dramatic gaussian-style blur)
  // Implementation from NouveauBloomWave
  if (u_diffuseBlur > 0.0) {
    // Scale the blur radius dramatically - multiply by 100 for visible effect
    float blurRadius = u_diffuseBlur * 100.0;
    vec4 diffuseBlurred = noiseBlur(u_scene, st, texel, blurRadius);
    // Mix between current result and heavily blurred version
    finalColor = mix(finalColor, diffuseBlurred, min(u_diffuseBlur * 2.0, 1.0));
  }
  
  finalColor.rgb = grain(finalColor.rgb, u_grainAmount);

  float alpha = mix(finalColor.a, 1.0, u_opaque);
  gl_FragColor = vec4(min(finalColor.rgb, 1.0), alpha);
}
