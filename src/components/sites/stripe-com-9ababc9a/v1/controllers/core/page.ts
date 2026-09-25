// Page-wide behaviours of the reference "Page" controller (v1-chunk-XMLK457N.js), which the reference
// mounts on <html data-js-controller="Page">. The generated pages render <html>/<body> as
// `.MktRoot` / `.MktBody` inside `.v1-root` and drop that controller attribute, so the registry never
// sees it; the core group mounts these behaviours once per `.v1-root` from the Gradient controller
// (present on all 14 legacy pages). Ported:
//  - Tab keydown → `keyboard-navigation` on the body (CSS `.keyboard-navigation … :focus` rings);
//    any mousedown removes it.
//  - Escape keydown → `escape:keydown` CustomEvent dispatched on document.body (dropdown/select
//    controllers listen for it there).
//  - Scrollbar detection → `has-scrollbar` on the body and `--scrollbarWidth` on the html element,
//    re-measured when the body resizes (min 5px, max 17px).
//  - iOS ≥ 16 orientation-change relayout nudge (body `display: flow-root` for one frame).
// Not ported: analytics/page tracking, experiment exposure, `__` query-param propagation, and the
// `data-loading` flag removal (the generated markup never carries `data-loading`).
import { v1Body, v1Html } from "./util";

const SCROLLBAR_MIN = 5;
const SCROLLBAR_MAX = 17;
const IOS_FIX_VERSION = 16;

function needsIosFix(): boolean {
  const ua = navigator.userAgent;
  const iphone = /iPhone OS (\d+)/.exec(ua);
  if (iphone) return parseInt(iphone[1], 10) >= IOS_FIX_VERSION;
  const safari = /like Gecko\) Version\/(\d+)/.exec(ua);
  return safari ? parseInt(safari[1], 10) >= IOS_FIX_VERSION : false;
}

function mountPage(root: HTMLElement): () => void {
  const body = v1Body(root) ?? root;
  const html = v1Html(root) ?? root;

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Tab") body.classList.add("keyboard-navigation");
    else if (e.key === "Escape") document.body.dispatchEvent(new CustomEvent("escape:keydown"));
  };
  const handleMouseDown = () => body.classList.remove("keyboard-navigation");

  const detectScrollbars = () => {
    const diff = window.innerWidth - document.body.clientWidth;
    if (diff > SCROLLBAR_MIN) {
      body.classList.add("has-scrollbar");
      html.style.setProperty("--scrollbarWidth", `${Math.min(SCROLLBAR_MAX, diff)}px`);
    } else {
      html.style.setProperty("--scrollbarWidth", "0px");
      body.classList.remove("has-scrollbar");
    }
  };

  let orientationRaf = 0;
  const handleOrientationChange = () => {
    document.body.style.display = "flow-root";
    orientationRaf = requestAnimationFrame(() => {
      document.body.style.display = "";
    });
  };
  const iosFix = needsIosFix();
  const orientationTarget: EventTarget | null = iosFix ? (screen.orientation ?? window) : null;
  const orientationEvent = screen.orientation ? "change" : "orientationchange";

  document.body.addEventListener("keydown", handleKeydown);
  document.body.addEventListener("mousedown", handleMouseDown);
  orientationTarget?.addEventListener(orientationEvent, handleOrientationChange);
  detectScrollbars();
  const ro = new ResizeObserver(detectScrollbars);
  ro.observe(document.body);

  return () => {
    document.body.removeEventListener("keydown", handleKeydown);
    document.body.removeEventListener("mousedown", handleMouseDown);
    orientationTarget?.removeEventListener(orientationEvent, handleOrientationChange);
    cancelAnimationFrame(orientationRaf);
    ro.disconnect();
    body.classList.remove("keyboard-navigation", "has-scrollbar");
    html.style.removeProperty("--scrollbarWidth");
  };
}

const mounted = new WeakMap<HTMLElement, { count: number; cleanup: () => void }>();

/** Mounts the page behaviours for the `.v1-root` containing `el` (ref-counted, once per root). */
export function mountPageBehaviours(el: HTMLElement): () => void {
  const root = el.closest<HTMLElement>(".v1-root");
  if (!root) return () => {};
  let entry = mounted.get(root);
  if (!entry) {
    entry = { count: 0, cleanup: mountPage(root) };
    mounted.set(root, entry);
  }
  entry.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const e = mounted.get(root);
    if (!e) return;
    e.count -= 1;
    if (e.count <= 0) {
      e.cleanup();
      mounted.delete(root);
    }
  };
}
