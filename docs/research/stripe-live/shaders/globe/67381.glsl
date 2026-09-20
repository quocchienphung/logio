uniform float u_timeSec;
uniform float u_radius;
uniform float u_dotSize;
uniform float u_coronaBurstDistance;
uniform float u_coronaParticipation;
uniform float u_coronaNoiseStrength;
uniform float u_coronaNoiseScale;
uniform float u_gradientAngle;
uniform vec2 u_gradientScale;
uniform vec3 u_cameraRight;
uniform vec3 u_cameraUp;
uniform vec3 u_cameraForward;
uniform vec3 u_cameraPosition;
uniform float u_coronaBaseFlightDur;
uniform float u_coronaBaseFadeDur;
uniform float u_coronaLaunchInterval;
uniform float u_canvasHeight;
uniform float u_pixelRatio;

attribute float rndId;
attribute float sizeVariation;
attribute float opacityVariation;
attribute float coronaSeed;
attribute float varianceRate;
attribute float varianceMotion;
attribute float coronaCanParticipate;

varying float vGradientCoord;
varying float vOpacityVariation;
varying float vCoronaProgress;
varying float vCoronaVisibility;
varying float vDepthFacing;

const float DESIGN_PIXEL_RATIO = 2.0;

void main() {
  vec3 baseNormal = normalize(position);
  vec3 pos = baseNormal * u_radius;
  float coronaEase = 0.0;

  if (u_coronaParticipation > 0.001 && coronaCanParticipate > 0.5) {
    float varianceScale = mix(0.667, 1.5, varianceMotion);
    float flightDuration = u_coronaBaseFlightDur * varianceScale;
    float fadeDuration = u_coronaBaseFadeDur * varianceScale;
    float desiredInterval = u_coronaLaunchInterval * mix(0.7, 1.7, varianceRate);
    float cycleLength = flightDuration + fadeDuration + max(desiredInterval - (flightDuration + fadeDuration), 0.0);

    float phase = mod(u_timeSec + coronaSeed * cycleLength, cycleLength);
    float launchIndex = mod(floor((u_timeSec + coronaSeed * cycleLength) / cycleLength), 100.0);

    float h = fract((coronaSeed * 127.1 + launchIndex * 311.7) * 0.00001 + coronaSeed);
    float coronaActive = step(h, u_coronaParticipation);

    float inFlight = step(phase, flightDuration);
    float travelPhase = phase / flightDuration;
    coronaEase = coronaActive * inFlight * smoothstep(0.0, 1.0, travelPhase);

    float fadeOut = smoothstep(0.65, 1.0, travelPhase);
    float fadePhase = clamp((phase - flightDuration) / fadeDuration, 0.0, 1.0);
    float fadeVisibility = mix(1.0 - fadeOut, 1.0, fadePhase);
    float idlePhase = step(flightDuration + fadeDuration, phase);
    float atSurface = 1.0 - coronaActive + (1.0 - inFlight);

    vCoronaProgress = coronaEase;
    vCoronaVisibility = mix(mix(fadeVisibility, 1.0, idlePhase), 1.0, idlePhase * atSurface);

    if (coronaEase > 0.001) {
      vec3 tangent = normalize(cross(baseNormal, vec3(0.0, 1.0, 0.0)));
      if (dot(tangent, tangent) < 0.01) tangent = normalize(cross(baseNormal, vec3(1.0, 0.0, 0.0)));
      vec3 bitangent = cross(baseNormal, tangent);

      float motionRate = 1.0 / varianceScale;
      float pathPhase = (launchIndex + mod(u_timeSec * motionRate, 6.283)) * u_coronaNoiseScale + rndId * 12.37;
      vec3 flow = tangent * sin(pathPhase) + bitangent * cos(pathPhase * 0.8);
      vec3 pathOffset = flow * (0.6 * u_coronaNoiseStrength * coronaEase);

      pos = baseNormal * (u_radius + u_coronaBurstDistance * coronaEase) + pathOffset;
    }
  } else {
    vCoronaProgress = 0.0;
    vCoronaVisibility = 1.0;
  }

  vec3 worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  vec3 worldNormal = normalize(mat3(modelMatrix) * baseNormal);

  vec3 viewDir = normalize(u_cameraPosition - worldPosition);
  vDepthFacing = dot(viewDir, worldNormal);

  vec3 worldDir = normalize(worldPosition);
  vec2 planar = vec2(dot(worldDir, u_cameraRight), dot(worldDir, u_cameraUp)) / max(u_gradientScale, vec2(0.001));
  float angleRad = radians(u_gradientAngle);
  vGradientCoord = dot(planar, vec2(cos(angleRad), sin(angleRad))) * 0.5 + 0.5;

  vOpacityVariation = opacityVariation;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float coronaScale = mix(1.0, 0.35, smoothstep(0.15, 0.85, coronaEase));

  float refHeight = 800.0;
  float heightScale = u_canvasHeight / refHeight;
  float perspective = 300.0 / -mvPosition.z;
  float scaledDotSize = u_dotSize * (u_pixelRatio / DESIGN_PIXEL_RATIO);

  gl_PointSize = scaledDotSize * sizeVariation * coronaScale * heightScale * perspective;
}
