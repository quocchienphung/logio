// Billing platform accordion, mobile variant (reference: billing module 39828 `iA` + HDS Dialog,
// module 4242). Below 640 px each accordion item is a button that opens a bottom-sheet dialog with the
// item's graphic and features. The dialog (client-only in the reference) is built from the desktop
// item's markup and portalled to <body>:
//  - status "initial" -> "open" on the next frame, "close" for 250 ms before unmount (floating-ui
//    useTransitionStatus default), CSS transitions do the motion;
//  - Escape, a press outside the sheet, the close button, or swiping the sheet down (snap container
//    scrollTop <= 30) dismiss it; focus moves into the dialog, is trapped, and returns to the trigger;
//  - the snap container starts scrolled to the bottom; without scroll-timeline support the overlay
//    alpha follows the scroll position (0.9 x progress);
//  - growing past 640 px closes it.

import { mountDomGraphics } from "../revenue-shared/domGraphic";
import { Disposer, listen, onMedia, type Cleanup } from "../revenue-shared/env";

const CLOSE_MS = 250; // floating-ui useTransitionStatus default duration

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

let uid = 0;
function reId(tree: HTMLElement, suffix: string) {
  const map = new Map<string, string>();
  tree.querySelectorAll<Element>("[id]").forEach((n) => {
    const nid = `${n.id}${suffix}`;
    map.set(n.id, nid);
    n.id = nid;
  });
  if (!map.size) return;
  const ARIA = ["aria-labelledby", "aria-describedby", "aria-controls"];
  tree.querySelectorAll<Element>("*").forEach((n) => {
    for (const attr of Array.from(n.attributes)) {
      let v = attr.value;
      if (v.includes("url(#")) for (const [from, to] of map) v = v.split(`url(#${from})`).join(`url(#${to})`);
      else if (ARIA.includes(attr.name))
        v = v
          .split(" ")
          .map((t) => map.get(t) ?? t)
          .join(" ");
      if (v !== attr.value) n.setAttribute(attr.name, v);
    }
  });
}

function buildDialog(details: HTMLDetailsElement): { overlay: HTMLElement; dialog: HTMLElement; snap: HTMLElement; close: HTMLButtonElement } {
  const id = `billing-accordion-dialog-${++uid}`;
  const overlay = document.createElement("div");
  overlay.className = "hds-dialog__overlay billing-accordion-dialog-overlay";
  overlay.dataset.status = "initial";
  const snap = document.createElement("div");
  snap.className = "hds-dialog__snap-container";
  const spacer = document.createElement("div");
  spacer.className = "hds-dialog__snap-spacer";
  const snapContent = document.createElement("div");
  snapContent.className = "hds-dialog__snap-content";
  const dialog = document.createElement("div");
  dialog.className = "hds-dialog billing-accordion-dialog";
  dialog.style.height = "fit-content";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  dialog.tabIndex = -1;
  dialog.dataset.status = "initial";

  const inner = document.createElement("div");
  inner.className = "hds-dialog__inner-content";
  inner.innerHTML =
    '<div class="hds-dialog__drag-icon-container-blur"><span class="hds-dialog__drag-icon">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="4" fill="none"><rect width="32" height="4" fill="#dcdcdc" rx="2"></rect></svg>' +
    "</span></div>";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "hds-ui-button hds-dialog__close-button hds-ui-button--quiet";
  close.setAttribute("aria-label", "Close dialog");
  close.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="currentColor">' +
    '<path d="m8.002 7.266 4.236-4.234 1.238 1.237-4.237 4.234 4.233 4.232-1.238 1.237-4.232-4.231-4.236 4.236-1.238-1.237 4.237-4.237-4.24-4.239 1.237-1.237 4.24 4.24Z"></path></svg>';
  inner.appendChild(close);

  const content = document.createElement("div");
  content.className = "billing-accordion-dialog-content";
  const header = document.createElement("div");
  header.className = "billing-accordion-dialog-content__header";
  const icon = document.createElement("div");
  icon.className = "billing-accordion-dialog-content__header-icon";
  const srcIcon = details.querySelector(":scope > summary .charm-icon");
  if (srcIcon) icon.appendChild(srcIcon.cloneNode(true));
  const h3 = document.createElement("h3");
  h3.className = "hds-heading hds-heading--sm";
  h3.id = `${id}-title`;
  h3.textContent = details.querySelector(".billing-accordion-summary__text")?.textContent ?? "";
  header.append(icon, h3);
  const graphic = document.createElement("div");
  graphic.className = "billing-accordion-dialog-content__graphic";
  const srcGraphic = details.querySelector(".billing-accordion-content__graphic");
  if (srcGraphic) for (const c of Array.from(srcGraphic.children)) graphic.appendChild(c.cloneNode(true));
  const features = document.createElement("div");
  features.className = "billing-accordion-dialog-features";
  const srcFeatures = details.querySelector(".billing-accordion-content > .columns");
  if (srcFeatures) features.appendChild(srcFeatures.cloneNode(true));
  content.append(header, graphic, features);
  inner.appendChild(content);
  reId(inner, `-${id}`);

  dialog.appendChild(inner);
  snapContent.appendChild(dialog);
  snap.append(spacer, snapContent);
  overlay.appendChild(snap);
  return { overlay, dialog, snap, close };
}

export function mountBillingAccordionDialogs(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>(".billing-accordion-mobile-trigger"));
  const items = Array.from(root.querySelectorAll<HTMLDetailsElement>(".billing-accordion-desktop .billing-accordion-details"));
  let openClose: (() => void) | null = null;

  triggers.forEach((trigger, i) => {
    const details = items[i];
    if (!details) return;
    trigger.setAttribute("aria-haspopup", "dialog");
    d.add(
      listen(trigger, "click", () => {
        if (openClose) return;
        const { overlay, dialog, snap, close } = buildDialog(details);
        const inner = new Disposer();
        document.body.appendChild(overlay);
        inner.add(mountDomGraphics(overlay));
        let closing = false;
        let raf = requestAnimationFrame(() => {
          overlay.dataset.status = "open";
          dialog.dataset.status = "open";
        });
        snap.scrollTo({ top: snap.scrollHeight, behavior: "auto" });
        const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => !n.closest("[inert]"));
        (focusables()[0] ?? dialog).focus({ preventScroll: true });

        const dismiss = () => {
          if (closing) return;
          closing = true;
          overlay.dataset.status = "close";
          dialog.dataset.status = "close";
          window.setTimeout(() => {
            cancelAnimationFrame(raf);
            inner.run();
            overlay.remove();
            openClose = null;
            if (document.contains(trigger)) trigger.focus({ preventScroll: true });
          }, CLOSE_MS);
        };
        openClose = dismiss;
        inner.add(listen(close, "click", dismiss));
        inner.add(
          listen<KeyboardEvent>(document, "keydown", (e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              dismiss();
              return;
            }
            if (e.key !== "Tab") return;
            const f = focusables();
            if (!f.length) return;
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            } else if (!dialog.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }),
        );
        inner.add(
          listen<MouseEvent>(document, "mousedown", (e) => {
            if (e.target instanceof Node && !dialog.contains(e.target)) dismiss();
          }),
        );
        const hasTimeline = "ScrollTimeline" in window;
        inner.add(
          listen(snap, "scroll", () => {
            if (!hasTimeline) {
              const range = snap.scrollHeight - snap.clientHeight;
              const t = range > 0 ? Math.max(0, Math.min(1, snap.scrollTop / range)) : 1;
              overlay.style.setProperty("--hds-overlay-alpha", String(0.9 * t));
            }
            if (snap.scrollTop <= 30) dismiss();
          }),
        );
        inner.add(() => {
          cancelAnimationFrame(raf);
          raf = 0;
        });
      }),
    );
  });
  // Reference: `useMediaQuery("(min-width: 640px)")` closes the dialog on wider viewports.
  d.add(
    onMedia("(min-width: 640px)", (wide) => {
      if (wide) openClose?.();
    }),
  );
  d.add(() => {
    openClose?.();
    document.querySelectorAll(".billing-accordion-dialog-overlay").forEach((n) => n.remove());
  });
  return () => d.run();
}
