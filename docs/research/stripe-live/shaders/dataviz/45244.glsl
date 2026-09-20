uniform vec3 gradientColorBottom;
uniform vec3 gradientColorTop;
uniform vec2 gradientColorStop;

varying float vOpacity;
varying float vAnimValue;
varying vec2 vResolution;
uniform sampler2D pointTexture;

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  vec4 textureColor = texture2D(pointTexture, gl_PointCoord);

  gl_FragColor = vec4(gradientColor, textureColor.a * vOpacity);
}
