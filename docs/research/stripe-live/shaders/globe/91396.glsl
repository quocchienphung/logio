uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec3 u_fresnelColor;
uniform float u_fresnelStrength;
uniform float u_fresnelPower;
uniform float u_opacity;
uniform float u_gradientContrast;
uniform float u_gradientOffset;

varying float vGradient;
varying float vFresnel;

void main() {
  float gradient = clamp(vGradient + u_gradientOffset, 0.0, 1.0);
  gradient = clamp(
    0.5 + (gradient - 0.5) * u_gradientContrast,
    0.0,
    1.0
  );
  vec3 baseColor = mix(u_colorA, u_colorB, gradient);
  float fresnelBase = pow(clamp(vFresnel, 0.0, 1.0), u_fresnelPower);
  float rimFactor = clamp(fresnelBase * u_fresnelStrength, 0.0, 1.0);
  vec3 color = mix(baseColor, u_fresnelColor, rimFactor);
  float alpha = clamp(u_opacity, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
