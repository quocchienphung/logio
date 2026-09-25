// BackgroundGlobe — v1-BackgroundGlobe-LNU5QBWB.js → v1-chunk-DXFM6YSX.js (+ Globe, see globe/LegacyGlobe.ts).
// The globe module is imported when the section two before the globe's section enters the viewport
// (threshold 0.001, once) or when the globe itself does. The reference starts playing on that early
// trigger too; here the render loop only runs while the globe itself is on screen (paused offscreen).
import type { Controller } from "../types";
import type { GlobeConfig, LegacyGlobe } from "./globe/LegacyGlobe";
import { disableAmbientAnimations, scrollObserver, v1Html } from "./util";

export const BackgroundGlobe: Controller = (el) => {
  let config: GlobeConfig = {};
  if (el.dataset.jsGlobeConfig) {
    try {
      const parsed: unknown = JSON.parse(el.dataset.jsGlobeConfig);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed as GlobeConfig;
    } catch {
      // invalid config: the reference warns and continues with defaults
    }
  }
  const section = el.closest(".Section");
  const triggerPoint = section?.previousElementSibling?.previousElementSibling ?? el;
  let globe: LegacyGlobe | null = null;
  let loading: Promise<void> | null = null;
  let disposed = false;
  let visible = false;

  const importGlobe = (): Promise<void> => {
    if (loading) return loading;
    loading = (async () => {
      const node = el.querySelector<HTMLElement>(".js-globe");
      if (!node) return;
      const { LegacyGlobe } = await import("./globe/LegacyGlobe");
      if (disposed) return;
      const g = new LegacyGlobe(node, config, { isStatic: disableAmbientAnimations(), dragClassTarget: v1Html(el) ?? document.documentElement });
      if (!g.load()) return;
      const list = el.dataset.jsCountryList;
      if (list) g.setCountryList(list.split(","));
      globe = g;
    })().catch(() => {});
    return loading;
  };

  const stopTrigger = scrollObserver(triggerPoint, { threshold: 0.001, onlyOnce: true }, () => {
    void importGlobe();
  });
  const stopPlayPause = scrollObserver(
    el,
    { threshold: 0.001 },
    () => {
      visible = true;
      void importGlobe().then(() => {
        if (visible && !document.hidden) globe?.play();
      });
    },
    () => {
      visible = false;
      globe?.pause();
    },
  );
  const onVisibility = () => {
    if (document.hidden) globe?.pause();
    else if (visible) globe?.play();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    disposed = true;
    stopTrigger();
    stopPlayPause();
    document.removeEventListener("visibilitychange", onVisibility);
    globe?.dispose();
    globe = null;
  };
};
