"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./storage-controls.css";

type StorageButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

function MorphLabel({ children }: { children: ReactNode }) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <motion.span className="stg-label-slot" animate={{ width }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 35 }}>
    <span ref={measureRef} className="stg-label-content">{children}</span>
  </motion.span>;
}

export function StorageButton({ variant = "primary", size = "md", loading = false, className = "", children, onClick, ...props }: StorageButtonProps) {
  return <button {...props} type={props.type ?? "button"} disabled={props.disabled && !loading} className={`stg-button stg-button--${variant} stg-button--${size} ${className}`} aria-busy={loading || undefined} aria-disabled={loading || props.disabled || undefined} onClick={event => { if (!loading && !props.disabled) onClick?.(event); }}>
    {loading && <LoaderCircle className="stg-spin" size={16} aria-hidden="true" />}
    <MorphLabel>{children}</MorphLabel>
  </button>;
}

export function StorageActionButton({ action, children, pendingLabel = "Processing", successLabel = "Done", onError, ...props }: Omit<StorageButtonProps, "onClick" | "loading"> & { action: () => Promise<void> | void; pendingLabel?: string; successLabel?: string; onError?: (error: unknown) => void }) {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reset.current) clearTimeout(reset.current); }, []);
  async function run() {
    if (state === "pending") return;
    if (reset.current) clearTimeout(reset.current);
    setState("pending");
    try { await action(); setState("success"); }
    catch (error) { setState("error"); onError?.(error); }
    reset.current = setTimeout(() => setState("idle"), 1800);
  }
  return <StorageButton {...props} loading={state === "pending"} onClick={() => void run()} data-state={state}>
    {state === "success" ? <><StorageIconMorph state="check" />{successLabel}</> : state === "error" ? <><X size={16} />Try again</> : state === "pending" ? pendingLabel : children}
  </StorageButton>;
}

export type StorageControlAction = { id: string; label: string; icon?: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; pressed?: boolean; iconOnly?: boolean; separatorBefore?: boolean };

export function StorageSplitButton({ children, onClick, actions, disabled = false }: { children: ReactNode; onClick: () => void; actions: StorageControlAction[]; disabled?: boolean }) {
  const id = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = Math.min(256, window.innerWidth - 24);
    const menuHeight = actions.length * 40 + 12;
    setPosition({ left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)), top: rect.bottom + menuHeight + 8 < window.innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - menuHeight - 8) });
  }
  useEffect(() => {
    if (!open) return;
    const close = () => menuRef.current?.hidePopover();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);
  return <div className="stg-split">
    <StorageButton disabled={disabled} onClick={onClick}>{children}</StorageButton>
    <button ref={triggerRef} type="button" className="stg-split-trigger" aria-label="More upload actions" aria-haspopup="menu" aria-expanded={open} disabled={disabled} popoverTarget={id} onClick={place} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); place(); menuRef.current?.showPopover(); requestAnimationFrame(() => { const items = menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"); items?.[event.key === "ArrowUp" ? items.length - 1 : 0]?.focus(); }); }
    }}><ChevronDown size={16} className={open ? "stg-chevron-open" : ""} /></button>
    <div ref={menuRef} id={id} popover="auto" role="menu" aria-label="Upload actions" className="stg-control-menu" style={{ top: position.top, left: position.left }} onToggle={event => {
      const isOpen = event.newState === "open";
      setOpen(isOpen);
      if (isOpen) requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
    }} onKeyDown={event => {
      const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[index]?.focus();
      }
      if (event.key === "Escape") triggerRef.current?.focus();
    }}>{actions.map(action => <button key={action.id} type="button" role="menuitem" disabled={action.disabled} data-danger={action.danger || undefined} onClick={() => { menuRef.current?.hidePopover(); triggerRef.current?.focus(); action.onClick(); }}>{action.icon}{action.label}</button>)}</div>
  </div>;
}

export function StorageButtonGroup({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div role="group" aria-label={label} className={`stg-button-group ${className}`}>{children}</div>;
}

export function StorageFloatingButtonGroup({ label, actions, className = "", orientation = "horizontal", appearance = "muted" }: { label: string; actions: StorageControlAction[]; className?: string; orientation?: "horizontal" | "vertical"; appearance?: "muted" | "raised" }) {
  return <div role="toolbar" aria-label={label} aria-orientation={orientation} data-appearance={appearance} className={`stg-floating-group ${className}`} onKeyDown={event => {
    const previous = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    if (![previous, next, "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();
    buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === next ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  }}>{actions.map(action => <button key={action.id} type="button" aria-label={action.label} title={action.label} aria-pressed={action.pressed} disabled={action.disabled} data-danger={action.danger || undefined} data-icon-only={action.iconOnly || undefined} data-separator={action.separatorBefore || undefined} onClick={action.onClick}>{action.icon}{!action.iconOnly && <span>{action.label}</span>}</button>)}</div>;
}

export function StorageExpandingButtonGroup({ label, actions, className = "" }: { label: string; actions: StorageControlAction[]; className?: string }) {
  const [active, setActive] = useState(actions[0]?.id);
  const reduced = useReducedMotion();
  return <div role="group" aria-label={label} className={`stg-expanding-group ${className}`} onMouseLeave={() => setActive(actions[0]?.id)}>{actions.map(action => <motion.button key={action.id} type="button" aria-label={action.label} title={action.label} disabled={action.disabled} data-active={active === action.id || undefined} data-danger={action.danger || undefined} onPointerEnter={event => { if (event.pointerType === "mouse") setActive(action.id); }} onFocus={() => setActive(action.id)} onClick={action.onClick}>
    {action.icon}<motion.span initial={false} animate={{ width: active === action.id ? "auto" : 0, opacity: active === action.id ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}><span>{action.label}</span></motion.span>
  </motion.button>)}</div>;
}

type MorphIconState = "plus" | "check" | "menu" | "close" | "chevron-down" | "chevron-up" | "play" | "pause" | "copy" | "copied" | "sun" | "moon" | "bell" | "bell-off" | "heart" | "heart-filled";
export function StorageIconMorph({ state, size = 16 }: { state: MorphIconState; size?: number }) {
  const reduced = useReducedMotion();
  const id = useId().replaceAll(":", "");
  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 320, damping: 27 };
  const family = ["plus", "check"].includes(state) ? "add" : ["menu", "close"].includes(state) ? "menu" : ["play", "pause"].includes(state) ? "play" : ["copy", "copied"].includes(state) ? "copy" : ["sun", "moon"].includes(state) ? "theme" : state.startsWith("chevron") ? "chevron" : state.startsWith("bell") ? "bell" : "heart";
  const heartPath = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";
  return <span className="stg-icon-morph" style={{ width: size, height: size }} aria-hidden="true"><AnimatePresence initial={false} mode="popLayout"><motion.svg key={family} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .12 }}>
    {family === "add" && <><motion.path initial={false} animate={{ d: state === "check" ? "M20 6.5 L9.5 17" : "M12 5 L12 19" }} transition={transition} /><motion.path initial={false} animate={{ d: state === "check" ? "M4.5 12 L9.5 17" : "M5 12 L19 12" }} transition={transition} /></>}
    {family === "menu" && <><motion.path d="M4 6h16" initial={false} animate={{ y: state === "close" ? 6 : 0, rotate: state === "close" ? 45 : 0 }} transition={transition} style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }} /><motion.path d="M4 12h16" initial={false} animate={{ scaleX: state === "close" ? .2 : 1, opacity: state === "close" ? 0 : 1 }} transition={transition} /><motion.path d="M4 18h16" initial={false} animate={{ y: state === "close" ? -6 : 0, rotate: state === "close" ? -45 : 0 }} transition={transition} style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }} /></>}
    {family === "play" && <><motion.path initial={false} animate={{ d: state === "pause" ? "M6.5 5 L10 5 L10 19 L6.5 19 Z" : "M7 4.5 L12 7.42 L12 16.58 L7 19.5 Z" }} fill="currentColor" strokeWidth="1.5" transition={transition} /><motion.path initial={false} animate={{ d: state === "pause" ? "M14 5 L17.5 5 L17.5 19 L14 19 Z" : "M12 7.42 L19.5 11.8 L19.5 12.2 L12 16.58 Z" }} fill="currentColor" strokeWidth="1.5" transition={transition} /></>}
    {family === "copy" && <><motion.path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" initial={false} animate={{ x: state === "copied" ? 4 : 0, y: state === "copied" ? 4 : 0, opacity: state === "copied" ? 0 : 1 }} transition={transition} /><motion.rect x="8" y="8" width="14" height="14" rx="2" initial={false} animate={{ scale: state === "copied" ? .7 : 1, opacity: state === "copied" ? 0 : 1 }} transition={transition} /><motion.path d="M5 12.5 L9.5 17 L19 7.5" initial={false} animate={{ pathLength: state === "copied" ? 1 : 0, opacity: state === "copied" ? 1 : 0 }} transition={transition} /></>}
    {family === "theme" && <><defs><mask id={`${id}-bite`} maskUnits="userSpaceOnUse" x="-8" y="-8" width="40" height="40"><rect x="-8" y="-8" width="40" height="40" fill="white" stroke="none" /><motion.circle r="6.5" fill="black" stroke="none" initial={false} animate={{ cx: state === "moon" ? 18 : 30, cy: state === "moon" ? 6 : -6 }} transition={transition} /></mask><clipPath id={`${id}-disc`}><motion.circle cx="12" cy="12" initial={false} animate={{ r: state === "moon" ? 8.5 : 4.5 }} transition={transition} /></clipPath></defs><motion.circle cx="12" cy="12" mask={`url(#${id}-bite)`} initial={false} animate={{ r: state === "moon" ? 8.5 : 4.5 }} transition={transition} /><motion.circle r="6.5" clipPath={`url(#${id}-disc)`} initial={false} animate={{ cx: state === "moon" ? 18 : 30, cy: state === "moon" ? 6 : -6 }} transition={transition} /><motion.g initial={false} animate={{ scale: state === "moon" ? .4 : 1, rotate: state === "moon" ? 90 : 0, opacity: state === "moon" ? 0 : 1 }} transition={transition} style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }}>{["M19.5 12 L22 12", "M17.3 17.3 L19.07 19.07", "M12 19.5 L12 22", "M6.7 17.3 L4.93 19.07", "M4.5 12 L2 12", "M6.7 6.7 L4.93 4.93", "M12 4.5 L12 2", "M17.3 6.7 L19.07 4.93"].map(d => <path key={d} d={d} />)}</motion.g></>}
    {family === "chevron" && <motion.path d="M6 9 L12 15 L18 9" initial={false} animate={{ rotate: state === "chevron-up" ? 180 : 0 }} transition={transition} style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }} />}
    {family === "bell" && <><defs><mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="white" stroke="none" /><motion.path d="M3 3 L21 21" stroke="black" strokeWidth="5" initial={false} animate={{ pathLength: state === "bell-off" ? 1 : 0, opacity: state === "bell-off" ? 1 : 0 }} transition={transition} /></mask></defs><g mask={`url(#${id}-cut)`}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></g><motion.path d="M3 3 L21 21" initial={false} animate={{ pathLength: state === "bell-off" ? 1 : 0, opacity: state === "bell-off" ? 1 : 0 }} transition={transition} /></>}
    {family === "heart" && <><motion.path d={heartPath} fill="currentColor" initial={false} animate={{ fillOpacity: state === "heart-filled" ? 1 : 0 }} transition={transition} />{!reduced && state === "heart-filled" && <g stroke="none">{Array.from({ length: 7 }, (_, i) => <motion.circle key={i} cx="12" cy="12" r={i % 2 ? 1 : 1.4} fill="currentColor" initial={{ x: 0, y: 0, scale: .4, opacity: 0 }} animate={{ x: Math.cos(-Math.PI / 2 + i * Math.PI * 2 / 7) * 14, y: Math.sin(-Math.PI / 2 + i * Math.PI * 2 / 7) * 14, scale: [.4, 1, .3], opacity: [0, 1, 0] }} transition={{ duration: .5 }} />)}</g>}</>}
  </motion.svg></AnimatePresence></span>;
}

export function StorageCopyButton({ value, label = "Copy", iconOnly = false, className = "" }: { value: string; label?: string; iconOnly?: boolean; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reset.current) clearTimeout(reset.current); }, []);
  async function copy() {
    if (reset.current) clearTimeout(reset.current);
    try { await navigator.clipboard.writeText(value); setState("copied"); }
    catch { setState("failed"); }
    reset.current = setTimeout(() => setState("idle"), 2000);
  }
  return <><StorageButton variant="secondary" size="sm" className={`stg-copy ${iconOnly ? "stg-copy--icon" : ""} ${className}`} aria-label={state === "idle" ? label : state === "copied" ? `${label}: Copied` : `${label}: Copy failed`} title={label} onClick={() => void copy()}>
    {state === "failed" ? <X size={16} /> : <StorageIconMorph state={state === "copied" ? "copied" : "copy"} />}{!iconOnly && (state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label)}
  </StorageButton><span role="status" className="stg-sr-only">{state === "copied" ? `${label}: Copied` : state === "failed" ? "Copy failed. Check clipboard permission and try again." : ""}</span></>;
}

export function StorageConfirmMorph({ label = "Delete", title = "Delete document?", confirmLabel = "Delete", onConfirm, onUndo, mode = "click", disabled = false, icon, className = "" }: { label?: string; title?: string; confirmLabel?: string; onConfirm: () => Promise<void> | void; onUndo?: () => void; mode?: "click" | "hold" | "countdown"; disabled?: boolean; icon?: ReactNode; className?: string }) {
  const [state, setState] = useState<"idle" | "confirm" | "countdown" | "pending" | "success" | "error">("idle");
  const [seconds, setSeconds] = useState(3);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    if (state !== "confirm" && state !== "error") return;
    confirmRef.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !rootRef.current?.contains(event.target)) { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; setHolding(false); setState("idle"); } };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [state]);
  function clearHold() { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; setHolding(false); }
  function cancel() { clearHold(); setState("idle"); requestAnimationFrame(() => triggerRef.current?.focus()); }
  async function confirm() {
    if (state === "pending") return;
    setState("pending");
    try { await onConfirm(); setState("success"); }
    catch { setState("error"); }
  }
  function startHold() {
    if (timerRef.current || state === "pending") return;
    setHolding(true);
    timerRef.current = setTimeout(() => { timerRef.current = null; setHolding(false); void confirm(); }, 900);
  }
  function startCountdown() {
    setState("countdown"); setSeconds(3);
    let remaining = 3;
    const tick = () => { remaining -= 1; setSeconds(remaining); if (remaining > 0) timerRef.current = setTimeout(tick, 1000); else { timerRef.current = null; void confirm(); } };
    timerRef.current = setTimeout(tick, 1000);
  }
  return <motion.div ref={rootRef} layout className={`stg-confirm ${className}`} data-state={state} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 34 }} onKeyDown={event => { if (event.key === "Escape" && ["confirm", "countdown", "error"].includes(state)) { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
    {state === "idle" ? <button ref={triggerRef} type="button" className="stg-confirm-trigger" disabled={disabled} onClick={() => setState("confirm")}>{icon}{label}</button> : state === "success" ? <><span className="stg-confirm-success" role="status"><StorageIconMorph state="check" />Deleted</span>{onUndo && <button type="button" onClick={() => { onUndo(); setState("idle"); }}>Undo</button>}</> : state === "countdown" ? <><span className="stg-confirm-title">Deleting in <strong>{seconds}</strong></span><button type="button" onClick={cancel}>Cancel</button></> : <>
      <span className="stg-confirm-title">{state === "error" ? "Could not delete. Retry?" : title}</span>
      <button type="button" className="stg-confirm-cancel" disabled={state === "pending"} onClick={cancel}>Cancel</button>
      <button ref={confirmRef} type="button" className="stg-confirm-commit" disabled={state === "pending"} aria-busy={state === "pending" || undefined} aria-label={mode === "hold" ? `Press and hold: ${confirmLabel}` : confirmLabel} data-holding={holding || undefined} onPointerDown={event => { if (mode === "hold" && event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); startHold(); } }} onPointerUp={() => { if (mode === "hold") clearHold(); }} onPointerCancel={() => { if (mode === "hold") clearHold(); }} onPointerLeave={() => { if (mode === "hold") clearHold(); }} onKeyDown={event => { if (mode === "hold" && ["Enter", " "].includes(event.key)) { event.preventDefault(); if (!event.repeat) startHold(); } }} onKeyUp={event => { if (mode === "hold" && ["Enter", " "].includes(event.key)) { event.preventDefault(); clearHold(); } }} onBlur={() => { if (mode === "hold") clearHold(); }} onClick={() => { if (mode === "countdown") startCountdown(); else if (mode === "click") void confirm(); }}>{state === "pending" ? <LoaderCircle size={14} className="stg-spin" /> : null}{confirmLabel}</button>
    </>}
    <span className="stg-sr-only" role="status">{state === "pending" ? "Deleting" : state === "countdown" ? `Deleting in ${seconds} seconds` : state === "error" ? "Delete failed. Try again." : state === "confirm" && mode === "hold" ? "Press and hold to delete" : ""}</span>
  </motion.div>;
}
