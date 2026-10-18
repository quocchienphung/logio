"use client";

import type { CSSProperties } from "react";
import { UsageMeterStage } from "@/components/sites/affectui-usage-meter/UsageMeterStage";
import { DEVICE, type ScreenLayout } from "./geometry";

/**
 * The iPhone Duo inner display as DOM: the system status cluster (time over the Wi-Fi/battery ring,
 * at the positions of Apple's inner-screen layout) on top of the affectUI usage-meter preview.
 * Sizes are in world units times `layout.unit`, so the status bar keeps its physical size in both
 * orientations.
 */
export function PhoneScreen({ layout }: { layout: ScreenLayout }) {
  const u = layout.unit;
  const { time, ring } = DEVICE.status;
  const portrait = layout.orientation === "portrait";
  const ringBottom = (ring.top + ring.size / 2) * u;
  const vars = {
    "--screen-radius": `${DEVICE.screen.radius * u}px`,
    "--status-time-right": `${time.right * u}px`,
    "--status-time-top": `${time.top * u}px`,
    "--status-time-size": `${time.size * u}px`,
    "--status-ring-right": `${ring.right * u}px`,
    "--status-ring-top": `${ring.top * u}px`,
    "--status-ring-size": `${ring.size * u}px`,
    // Stage switches: a column under the status ring (landscape) or a row level with the time (portrait).
    "--um-tools-top": portrait ? `${time.top * u - 16}px` : `${ringBottom + 16}px`,
    "--um-tools-right": portrait ? "auto" : `${ring.right * u - 16}px`,
    "--um-tools-left": portrait ? `${ring.right * u - 16}px` : "auto",
    "--um-stage-pad": portrait ? `${ringBottom + 14}px 16px 16px` : "48px 32px",
  } as CSSProperties;

  return (
    <div className="phone-screen" data-orientation={layout.orientation} style={vars}>
      <UsageMeterStage
        layout={portrait ? "row" : "column"}
        className="phone-screen__stage"
        overlay={
          <div className="phone-status" aria-hidden="true">
            <span className="phone-status__time">9:41</span>
            <span className="phone-status__ring" />
          </div>
        }
      />
    </div>
  );
}
