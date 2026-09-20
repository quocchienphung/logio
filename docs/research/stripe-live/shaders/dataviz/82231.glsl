uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

uniform float opacity;
uniform float time;
uniform float shimmerSpeed;
uniform float fadeRadius;
uniform float fadeSharpness;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDistance;
varying float vLineProgress;
varying float vLineId;
varying float vScreenY;
varying float vNoiseFactor;
varying float vAnimValue;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float centerFade = smoothstep(0.0, fadeRadius, vDistance);

  float lineFade = smoothstep(0.0, fadeRadius / 4.0, vLineProgress);
  lineFade = pow(lineFade, fadeSharpness);

  float totalFade = max(lineFade, centerFade * 0.5);
  float shimmer = sin(time * shimmerSpeed + vLineId * 0.1) * 0.4 + 0.6;
  float noiseModulation = 0.8 + vNoiseFactor * 0.2;

  float transitionEnd = 1.0 - vNoiseFactor * 0.5;
  float iAnimValue = 1.0 - smoothstep(0.0, transitionEnd, vAnimValue);
  float transitionFade = smoothstep(iAnimValue, iAnimValue + 0.001, 1.0 - vLineProgress);
  transitionFade *= vAnimValue;

  gl_FragColor = vec4(gradientColor, opacity * shimmer * totalFade * noiseModulation * transitionFade);
}
