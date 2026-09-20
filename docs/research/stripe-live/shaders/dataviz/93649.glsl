uniform float opacity;
uniform float lineFadeBottom;
uniform float lineFadeTop;
uniform float noiseIntensity;

uniform vec3 gradientColorTop;
uniform vec3 gradientColorBottom;
uniform vec2 gradientColorStop;
uniform vec3 pulseColor;
uniform vec3 pulseColorBrightness;
uniform float pulseOpacityBoost;
uniform float pulseColorMode;
uniform float pulseSaturationBoost;
uniform float pulseLightnessBoost;
uniform float pulseOpacityFalloffEnd;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNormalizedY;
varying float vLineId;
varying float vLinePosition;
varying float vNoiseValue;
varying float vLinePercent;
varying float vLineCount;
varying vec2 vUv;
varying float vAnimValue;
varying vec2 vResolution;
varying float vLineOpacity;
varying float vPulseIntensity;

vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  float h = 0.0;
  float s = 0.0;
  if (maxC != minC) {
    float d = maxC - minC;
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

void main() {
  vec2 pixel = 1.0 / vResolution;
  vec2 st = gl_FragCoord.xy * pixel;
  vec3 gradientColor = mix(gradientColorBottom, gradientColorTop, smoothstep(gradientColorStop.x, gradientColorStop.y, st.y));

  float colorMix = vPulseIntensity * vPulseIntensity;
  vec3 finalColor;
  
  if (pulseColorMode < 0.5) {
    vec3 brightPulse = pulseColor + pulseColorBrightness;
    finalColor = mix(gradientColor, brightPulse, colorMix);
  } else {
    vec3 hsl = rgb2hsl(gradientColor);
    hsl.y = clamp(hsl.y + pulseSaturationBoost * colorMix, 0.0, 1.0);
    hsl.z = clamp(hsl.z + pulseLightnessBoost * colorMix, 0.0, 1.0);
    finalColor = hsl2rgb(hsl);
  }

  float animProgress = smoothstep(vLinePercent, min(vLinePercent + 0.1, 1.0), 1.0 - vAnimValue);
  float animOpacity = smoothstep(animProgress, min(animProgress + 0.6, 1.0), vLinePosition);

  float distanceFade = 1.0 - smoothstep(8.0, 16.0, abs(vWorldPosition.x));
  float verticalFade = mix(lineFadeBottom, lineFadeTop, vLinePosition);
  float noiseModulation = 1.0 - (vNoiseValue * noiseIntensity);
  float baseOpacity = opacity * distanceFade * verticalFade * noiseModulation * vLineOpacity;

  baseOpacity *= animOpacity;

  float opacityFalloff = 1.0 - smoothstep(0.0, pulseOpacityFalloffEnd, vLinePercent);
  float opacityBoost = 1.0 + vPulseIntensity * pulseOpacityBoost * opacityFalloff;
  float finalOpacity = baseOpacity * opacityBoost;

  gl_FragColor = vec4(finalColor, finalOpacity);
}
