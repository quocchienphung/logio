/*
 * iPhone Duo measurements in world units (the baked model: unfolded, centred, 1 unit = 1 cm).
 * Display: mesh UXtsBZYlaUvHoEh (15.7987 x 11.1035 at z 0.2495, corner radius 0.897 measured from
 * its outline). Status cluster: the Apple HIG inner-screen launcher (time over the Wi-Fi/battery
 * ring), its glyph cut from the lock-screen overlay (scripts/iphone-duo/README.md).
 */
export const DEVICE = {
  width: 16.613,
  height: 11.84,
  screen: { cx: 0, cy: 0, z: 0.2495, width: 15.7987, height: 11.1035, radius: 0.897 },
  status: {
    /** Centre of "9:41" from the screen's top-right corner. */
    time: { right: 0.815, top: 0.736, size: 0.262 },
    /** Centre of the Wi-Fi + battery ring and its glyph box (86px ring + 2px padding at 2048px/15.8 units). */
    ring: { right: 0.806, top: 1.357, size: 0.694 },
  },
} as const;

export interface ScreenLayout {
  /** CSS px of the DOM screen. */
  width: number;
  height: number;
  /** CSS px per world unit on the screen. */
  unit: number;
}

/**
 * The unfolded display as a 660 x 464 CSS px screen: at the showcase's ≈740–790 px device width it is
 * drawn at ≈1.0–1.1x, so the Agent Steering card keeps its reference type sizes.
 */
export function screenLayout(width = 660): ScreenLayout {
  return { width, height: (width * DEVICE.screen.height) / DEVICE.screen.width, unit: width / DEVICE.screen.width };
}
