"use client";

import { useEffect, useRef } from "react";
import { HERO_LOGOS } from "./logos";

const ITEM_WIDTH = 172; // .logo-carousel__item
const SPEED = 30; // px/s measured on the reference (≈15.3px per 507ms)

/** Customer logo marquee: JS-driven translateX at 30px/s, loops every 18 items, draggable. */
export function LogoCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;
    const loop = HERO_LOGOS.length * ITEM_WIDTH;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let x = 0;
    let last: number | null = null;
    let raf = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let visible = true;

    const apply = () => {
      const wrapped = ((x % loop) + loop) % loop;
      track.style.transform = `translateX(${-wrapped}px)`;
    };
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (last === null) last = t;
      const dt = Math.min(64, t - last);
      last = t;
      if (!dragging && !reduced && visible && !document.hidden)
        x += (SPEED * dt) / 1000;
      apply();
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(container);

    const onDown = (e: PointerEvent) => {
      dragging = true;
      dragStartX = e.clientX;
      dragStartOffset = x;
      container.style.setProperty("--logo-carousel-cursor", "grabbing");
      container.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      x = dragStartOffset - (e.clientX - dragStartX);
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      container.style.removeProperty("--logo-carousel-cursor");
      if (Math.abs(e.clientX - dragStartX) > 4) {
        const stop = (ev: Event) => ev.preventDefault();
        container.addEventListener("click", stop, {
          capture: true,
          once: true,
        });
      }
    };
    container.addEventListener("pointerdown", onDown);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerup", onUp);
    container.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const items = [...HERO_LOGOS, ...HERO_LOGOS];
  return (
    <div className="section-container hero-logo-section">
      <div className="logo-carousel">
        <div className="logo-carousel__marquee-container" ref={containerRef}>
          <ul className="logo-carousel__marquee" ref={trackRef}>
            {items.map((logo, i) => (
              <li className="logo-carousel__item" key={`${logo.label}-${i}`}>
                {logo.href ? (
                  <a
                    className="hds-link"
                    href={logo.href}
                    draggable={false}
                    aria-label={logo.label}
                  >
                    <div>{logo.svg}</div>
                  </a>
                ) : (
                  <div>{logo.svg}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
