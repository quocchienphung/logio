uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

uniform sampler2D pointTexture;
uniform float opacity;

varying float vOpacity;
varying float vDistance;
varying vec3 vWorldPosition;
varying float vNoiseFactor;
varying vec2 vResolution;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  vec4 textureColor = texture2D(pointTexture, gl_PointCoord);

  // Modulate opacity with noise
  float noiseModulation = 0.8 + vNoiseFactor * 0.2;

  gl_FragColor = vec4(gradientColor, textureColor.a * opacity * vOpacity * noiseModulation);
}
