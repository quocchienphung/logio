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
  orientation: "landscape" | "portrait";
  /** CSS px of the DOM screen. */
  width: number;
  height: number;
  /** CSS px per world unit on the screen. */
  unit: number;
}

/** Landscape (unfolded, as shipped) on wide stages; a quarter turn to portrait on narrow ones. */
export function screenLayout(stageWidth: number): ScreenLayout {
  const { width, height } = DEVICE.screen;
  if (stageWidth >= 880) {
    const w = 1000;
    return { orientation: "landscape", width: w, height: (w * height) / width, unit: w / width };
  }
  const w = stageWidth >= 560 ? 480 : 360;
  return { orientation: "portrait", width: w, height: (w * width) / height, unit: w / height };
}
