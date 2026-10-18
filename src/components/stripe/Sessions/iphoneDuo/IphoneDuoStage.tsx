"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PhoneScreen } from "./PhoneScreen";
import { DEVICE, screenLayout, type ScreenLayout } from "./geometry";
import "./iphone-duo.css";

const MODEL_URL = "/sites/iphone-duo/iphone-duo.glb";

function supportsWebGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * The homepage's iPhone Duo: the 3D device (three.js, loaded when the section is within 800px of the
 * viewport) with the live usage-meter preview on its inner display. Without WebGL the same screen is
 * shown flat in a device-shaped frame.
 */
export function IphoneDuoStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<ScreenLayout | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "flat">("idle");
  const [flatScale, setFlatScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: import("./IphoneDuoRenderer").IphoneDuoRenderer | null = null;
    let current: ScreenLayout | null = null;
    let intersecting = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const next = screenLayout(rect.width);
      if (!current || current.width !== next.width || current.orientation !== next.orientation) {
        current = next;
        setLayout(next);
      }
      setFlatScale(Math.min(1, (rect.width * 0.92) / next.width, (rect.height * 0.92) / next.height));
      renderer?.setSize(rect.width, rect.height, next);
    };
    const syncPaused = () => renderer?.setPaused(!intersecting || document.hidden);
    const syncMotion = () => {
      if (renderer) renderer.reducedMotion = reduced.matches;
    };
    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      renderer?.setScrollOffset((rect.top + rect.height / 2 - vh / 2) / vh);
    };
    const onPointer = (e: PointerEvent) => {
      if (!renderer || !finePointer.matches) return;
      // Hold still under the cursor while the visitor uses the screen.
      if (screenEl.contains(e.target as Node)) return renderer.setPointer(null, null);
      const rect = host.getBoundingClientRect();
      renderer.setPointer(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onLeave = () => renderer?.setPointer(null, null);

    const screenEl = document.createElement("div");
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    measure();

    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        syncPaused();
      },
      { rootMargin: "100px" },
    );
    io.observe(host);

    const lazy = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        lazy.disconnect();
        if (!supportsWebGL()) {
          setStatus("flat");
          return;
        }
        import("./IphoneDuoRenderer")
          .then(({ IphoneDuoRenderer }) => {
            if (disposed) return;
            try {
              renderer = new IphoneDuoRenderer(host, {
                modelUrl: MODEL_URL,
                screen: screenEl,
                onReady: () => !disposed && setStatus("ready"),
                onError: () => {
                  if (disposed) return;
                  renderer?.dispose();
                  renderer = null;
                  setStatus("flat");
                },
              });
            } catch {
              setStatus("flat");
              return;
            }
            syncMotion();
            setScreen(screenEl);
            measure();
            onScroll();
            syncPaused();
          })
          .catch(() => !disposed && setStatus("flat"));
      },
      { rootMargin: "800px" },
    );
    lazy.observe(host);

    document.addEventListener("visibilitychange", syncPaused);
    reduced.addEventListener("change", syncMotion);
    window.addEventListener("scroll", onScroll, { passive: true });
    host.addEventListener("pointermove", onPointer);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      ro.disconnect();
      io.disconnect();
      lazy.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
      reduced.removeEventListener("change", syncMotion);
      window.removeEventListener("scroll", onScroll);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="iphone-duo"
      data-status={status}
      data-orientation={layout?.orientation}
      role="group"
      aria-label="iPhone Duo showing an interactive usage meter"
    >
      {status !== "flat" && screen && layout && createPortal(<PhoneScreen layout={layout} />, screen)}
      {status === "flat" && layout && (
        <div className="iphone-duo__flat">
          <div className="iphone-duo__screen" style={{
              width: layout.width,
              height: layout.height,
              borderRadius: DEVICE.screen.radius * layout.unit,
              transform: `scale(${flatScale})`,
            }}>
            <PhoneScreen layout={layout} />
          </div>
        </div>
      )}
    </div>
  );
}
