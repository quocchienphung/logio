"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface BentoCardProps {
  id: string;
  title: string;
  /** Hover growth in px on the vertical axis (reference: 4 / 6 / 2 depending on card). */
  growY: number;
  children: ReactNode;
}

function DialogEntryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M13.75 6.75L10.25 6.75L10.25 5L15.5 5L15.5 10.25L13.75 10.25L13.75 6.75Z" />
      <path d="M6.75 10.25L5 10.25L5 15.5L10.25 15.5L10.25 13.75L6.75 13.75L6.75 10.25Z" />
    </svg>
  );
}

/**
 * Bento card shell. The reference computes --card-grow-x from the rendered aspect ratio
 * (grow-x = grow-y × width / height) so the hover clip-path expands uniformly.
 */
export function BentoCard({ id, title, growY, children }: BentoCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [growX, setGrowX] = useState(growY);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setGrowX((growY * width) / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [growY]);

  return (
    <button
      ref={ref}
      type="button"
      className={`modular-solutions-bento-card modular-solutions-bento__card-${id}`}
      data-bento-card-root="true"
      aria-labelledby={`bento-card-title-${id}`}
      aria-expanded="false"
      aria-haspopup="dialog"
      style={{ "--card-shift-x": `${-growX}px`, "--card-shift-y": `${-growY}px`, "--card-grow-x": `${growX}px`, "--card-grow-y": `${growY}px` }}
    >
      <div className="modular-solutions-bento-card__dialog-entry">
        <div className="modular-solutions-bento-card__dialog-entry-wrapper">
          <DialogEntryIcon />
        </div>
      </div>
      <div className="modular-solutions-bento-card__text">
        <h3 className="hds-heading modular-solutions-bento-card__title hds-heading--md" id={`bento-card-title-${id}`}>
          {title}
        </h3>
      </div>
      <div className="modular-solutions-bento-card__border">
        <div className="modular-solutions-bento-card__border-color">
          <div className="modular-solutions-bento-card__border-color-gradient" />
        </div>
      </div>
      <div className="modular-solutions-bento-card__inner">
        <div className="modular-solutions-bento-card__content">
          <div className="modular-solutions-bento-card__content-inner">{children}</div>
        </div>
      </div>
    </button>
  );
}
