uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

varying float vOpacity;
varying float vAnimValue;
varying float vPercent;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float iAnimValue = 1.0 - vAnimValue;
  float opacity = smoothstep(iAnimValue, iAnimValue + 0.001, 1.0 - vPercent);

  opacity *= vAnimValue;

  gl_FragColor = vec4(gradientColor, vOpacity * opacity);
}
