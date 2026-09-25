// DomGraphic runtime (reference module 8470, chunk 61541). A DomGraphic lays its content out at a fixed
// "source" size and scales it to the measured width: --graphic-scale = min(1, width / sourceWidth).
// Source dimensions switch per breakpoint when mobile/tablet sizes are given. The server render
// assumes the mobile breakpoint, so the client must re-apply the desktop/tablet source size.
// Once measured, data-status flips "measuring" -> "ready" and a bubbling "domgraphicready" event fires.

import { type Cleanup, combine, getBreakpoint, observeResize, onBreakpointChange } from "./runtime";

export const DOM_GRAPHIC_READY = "domgraphicready";

export interface DomGraphicDims {
  width: number;
  height: number;
  mobileWidth?: number;
  mobileHeight?: number;
  tabletWidth?: number;
  tabletHeight?: number;
  /** number = px cap (min with the source width); string = raw CSS value. */
  maxWidth?: number | string;
}

/** Reads the server-rendered source size (used when the page gives no per-breakpoint dims). */
function readSsrDims(el: HTMLElement): DomGraphicDims | null {
  const w = parseFloat(el.style.getPropertyValue("--graphic-source-width"));
  const h = parseFloat(el.style.getPropertyValue("--graphic-source-height"));
  return w > 0 && h > 0 ? { width: w, height: h } : null;
}

export function mountDomGraphic(el: HTMLElement, dims?: DomGraphicDims): Cleanup {
  const base = dims ?? readSsrDims(el);
  if (!base) return () => {};
  let measured: number | undefined;
  let announced = false;

  const source = () => {
    const bp = getBreakpoint();
    if (bp === "mobile" && base.mobileWidth && base.mobileHeight) return { width: base.mobileWidth, height: base.mobileHeight };
    if (bp === "tablet" && base.tabletWidth && base.tabletHeight) return { width: base.tabletWidth, height: base.tabletHeight };
    return { width: base.width, height: base.height };
  };

  const apply = () => {
    const src = source();
    const maxWidth =
      typeof base.maxWidth === "number" ? `${Math.min(base.maxWidth, src.width)}px` : base.maxWidth || `${src.width}px`;
    const scale = measured ? Math.min(1, measured / src.width) : 1;
    el.style.setProperty("--graphic-source-width", `${src.width}px`);
    el.style.setProperty("--graphic-source-height", `${src.height}px`);
    el.style.setProperty("--graphic-aspect-ratio", `${src.width} / ${src.height}`);
    el.style.setProperty("--graphic-scale", String(scale));
    el.style.setProperty("--graphic-max-width", maxWidth);
    const ready = measured !== undefined && measured > 0;
    el.dataset.status = ready ? "ready" : "measuring";
    if (ready && !announced) {
      announced = true;
      el.dispatchEvent(new CustomEvent(DOM_GRAPHIC_READY, { bubbles: true }));
    }
  };

  // Layout-effect measurement (rounded), then a throttled ResizeObserver (resizeMode "throttle", 500ms).
  const rect = el.getBoundingClientRect();
  if (rect.width > 0) measured = Math.round(rect.width);
  apply();
  return combine([
    observeResize(
      el,
      ({ width }) => {
        if (width !== measured) {
          measured = width;
          apply();
        }
      },
      { delay: 500, mode: "throttle" },
    ),
    onBreakpointChange(apply),
  ]);
}

/** Mounts every `.dom-graphic` under `root`; `dimsFor` supplies per-graphic props the SSR lost. */
export function mountDomGraphics(root: ParentNode, dimsFor?: (el: HTMLElement) => DomGraphicDims | undefined): Cleanup {
  return combine(Array.from(root.querySelectorAll<HTMLElement>(".dom-graphic")).map((el) => mountDomGraphic(el, dimsFor?.(el))));
}
