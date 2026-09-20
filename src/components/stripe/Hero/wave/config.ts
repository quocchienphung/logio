// Renderer configuration decoded from the frozen stripe.com bundle (module 89224: gj/P1/y7 exports).
// Breakpoints: mobile <=639, tablet 640..1263, desktop >=1264.
export interface WaveMaterialProps {
  speed: number;
  timeOffset: number;
  colorContrast: number;
  colorSaturation: number;
  colorHueShift: number;
  displaceFrequencyX: number;
  displaceFrequencyZ: number;
  displaceAmount: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  twistFrequencyX: number;
  twistFrequencyY: number;
  twistFrequencyZ: number;
  twistPowerX: number;
  twistPowerY: number;
  twistPowerZ: number;
  glowRamp: number;
  glowAmount: number;
  glowPower: number;
  lineThickness: number;
  lineAmount: number;
  lineDerivativePower: number;
}

export interface WaveConfig {
  materialProps: WaveMaterialProps;
  post: { blurAmount: number; grainAmount: number };
  camera: { position: [number, number, number]; zoom: number };
}

const CAMERA: WaveConfig["camera"] = { position: [100.00000000000004, 3.06222926004786e-13, 5000], zoom: 1 };
const POST = { blurAmount: 0.02, grainAmount: 1.1 };

export const WAVE_DESKTOP: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: {
    speed: 0.00004,
    timeOffset: 17500,
    colorContrast: 1,
    colorSaturation: 1,
    colorHueShift: -0.00159265358979299,
    displaceFrequencyX: 0.005831,
    displaceFrequencyZ: 0.016001,
    displaceAmount: -7.821,
    positionX: 380,
    positionY: -301.7,
    positionZ: -11.0999999999999,
    rotationX: -0.449592653589793,
    rotationY: -0.117592653589793,
    rotationZ: 1.87440734641021,
    scaleX: 9,
    scaleY: 8,
    scaleZ: 5,
    twistFrequencyX: -0.649999999999999,
    twistFrequencyY: 0.41,
    twistFrequencyZ: -0.58,
    twistPowerX: 3.63,
    twistPowerY: 0.7,
    twistPowerZ: 3.95,
    glowRamp: 0.834,
    glowAmount: 1.98,
    glowPower: 0.806,
    lineThickness: 1,
    lineAmount: 1,
    lineDerivativePower: 1
  },
};
export const WAVE_TABLET: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: {
    speed: 0.00004,
    timeOffset: 17500,
    colorContrast: 1,
    colorSaturation: 1,
    colorHueShift: -0.00159265358979299,
    displaceFrequencyX: 0.005831,
    displaceFrequencyZ: 0.016001,
    displaceAmount: -7.821,
    positionX: 525,
    positionY: -301.7,
    positionZ: -11.0999999999999,
    rotationX: -0.64,
    rotationY: -0.117592653589793,
    rotationZ: 1.68,
    scaleX: 9,
    scaleY: 8,
    scaleZ: 5,
    twistFrequencyX: -0.649999999999999,
    twistFrequencyY: 0.41,
    twistFrequencyZ: -0.58,
    twistPowerX: 3.63,
    twistPowerY: 0.7,
    twistPowerZ: 3.95,
    glowRamp: 0.834,
    glowAmount: 1.98,
    glowPower: 0.806,
    lineThickness: 1,
    lineAmount: 1,
    lineDerivativePower: 1
  },
};
export const WAVE_MOBILE: WaveConfig = {
  camera: CAMERA,
  post: POST,
  materialProps: {
    speed: 0.00004,
    timeOffset: 17500,
    colorContrast: 1,
    colorSaturation: 1,
    colorHueShift: -0.00159265358979299,
    displaceFrequencyX: 0.005831,
    displaceFrequencyZ: 0.016001,
    displaceAmount: -7.821,
    positionX: 320,
    positionY: -315,
    positionZ: -11.0999999999999,
    rotationX: -0.5,
    rotationY: -0.117592653589793,
    rotationZ: 1.64,
    scaleX: 9,
    scaleY: 8,
    scaleZ: 5,
    twistFrequencyX: -0.649999999999999,
    twistFrequencyY: 0.41,
    twistFrequencyZ: -0.58,
    twistPowerX: 3.63,
    twistPowerY: 0.7,
    twistPowerZ: 3.95,
    glowRamp: 0.834,
    glowAmount: 1.98,
    glowPower: 0.806,
    lineThickness: 1,
    lineAmount: 1,
    lineDerivativePower: 1
  },
};
/** Developers section (dark theme, no post-processing). */
export const WAVE_DEVELOPER: WaveConfig = {
  camera: CAMERA,
  post: { blurAmount: 0.02, grainAmount: 1.2 },
  materialProps: {
    speed: 0.00004,
    timeOffset: 1150,
    colorContrast: 1,
    colorSaturation: 1.15,
    colorHueShift: -0.0315926535897932,
    displaceFrequencyX: 0.003234,
    displaceFrequencyZ: 0.00799,
    displaceAmount: 6.051,
    positionX: -24.3,
    positionY: -56.4,
    positionZ: -11.0999999999999,
    rotationX: -0.159592653589793,
    rotationY: -0.283592653589793,
    rotationZ: -2.81559265358979,
    scaleX: 10,
    scaleY: 10,
    scaleZ: 7,
    twistFrequencyX: -0.0549999999999997,
    twistFrequencyY: 0.077,
    twistFrequencyZ: -0.518,
    twistPowerX: 3.95,
    twistPowerY: 5.85,
    twistPowerZ: 6.33,
    glowRamp: 1,
    glowAmount: 0.6,
    glowPower: 0.589,
    lineThickness: 1,
    lineAmount: 425,
    lineDerivativePower: 0.95
  },
};
