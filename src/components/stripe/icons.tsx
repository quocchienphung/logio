"use client";

import { useId } from "react";

/** Arrow used by every hds-button / hds-link ("shaft" slides in on hover). Geometry from the reference DOM. */
export function HoverArrow({ className = "hds-icon hds-icon-hover-arrow" }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} width="5" height="8" fill="none" viewBox="0 0.5 5 8" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width="12" height="9" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g className="arrow-group">
          <rect className="shaft" x="-10" y="3.375" width="13" height="1.75" fill="currentColor" />
          <path
            d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
            fill="currentColor"
          />
        </g>
      </g>
    </svg>
  );
}

/** `<span class="hds-nowrap-svg">` wrapper that keeps the arrow glued to the last word. */
export function ButtonArrow() {
  return (
    <span className="hds-nowrap-svg">
      <HoverArrow />
    </span>
  );
}

/** Link variant: the reference nests two hds-nowrap-svg spans. */
export function LinkArrow() {
  return (
    <span className="hds-nowrap-svg">
      <span className="hds-nowrap-svg">
        <HoverArrow />
      </span>
    </span>
  );
}

/** Small right arrow that follows mega-menu link labels. */
export function MenuHoverArrow() {
  return (
    <svg className="hds-icon-hover-arrow" xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M9.752 3.913 5.87 7.825l-.959-.951 2.27-2.287H0v-1.35h7.18L4.912.951 5.871 0z" />
    </svg>
  );
}

export function ChevronDown() {
  return (
    <svg className="hds-icon navigation__chevron-down-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path className="navigation__chevron-down-icon__left" d="M4.67065 6L9.3 10.6" stroke="currentColor" strokeWidth="1.75" />
      <path className="navigation__chevron-down-icon__right" d="M12.6707 6L8.67065 10" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg className="navigation__chevron-left-icon" xmlns="http://www.w3.org/2000/svg" width="6" height="10" fill="none" viewBox="0 0 6 10" aria-hidden="true">
      <path fill="currentColor" d="M.618 5.238 0 4.62.618 4l4-4 1.238 1.238-3.38 3.381L5.856 8 4.618 9.238z" />
    </svg>
  );
}

export function SparkleIcon() {
  const id = useId();
  return (
    <svg className="navigation__sparkle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g clipPath={`url(#${id})`}>
        <path
          fill="currentColor"
          d="M9.168 6.568c.076.213.244.38.457.456l4.106 1.455v1.641l-4.106 1.455a.75.75 0 0 0-.457.457l-1.4 3.951H6.018l-1.4-3.95a.75.75 0 0 0-.379-.425l-.077-.033L.055 10.12V8.48L4.16 7.024a.75.75 0 0 0 .424-.378l.032-.078 1.49-4.207h1.57zm-3.137.501a2.25 2.25 0 0 1-1.369 1.37l-2.433.86 2.433.863c.56.198 1.015.608 1.272 1.136l.097.233.862 2.432.862-2.432.098-.233a2.25 2.25 0 0 1 1.271-1.136l2.432-.862-2.432-.862a2.25 2.25 0 0 1-1.37-1.369l-.861-2.432zm7.63-4.835a.25.25 0 0 0 .15.153l1.793.635v.535l-1.792.636a.25.25 0 0 0-.152.153l-.644 1.816h-.518l-.644-1.816a.25.25 0 0 0-.153-.153L9.91 3.558V3.02l1.792-.634a.25.25 0 0 0 .152-.153l.645-1.816h.518z"
        />
      </g>
      <defs>
        <clipPath id={id}>
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function StripeLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="25" fill="#111111" viewBox="0 0 60 25" aria-label="Stripe logo">
      <path
        fill="var(--hds-color-text-solid)"
        fillRule="evenodd"
        d="M59.6444 14.2813h-8.062c.1843 1.9296 1.5983 2.5476 3.2032 2.5476 1.6352 0 2.9534-.3656 4.0453-.9506v3.3179c-1.1186.7115-2.5964 1.1068-4.5645 1.1068-4.011 0-6.8218-2.5122-6.8218-7.4783 0-4.19441 2.3837-7.52509 6.3017-7.52509 3.912 0 5.9537 3.28038 5.9537 7.49819 0 .3982-.0372 1.261-.0556 1.4835Zm-5.9241-5.62407c-1.0294 0-2.1739.72812-2.1739 2.58387h4.2573c0-1.85362-1.0721-2.58387-2.0834-2.58387ZM40.9547 20.303c-1.4411 0-2.322-.6087-2.9133-1.0417l-.0088 4.6271-4.1181.8755-.0014-19.19053h3.7543l.0864 1.01784c.6035-.52914 1.6114-1.29157 3.2256-1.29162 2.8925 0 5.6162 2.6052 5.6162 7.39971 0 5.2327-2.6948 7.6037-5.6409 7.6037Zm-.959-11.35573c-.9453 0-1.5376.34559-1.9669.81586l.0245 6.11967c.3997.433.9763.7813 1.9424.7813 1.5231 0 2.5437-1.6575 2.5437-3.8745 0-2.1544-1.037-3.84233-2.5437-3.84233Zm-11.7602-3.3739h4.1341V20.0088h-4.1341V5.57337Zm0-4.694699L32.3696 0v3.35821l-4.1341.87868V.878671ZM23.9198 10.2223v9.7861h-4.1156V5.57296h3.6867l.1317 1.21751c1.0035-1.7722 3.0722-1.41321 3.6209-1.21594v3.78524c-.5242-.16908-2.2894-.42779-3.3237.86253Zm-8.5525 4.7221c0 2.4275 2.5988 1.6719 3.1263 1.4609v3.3522c-.5492.3013-1.5437.5458-2.8901.5458-2.4441 0-4.2773-1.7999-4.2773-4.2379l.0173-13.17658 4.0206-.85464.0032 3.5395h3.1278V9.0857h-3.1278v5.8588-.0001Zm-4.9069.7026c0 2.9645-2.31051 4.6562-5.73464 4.6562-1.41958 0-2.92289-.2761-4.453935-.9347v-3.9319c1.382085.7516 3.093705 1.315 4.457755 1.315.91864 0 1.53106-.2459 1.53106-1.0069C6.26064 13.7786 0 14.5192 0 9.95995 0 7.04457 2.27622 5.2998 5.61655 5.2998c1.36404 0 2.72806.20934 4.09208.75351V9.9317c-1.25265-.67618-2.84332-1.05979-4.09588-1.05979-.86296 0-1.44753.24965-1.44753.8924.0001 1.85329 6.29518.97249 6.29518 5.88279v-.0001Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
