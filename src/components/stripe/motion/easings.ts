// Cubic-bezier easings used by the reference timelines (bundle module 93326).
export const EASE = {
  easeLinear: [0, 0, 1, 1],
  easeInSine: [0.47, 0, 0.75, 0.72],
  easeOutSine: [0.39, 0.58, 0.57, 1],
  easeInOutSine: [0.45, 0.05, 0.55, 0.95],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInCubic: [0.55, 0.06, 0.68, 0.19],
  easeOutCubic: [0.22, 0.61, 0.36, 1],
  easeInOutCubic: [0.65, 0.05, 0.36, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeInOutQuart: [0.78, 0, 0.22, 1],
  easeInOutQuint: [0.86, 0, 0.07, 1],
  easeOutQuadratic: [0.25, 0.46, 0.45, 0.94],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeSwift: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
