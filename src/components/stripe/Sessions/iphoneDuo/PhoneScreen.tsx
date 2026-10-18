"use client";

import type { CSSProperties, ReactNode } from "react";
import { DEVICE, type ScreenLayout } from "./geometry";

/**
 * The iPhone Duo inner display as DOM: the system status cluster (time over the Wi-Fi/battery ring, at
 * the positions of Apple's inner-screen layout) over the app the screen shows. Sizes are world units
 * times `layout.unit`, so the status bar keeps its physical size. The app gets the status cluster's
 * bottom (`--status-bottom`) and its column (`--status-column`) to lay its own chrome out around it.
 */
export function PhoneScreen({ layout, theme = "light", children }: { layout: ScreenLayout; theme?: "light" | "dark"; children: ReactNode }) {
  const u = layout.unit;
  const { time, ring } = DEVICE.status;
  const vars = {
    "--screen-radius": `${DEVICE.screen.radius * u}px`,
    "--status-time-right": `${time.right * u}px`,
    "--status-time-top": `${time.top * u}px`,
    "--status-time-size": `${time.size * u}px`,
    "--status-ring-right": `${ring.right * u}px`,
    "--status-ring-top": `${ring.top * u}px`,
    "--status-ring-size": `${ring.size * u}px`,
    "--status-bottom": `${(ring.top + ring.size / 2) * u}px`,
    "--status-column": `${ring.right * u}px`,
  } as CSSProperties;

  return (
    <div className="phone-screen" data-theme={theme} style={vars}>
      {children}
      <div className="phone-status" aria-hidden="true">
        <span className="phone-status__time">9:41</span>
        <span className="phone-status__ring" />
      </div>
    </div>
  );
}
