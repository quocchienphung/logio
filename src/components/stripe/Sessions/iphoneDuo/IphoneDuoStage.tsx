"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PhoneScreen } from "./PhoneScreen";
import { DEVICE, screenLayout } from "./geometry";
import "./iphone-duo.css";

const MODEL_URL = "/sites/iphone-duo/iphone-duo.glb";
/** The display is always the same 660 x 464 px screen; only its rendered size follows the stage. */
const LAYOUT = screenLayout();

function supportsWebGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export interface IphoneDuoStageProps {
  /** The app on the inner display (live DOM, laid out on a 660 x 464 px screen). */
  children: ReactNode;
  theme?: "light" | "dark";
  /** False keeps the screen visible but out of reach (e.g. too small to use: tap-to-expand instead). */
  interactive?: boolean;
  onReady?: () => void;
}

/**
 * The iPhone Duo, unfolded and front-facing: the 3D device (three.js, loaded when the section is within
 * 800px of the viewport) with live DOM on its inner display through CSS3D. The device never moves; it
 * is redrawn only when the stage is resized. Without WebGL the same screen is shown flat in a frame.
 */
export function IphoneDuoStage({ children, theme = "light", interactive = true, onReady }: IphoneDuoStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "flat">("idle");
  const [flatScale, setFlatScale] = useState(1);
  const layout = LAYOUT;

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: import("./IphoneDuoRenderer").IphoneDuoRenderer | null = null;
    const screenEl = document.createElement("div");

    const measure = () => {
      const rect = host.getBoundingClientRect();
      setFlatScale(Math.min(1, (rect.width * 0.9) / LAYOUT.width, (rect.height * 0.9) / LAYOUT.height));
      renderer?.setSize(rect.width, rect.height, LAYOUT);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    measure();

    const lazy = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        lazy.disconnect();
        if (!supportsWebGL()) {
          setStatus("flat");
          readyRef.current?.();
          return;
        }
        import("./IphoneDuoRenderer")
          .then(({ IphoneDuoRenderer }) => {
            if (disposed) return;
            try {
              renderer = new IphoneDuoRenderer(host, {
                modelUrl: MODEL_URL,
                screen: screenEl,
                onReady: () => {
                  if (disposed) return;
                  setStatus("ready");
                  readyRef.current?.();
                },
                onError: () => {
                  if (disposed) return;
                  renderer?.dispose();
                  renderer = null;
                  setScreen(null);
                  setStatus("flat");
                  readyRef.current?.();
                },
              });
            } catch {
              setStatus("flat");
              return;
            }
            setScreen(screenEl);
            measure();
          })
          .catch(() => !disposed && setStatus("flat"));
      },
      { rootMargin: "800px" },
    );
    lazy.observe(host);

    return () => {
      disposed = true;
      ro.disconnect();
      lazy.disconnect();
      renderer?.dispose();
    };
  }, []);

  const content = (
    <PhoneScreen layout={layout} theme={theme}>
      {children}
    </PhoneScreen>
  );

  return (
    <div
      ref={hostRef}
      className="iphone-duo"
      data-status={status}
      data-interactive={interactive ? undefined : "false"}
      role="group"
      aria-label="iPhone Duo showing an interactive Agent Steering demo"
    >
      {status !== "flat" && screen && createPortal(content, screen)}
      {status === "flat" && (
        <div className="iphone-duo__flat">
          <div
            className="iphone-duo__screen"
            style={{
              width: layout.width,
              height: layout.height,
              borderRadius: DEVICE.screen.radius * layout.unit,
              transform: `scale(${flatScale})`,
            }}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
