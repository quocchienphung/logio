// RevRecReportsGraphic — port of v1-ReportsGraphic-6D5WKAVX.js (the same logic is
// DataPipelineBusinessTeamsCarousel, v1-BusinessTeamsCarousel-TH32KAFM.js). A SegmentedControl click
// moves the child Track (v1-chunk-RKQAIDWX.js: sets --currentIndex) to the clicked report.
import type { Controller } from "../types";
import { childControllers, getApi, listen } from "../lib";

interface TrackLike {
  index: number;
}

/** Sets the child Track's index through its port (core group), or its CSS variable directly. */
export function setTrackIndex(root: Element, index: number): void {
  const node = childControllers(root, "Track")[0];
  if (!node) return;
  const api = getApi<TrackLike>(node, "Track");
  if (api) api.index = index;
  else node.style.setProperty("--currentIndex", String(index));
}

export const segmentedTrack: Controller = (el) => {
  let previous = 0;
  return listen(el, "SegmentedControl:buttonClicked", (ev) => {
    const index = (ev as CustomEvent<{ index: number }>).detail?.index;
    if (typeof index !== "number" || index === previous) return;
    previous = index;
    setTrackIndex(el, index);
  });
};

export const RevRecReportsGraphic: Controller = segmentedTrack;
