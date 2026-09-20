precision mediump float;

uniform float u_opacity_factor;
uniform float u_coronaOpacityDrop;
uniform float u_depthFadeEnabled;
uniform float u_depthFadeFront;
uniform float u_depthFadeBack;
uniform float u_depthFadeMin;
uniform float u_depthFadeCurve;
uniform float u_gradientStops[3];
uniform vec3 u_gradientColors[3];

varying float vGradientCoord;
varying float vOpacityVariation;
varying float vCoronaProgress;
varying float vCoronaVisibility;
varying float vDepthFacing;

vec3 sampleGradient(float t) {
  float clamped = clamp(t, 0.0, 1.0);
  float s0 = u_gradientStops[0];
  float s1 = u_gradientStops[1];

  float t01 = clamp((clamped - s0) / max(1e-5, s1 - s0), 0.0, 1.0);
  float t12 = clamp((clamped - s1) / max(1e-5, u_gradientStops[2] - s1), 0.0, 1.0);

  vec3 c = mix(u_gradientColors[0], u_gradientColors[1], t01);
  c = mix(c, u_gradientColors[2], t12 * step(s1, clamped));
  return c;
}

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = smoothstep(0.5, 0.4, dist);
  vec3 color = sampleGradient(vGradientCoord);

  alpha *= u_opacity_factor * vOpacityVariation;
  alpha *= mix(1.0, max(0.0, 1.0 - u_coronaOpacityDrop), vCoronaProgress) * vCoronaVisibility;

  if (u_depthFadeEnabled > 0.5) {
    float range = max(0.0001, u_depthFadeFront - u_depthFadeBack);
    float mapped = clamp((vDepthFacing - u_depthFadeBack) / range, 0.0, 1.0);
    float fadeFactor = pow(mapped, max(0.01, u_depthFadeCurve));
    alpha *= mix(clamp(u_depthFadeMin, 0.0, 1.0), 1.0, fadeFactor);
  }

  color = mix(color, vec3(1.0), vCoronaProgress * 0.45);

  gl_FragColor = vec4(color, alpha);
}
