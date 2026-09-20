// Issuing card wave configuration decoded from the frozen bundle (configs.json "issuing").
import type { WaveConfig } from "@/components/stripe/Hero/wave/config";

export const ISSUING_WAVE: WaveConfig = {
  camera: { position: [100.00000000000001, 3.06222926004786e-13, 5000], zoom: 1 },
  post: { blurAmount: 0.02, grainAmount: 1.2 },
  materialProps: {
    speed: 0.00008,
    timeOffset: 2275,
    colorContrast: 1,
    colorSaturation: 1,
    colorHueShift: -0.00159265358979299,
    displaceFrequencyX: 0.005831,
    displaceFrequencyZ: 0.016001,
    displaceAmount: -7.821,
    positionX: -200.7,
    positionY: -65.4,
    positionZ: -11.0999999999999,
    rotationX: -2.87559265358979,
    rotationY: 3.09592653589793,
    rotationZ: -2.9259265358979,
    scaleX: 3,
    scaleY: 3,
    scaleZ: 3,
    twistFrequencyX: 0.0590000000000002,
    twistFrequencyY: 0.32,
    twistFrequencyZ: -0.397,
    twistPowerX: 3.63,
    twistPowerY: 0.44,
    twistPowerZ: 5.99,
    glowAmount: 3.86,
    glowPower: 0.923,
    glowRamp: 1,
    lineThickness: 0,
    lineAmount: 0,
    lineDerivativePower: 0
  },
};
