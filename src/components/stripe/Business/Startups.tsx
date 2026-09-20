"use client";

import { useCaseStudyCarousel } from "./useCaseStudyCarousel";

/* Markup captured from stripe.com on 2026-09-17 (scripts/forensics/gen-component.mjs ".business-sizes-section > .section-container > .section-row > section" 1).
   Class names are the reference's so the partitioned stylesheet applies unchanged. */
export function Startups() {
  const { scrollerRef, atStart, atEnd, prev, next } = useCaseStudyCarousel();
  return (
    <>
      <section
        className="section-row section-row-gap"
        style={{
          "--section-row-gap-mb": "var(--hds-space-core-600)",
          "--section-row-gap-tb": "var(--hds-space-core-400)",
          "--section-row-gap-dt": "var(--hds-space-core-800)",
        }}
      >
        <header className="section-header section-header--title-span-5">
          <div className="section-header__primary">
            <h3 className="hds-heading section-header__title hds-heading--md">
              {"Build a foundation for your startup that enables faster growth"}
            </h3>
            <div className="hds-button-group section-header__actions">
              <a
                className="hds-button hds-button--primary"
                href="/startups"
                data-analytics-label="stripe_for_startups"
              >
                {"Stripe for startups"}
                <span className="hds-nowrap-svg">
                  <svg
                    className="hds-icon hds-icon-hover-arrow"
                    width="5"
                    height="8"
                    fill="none"
                    viewBox="0 0.5 5 8"
                  >
                    <defs>
                      <clipPath id=":Rt5nnmr6l6:">
                        <rect x="0" y="0" width="12" height="9" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#:Rt5nnmr6l6:)">
                      <g className="arrow-group">
                        <rect
                          className="shaft"
                          x="-10"
                          y="3.375"
                          width="13"
                          height="1.75"
                          fill="currentColor"
                        />
                        <path
                          d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                          fill="currentColor"
                        />
                      </g>
                    </g>
                  </svg>
                </span>
              </a>
            </div>
          </div>
          <p className="hds-text section-header__description hds-text--lg hds-text--soft">
            {
              "From stablecoin pioneers to 88% of the Forbes AI 50, Stripe helps startups build what’s next on easy-to-integrate financial infrastructure."
            }
          </p>
        </header>
        <section className="startups-carousel" aria-label="Customer stories">
          <div className="carousel-nav startups-carousel__nav" role="group">
            <button
              type="button"
              className="hds-ui-button hds-ui-button--quiet"
              aria-label="Previous customer story"
              disabled={atStart}
              onClick={prev}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M9.613 2.62 5.107 7.124h9.137v1.75H5.107l4.506 4.506-1.238 1.238-6-6L1.756 8l.619-.62 6-6 1.238 1.24Z" />
              </svg>
            </button>
            <button
              type="button"
              className="hds-ui-button hds-ui-button--quiet"
              aria-label="Next customer story"
              disabled={atEnd}
              onClick={next}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="m6.387 2.62 4.506 4.505H1.756v1.75h9.137l-4.506 4.506 1.238 1.238 6-6L14.245 8l-.618-.62-6-6-1.239 1.24Z" />
              </svg>
            </button>
          </div>
          <div
            className="carousel__section-container case-study-carousel"
            style={{
              "--case-study-carousel-card-max-width": "332px",
              "--case-study-carousel-card-fluid-width": "26.27cqi",
              "--carousel-hover-scale-target": "1.036",
            }}
          >
            <ul
              ref={scrollerRef}
              role="list"
              className="carousel__scroller case-study-carousel__scroller"
              data-carousel-drag=""
              style={{
                "--carousel-scroll-progress": "0.000000",
                overflow: "auto",
                "--carousel-drag-offset": "0px",
              }}
            >
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "0" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/lovable"
                    data-analytics-label="build_a_foundation__lovable"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/lovable-w432-64be9908.webp 1x, /stripe/lovable-w864-cf561f58.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/lovable-w432-b6ad17ed.png 1x, /stripe/lovable-w864-a805f0f3.png 2x"
                          src="/stripe/lovable-w432-b6ad17ed.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="100"
                        height="60"
                        fill="none"
                        viewBox="0 0 100 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Lovable logo"
                      >
                        <path
                          d="M93.3921 48.6211C92.1656 48.6211 91.1 48.3778 90.1955 47.8914C89.2909 47.397 88.5856 46.6554 88.0797 45.6666C87.5815 44.6777 87.3323 43.4536 87.3323 41.9943C87.3323 40.6068 87.5929 39.4106 88.1142 38.4058C88.6355 37.3931 89.3561 36.6235 90.276 36.0972C91.1959 35.5709 92.2423 35.3078 93.4152 35.3078C94.5421 35.3078 95.5424 35.563 96.4164 36.0733C97.2902 36.5837 97.9687 37.3253 98.4516 38.2982C98.9422 39.2711 99.1875 40.4353 99.1875 41.791C99.1875 42.2774 99.1837 42.6642 99.1761 42.9512H90.0115V40.4393H96.9568L95.646 40.9058C95.646 40.2519 95.554 39.7057 95.3699 39.2671C95.1936 38.8205 94.933 38.4856 94.5881 38.2623C94.2431 38.039 93.8253 37.9274 93.3347 37.9274C92.8211 37.9274 92.3688 38.059 91.9778 38.3221C91.5945 38.5773 91.2955 38.9601 91.081 39.4704C90.8739 39.9808 90.7704 40.5948 90.7704 41.3125V42.5446C90.7704 43.2782 90.8777 43.9002 91.0924 44.4106C91.3071 44.9209 91.6137 45.3077 92.0123 45.5709C92.4109 45.8261 92.8824 45.9536 93.4267 45.9536C94.0246 45.9536 94.5191 45.7941 94.91 45.4752C95.301 45.1482 95.5462 44.6896 95.646 44.0995H99.1301C99.0227 45.0246 98.7199 45.8261 98.2217 46.5038C97.731 47.1817 97.0756 47.704 96.2553 48.0709C95.4351 48.4377 94.4807 48.6211 93.3921 48.6211Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M82.8066 31.1211H86.2907V48.274H82.8066V31.1211Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M76.8772 48.6209C76.2179 48.6209 75.6276 48.5013 75.1064 48.2621C74.5927 48.0228 74.1559 47.6641 73.7955 47.1856C73.4353 46.6992 73.167 46.101 72.9907 45.3913L73.3585 45.499V48.274H69.909V35.6546H73.3931V38.4775L73.0021 38.5493C73.1784 37.8714 73.4467 37.2933 73.8071 36.8148C74.1749 36.3284 74.6235 35.9576 75.1524 35.7024C75.6814 35.4392 76.2755 35.3077 76.9347 35.3077C77.9236 35.3077 78.7821 35.5748 79.5105 36.1091C80.2387 36.6434 80.7983 37.4129 81.1893 38.4177C81.5802 39.4145 81.7757 40.5987 81.7757 41.9703C81.7757 43.334 81.5763 44.5181 81.1777 45.5229C80.7791 46.5197 80.208 47.2852 79.4644 47.8195C78.7285 48.3539 77.8661 48.6209 76.8772 48.6209ZM75.7963 45.8578C76.3176 45.8578 76.7545 45.6984 77.1071 45.3794C77.4675 45.0604 77.7358 44.6098 77.9121 44.0277C78.096 43.4456 78.1881 42.7598 78.1881 41.9703C78.1881 41.1808 78.096 40.495 77.9121 39.9129C77.7358 39.3308 77.4675 38.8802 77.1071 38.5612C76.7545 38.2343 76.3176 38.0708 75.7963 38.0708C75.2827 38.0708 74.842 38.2343 74.474 38.5612C74.1137 38.8802 73.8415 39.3347 73.6576 39.9249C73.4736 40.507 73.3815 41.1888 73.3815 41.9703C73.3815 42.7598 73.4736 43.4456 73.6576 44.0277C73.8415 44.6098 74.1137 45.0604 74.474 45.3794C74.842 45.6984 75.2827 45.8578 75.7963 45.8578ZM69.909 31.1211H73.3931V35.6546H69.909V31.1211Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M61.1648 48.6211C60.4058 48.6211 59.7236 48.4656 59.118 48.1545C58.5201 47.8436 58.0486 47.401 57.7037 46.8268C57.3663 46.2447 57.1977 45.5669 57.1977 44.7934C57.1977 43.6131 57.5312 42.712 58.1981 42.09C58.865 41.46 59.8271 41.0494 61.0843 40.858L63.1886 40.547C63.6102 40.4832 63.9437 40.4034 64.189 40.3077C64.4342 40.212 64.6144 40.0844 64.7293 39.925C64.8444 39.7575 64.9018 39.5462 64.9018 39.291C64.9018 39.0278 64.8329 38.7886 64.6949 38.5733C64.5646 38.35 64.3653 38.1746 64.097 38.047C63.8363 37.9114 63.5181 37.8436 63.1425 37.8436C62.5446 37.8436 62.0656 38.0071 61.7052 38.3341C61.3449 38.653 61.1494 39.0916 61.1188 39.6498H57.5196C57.5503 38.8046 57.7956 38.055 58.2556 37.4011C58.7232 36.7392 59.3709 36.2248 60.1989 35.858C61.0267 35.4912 61.985 35.3078 63.0735 35.3078C64.2158 35.3078 65.1817 35.5032 65.9713 35.8939C66.7609 36.2767 67.355 36.8269 67.7536 37.5446C68.1599 38.2623 68.363 39.1195 68.363 40.1163V45.3794C68.363 45.9456 68.4013 46.472 68.478 46.9584C68.5623 47.4369 68.6812 47.7399 68.8345 47.8675V48.2742H65.2123C65.1281 47.9313 65.0629 47.5445 65.0169 47.1139C64.9708 46.6833 64.944 46.2287 64.9364 45.7503L65.4998 45.4991C65.3542 46.0652 65.0859 46.5876 64.6949 47.0661C64.3115 47.5365 63.8171 47.9153 63.2116 48.2024C62.6136 48.4816 61.9313 48.6211 61.1648 48.6211ZM62.4526 45.9656C62.9432 45.9656 63.3764 45.8539 63.752 45.6306C64.1276 45.3994 64.4151 45.0804 64.6144 44.6738C64.8214 44.2671 64.9248 43.8046 64.9248 43.2862V41.6355L65.2123 41.8029C65.0284 42.0581 64.7984 42.2535 64.5224 42.3891C64.2541 42.5246 63.8899 42.6403 63.43 42.7359L62.5446 42.9154C61.9544 43.035 61.5097 43.2184 61.2108 43.4656C60.9195 43.7129 60.7738 44.0597 60.7738 44.5062C60.7738 44.9529 60.931 45.3077 61.2452 45.5709C61.5596 45.834 61.962 45.9656 62.4526 45.9656Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M45.347 35.6559H49.0496L52.2347 46.4811H51.1194L54.178 35.6559H57.7772L53.5801 48.2754H49.705L45.347 35.6559Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M39.9004 48.6211C38.6968 48.6211 37.6389 48.3499 36.7267 47.8076C35.8221 47.2655 35.1207 46.4919 34.6224 45.4871C34.1318 44.4823 33.8865 43.3061 33.8865 41.9584C33.8865 40.6108 34.1318 39.4385 34.6224 38.4417C35.1207 37.4369 35.8221 36.6634 36.7267 36.1212C37.6389 35.5789 38.6968 35.3078 39.9004 35.3078C41.1039 35.3078 42.158 35.5789 43.0625 36.1212C43.9671 36.6634 44.6647 37.4369 45.1553 38.4417C45.6536 39.4385 45.9027 40.6108 45.9027 41.9584C45.9027 43.3061 45.6536 44.4823 45.1553 45.4871C44.6647 46.4919 43.9671 47.2655 43.0625 47.8076C42.158 48.3499 41.1039 48.6211 39.9004 48.6211ZM39.9004 45.846C40.4064 45.846 40.8394 45.7024 41.1998 45.4154C41.56 45.1203 41.836 44.6857 42.0276 44.1115C42.2193 43.5294 42.3151 42.8117 42.3151 41.9584C42.3151 40.6905 42.1043 39.7296 41.6826 39.0757C41.261 38.4138 40.6669 38.0829 39.9004 38.0829C39.3945 38.0829 38.9575 38.2304 38.5895 38.5254C38.2292 38.8125 37.9532 39.2471 37.7616 39.8293C37.57 40.4034 37.4741 41.1131 37.4741 41.9584C37.4741 42.8037 37.57 43.5174 37.7616 44.0995C37.9532 44.6817 38.2292 45.1203 38.5895 45.4154C38.9575 45.7024 39.3945 45.846 39.9004 45.846Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M23.7012 31.1211H27.3118V45.6012L26.6678 44.8237C26.6678 44.8237 28.4561 44.8237 31.5325 44.8237C34.6087 44.8237 34.1881 48.274 34.1881 48.274H23.7012V31.1211Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <mask
                          id=":R51qnnmr6l6:-0"
                          style={{ maskType: "alpha" }}
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="31"
                          width="17"
                          height="18"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M4.86556 31.1211C7.55275 31.1211 9.73113 33.3931 9.73113 36.1958V38.1246H11.3504C14.0376 38.1246 16.2159 40.3966 16.2159 43.1993C16.2159 46.002 14.0376 48.274 11.3504 48.274H0V36.1958C0 33.3931 2.17839 31.1211 4.86556 31.1211Z"
                            fill="url(#:R51qnnmr6l6:-5)"
                          />
                        </mask>
                        <g mask="url(#:R51qnnmr6l6:-0)">
                          <g filter="url(#:R51qnnmr6l6:-1)">
                            <path
                              d="M7.11562 51.695C13.178 51.695 18.0926 46.5826 18.0926 40.2762C18.0926 33.9698 13.178 28.8574 7.11562 28.8574C1.05322 28.8574 -3.86133 33.9698 -3.86133 40.2762C-3.86133 46.5826 1.05322 51.695 7.11562 51.695Z"
                              fill="var(--caseStudyLogoColor, #4b73ff)"
                            />
                          </g>
                          <g filter="url(#:R51qnnmr6l6:-2)">
                            <path
                              d="M8.32024 45.4294C16.0846 45.4294 22.3788 40.317 22.3788 34.0106C22.3788 27.7042 16.0846 22.5918 8.32024 22.5918C0.555935 22.5918 -5.73828 27.7042 -5.73828 34.0106C-5.73828 40.317 0.555935 45.4294 8.32024 45.4294Z"
                              fill="var(--caseStudyLogoColor, #ff66f4)"
                            />
                          </g>
                          <g filter="url(#:R51qnnmr6l6:-3)">
                            <path
                              d="M10.6137 41.8903C16.6761 41.8903 21.5906 37.4005 21.5906 31.8621C21.5906 26.3237 16.6761 21.834 10.6137 21.834C4.55126 21.834 -0.363281 26.3237 -0.363281 31.8621C-0.363281 37.4005 4.55126 41.8903 10.6137 41.8903Z"
                              fill="var(--caseStudyLogoColor, #ff0105)"
                            />
                          </g>
                          <g filter="url(#:R51qnnmr6l6:-4)">
                            <path
                              d="M8.51558 40.8751C12.1615 40.8751 15.1171 37.8005 15.1171 34.0079C15.1171 30.2152 12.1615 27.1406 8.51558 27.1406C4.86966 27.1406 1.91406 30.2152 1.91406 34.0079C1.91406 37.8005 4.86966 40.8751 8.51558 40.8751Z"
                              fill="var(--caseStudyLogoColor, #fe7b02)"
                            />
                          </g>
                        </g>
                        <defs>
                          <filter
                            id=":R51qnnmr6l6:-1"
                            x="-8.94564"
                            y="23.7731"
                            width="32.1217"
                            height="33.0065"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                          >
                            <feFlood
                              floodOpacity="0"
                              result="BackgroundImageFix"
                            ></feFlood>
                            <feBlend
                              mode="normal"
                              in="SourceGraphic"
                              in2="BackgroundImageFix"
                              result="shape"
                            ></feBlend>
                            <feGaussianBlur
                              stdDeviation="2.54216"
                              result="effect1_foregroundBlur_1690_14064"
                            ></feGaussianBlur>
                          </filter>
                          <filter
                            id=":R51qnnmr6l6:-2"
                            x="-10.8226"
                            y="17.5075"
                            width="38.2858"
                            height="33.0065"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                          >
                            <feFlood
                              floodOpacity="0"
                              result="BackgroundImageFix"
                            ></feFlood>
                            <feBlend
                              mode="normal"
                              in="SourceGraphic"
                              in2="BackgroundImageFix"
                              result="shape"
                            ></feBlend>
                            <feGaussianBlur
                              stdDeviation="2.54216"
                              result="effect1_foregroundBlur_1690_14064"
                            ></feGaussianBlur>
                          </filter>
                          <filter
                            id=":R51qnnmr6l6:-3"
                            x="-5.44759"
                            y="16.7497"
                            width="32.1217"
                            height="30.2253"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                          >
                            <feFlood
                              floodOpacity="0"
                              result="BackgroundImageFix"
                            ></feFlood>
                            <feBlend
                              mode="normal"
                              in="SourceGraphic"
                              in2="BackgroundImageFix"
                              result="shape"
                            ></feBlend>
                            <feGaussianBlur
                              stdDeviation="2.54216"
                              result="effect1_foregroundBlur_1690_14064"
                            ></feGaussianBlur>
                          </filter>
                          <filter
                            id=":R51qnnmr6l6:-4"
                            x="-3.17025"
                            y="22.0563"
                            width="23.3717"
                            height="23.903"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                          >
                            <feFlood
                              floodOpacity="0"
                              result="BackgroundImageFix"
                            ></feFlood>
                            <feBlend
                              mode="normal"
                              in="SourceGraphic"
                              in2="BackgroundImageFix"
                              result="shape"
                            ></feBlend>
                            <feGaussianBlur
                              stdDeviation="2.54216"
                              result="effect1_foregroundBlur_1690_14064"
                            ></feGaussianBlur>
                          </filter>
                          <linearGradient
                            id=":R51qnnmr6l6:-5"
                            x1="5.45697"
                            y1="34.1354"
                            x2="10.7523"
                            y2="48.1333"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="0.025" stopColor="#FF8E63" />
                            <stop offset="0.56" stopColor="#FF7EB0" />
                            <stop offset="0.95" stopColor="#4B73FF" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Lovable grows into a vibe-coding juggernaut with Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Lovable’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p1qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p1qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "1" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/gamma"
                    data-analytics-label="build_a_foundation__gamma"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/Gamma-w432-6cd4ede0.webp 1x, /stripe/Gamma-w864-44450c68.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/Gamma-w432-b59e40d5.png 1x, /stripe/Gamma-w864-46f22a7e.png 2x"
                          src="/stripe/Gamma-w432-b59e40d5.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="91"
                        height="60"
                        fill="none"
                        viewBox="0 0 91 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Gamma logo"
                      >
                        <path
                          d="M46.7926 33.3008C49.3974 33.301 51.5153 35.4277 51.5153 38.0406V48.4516H48.0581V38.0406C48.0581 37.3346 47.4896 36.7661 46.7836 36.7661C46.0778 36.7664 45.5101 37.3347 45.5101 38.0406V44.062C45.5099 46.6748 43.3921 48.8005 40.7874 48.8008C38.1825 48.8008 36.0639 46.6749 36.0637 44.062V38.0487C36.0637 37.3428 35.4961 36.7744 34.7902 36.7742C34.0842 36.7742 33.5157 37.3426 33.5157 38.0487V48.4516H30.0585V38.0487C30.0585 35.4356 32.1772 33.3089 34.7822 33.3089C37.3869 33.3091 39.5048 35.4357 39.5048 38.0487V44.062C39.505 44.7679 40.0734 45.3355 40.7793 45.3355C41.485 45.3352 42.0527 44.7677 42.0528 44.062V38.0406C42.0528 35.4277 44.1707 33.301 46.7755 33.3008H46.7926Z"
                          fill="var(--caseStudyLogoColor, #002253)"
                        />
                        <path
                          d="M70.7803 33.3008C73.3853 33.3008 75.504 35.4275 75.504 38.0406V48.4516H72.0468V38.0406C72.0468 37.3346 71.4783 36.7661 70.7722 36.7661C70.0664 36.7662 69.4987 37.3347 69.4987 38.0406V44.062C69.4986 46.6749 67.38 48.8008 64.7751 48.8008C62.1704 48.8006 60.0526 46.6748 60.0524 44.062V38.0406C60.0524 37.3346 59.4839 36.7661 58.7779 36.7661C58.0721 36.7663 57.5044 37.3347 57.5044 38.0406V48.4516H54.0472V38.0406C54.0472 35.4276 56.165 33.301 58.7698 33.3008C61.3748 33.3008 63.4935 35.4275 63.4935 38.0406V44.062C63.4936 44.7678 64.0612 45.3353 64.767 45.3355C65.4729 45.3355 66.0414 44.7679 66.0415 44.062V38.0406C66.0415 35.4276 68.1593 33.3009 70.7642 33.3008H70.7803Z"
                          fill="var(--caseStudyLogoColor, #002253)"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M83.8383 33.325C87.3033 33.3251 90.119 36.1497 90.119 39.6229V48.4516H86.7112V44.0216H80.9653V48.4516H77.5565V39.6229C77.5565 36.1496 80.3731 33.325 83.8383 33.325ZM83.8383 36.7419C82.2558 36.7419 80.9653 38.0323 80.9653 39.6229V40.8641H86.7112V39.6229C86.7112 38.0324 85.4206 36.742 83.8383 36.7419Z"
                          fill="var(--caseStudyLogoColor, #002253)"
                        />
                        <path
                          d="M13.3657 36.8559H7.80651C7.0683 36.8559 6.37861 37.0418 5.76204 37.4149C5.1372 37.7801 4.64181 38.2836 4.27663 38.9084C3.91956 39.5252 3.73272 40.2235 3.73272 40.962C3.73276 41.7002 3.91161 42.3898 4.27663 43.0145C4.64181 43.6313 5.14529 44.1347 5.76204 44.508C6.37867 44.8812 7.06821 45.068 7.80651 45.0681H9.88428V42.4878H6.78428V39.3141H13.3577V48.4436H7.69349C6.28961 48.4436 4.99108 48.1029 3.82253 47.4375C2.65394 46.772 1.7201 45.8551 1.03031 44.7108C0.34877 43.5667 5.26597e-05 42.3008 0 40.9539C0 39.6068 0.348588 38.3402 1.03838 37.196C1.72005 36.0599 2.66203 35.1348 3.8306 34.4693C4.99912 33.804 6.29774 33.4632 7.70156 33.4632H13.3657V36.8559Z"
                          fill="var(--caseStudyLogoColor, #002253)"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M21.7161 33.3169C25.1813 33.3169 27.9979 36.1415 27.9979 39.6148V48.4436H24.5891V44.0125H18.8432V48.4436H15.4354V39.6148C15.4354 36.1416 18.251 33.317 21.7161 33.3169ZM21.7161 36.7257C20.1337 36.7258 18.8432 38.0162 18.8432 39.6067V40.8479H24.5891V39.6067C24.5891 38.0162 23.2986 36.7257 21.7161 36.7257Z"
                          fill="var(--caseStudyLogoColor, #002253)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Gamma expands to $100M ARR and 70 million users with Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Gamma’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p2qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p2qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "2" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/runway"
                    data-analytics-label="build_a_foundation__runway"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/Runway-w432-28108484.webp 1x, /stripe/Runway-w864-35574021.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/Runway-w432-64951d87.png 1x, /stripe/Runway-w864-dec2b407.png 2x"
                          src="/stripe/Runway-w432-64951d87.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="81"
                        height="60"
                        fill="none"
                        viewBox="0 0 81 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Runway logo"
                      >
                        <path
                          d="M73.3308 41.8314L75.9546 34.6071H80.2845L73.1518 52.3008H68.8219L71.1394 46.7329L65.7656 34.6071H70.5463L73.3308 41.8314Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M13.1525 42.0665C13.1525 43.4542 14.0515 44.4089 15.3816 44.4089C16.7114 44.4086 17.5913 43.454 17.5913 42.0665V34.6071H21.6882V47.8868H19.3879L17.9871 46.391C17.035 47.5266 15.6863 48.193 14.1058 48.1931C11.1232 48.1931 9.05673 46.0124 9.05662 42.8236L9.05554 34.6071H13.1525V42.0665Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M60.8448 34.3008C64.3299 34.301 66.4319 36.2292 66.4321 39.4352V47.8868H64.1145L62.911 46.5894C62.0126 47.6343 60.7192 48.192 59.1559 48.192C56.371 48.1919 54.412 46.4629 54.412 44.012C54.4121 41.3997 56.3173 39.8861 59.6229 39.8859H62.4451V39.4535C62.445 38.3182 61.8162 37.7064 60.6302 37.7064C59.5697 37.7064 58.8872 38.2476 58.8152 39.1483H54.8088C55.042 36.2117 57.4138 34.3013 60.8448 34.3008ZM60.0532 42.4817C59.0295 42.4818 58.4369 42.9497 58.4366 43.7597C58.4366 44.6247 59.1367 45.1475 60.3045 45.1476C61.6883 45.1476 62.443 44.427 62.443 43.0576V42.4817H60.0532Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M30.5291 34.3008C33.5483 34.3008 35.6333 36.5169 35.6333 39.7425L35.6323 47.8868H31.5353V40.4802C31.5351 39.0572 30.6188 38.085 29.2534 38.085C27.8877 38.085 26.9716 39.0572 26.9714 40.4802V47.8868H22.8745V34.6071H25.1748L26.594 36.1201C27.5459 34.9675 28.9114 34.3009 30.5291 34.3008Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M41.4719 42.1388L43.8973 34.6071H46.8802L49.3067 42.1744L51.319 34.6071H55.2542L51.0861 47.8868H47.51L45.1558 40.5902L42.7833 47.8868H39.424L35.1826 34.6071H39.4596L41.4719 42.1388Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M3.73782 36.1395C4.42104 35.1485 5.445 34.6072 6.82859 34.6071H8.06878V38.6619H6.37889C4.88773 38.662 4.09706 39.5437 4.09694 41.111V47.8857H0V34.6071H2.30028L3.73782 36.1395Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Runway protects developer time with no-code solutions from Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Runway’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p3qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p3qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "3" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/supabase"
                    data-analytics-label="build_a_foundation__supabase"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/Supabase-w432-831a762d.webp 1x, /stripe/Supabase-w864-4c7928f3.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/Supabase-w432-90dfa1d1.png 1x, /stripe/Supabase-w864-a38c2beb.png 2x"
                          src="/stripe/Supabase-w432-90dfa1d1.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="141"
                        height="60"
                        fill="none"
                        viewBox="0 0 141 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Supabase logo"
                      >
                        <path
                          d="M15.3617 55.2506C14.6719 56.1193 13.2734 55.6433 13.2568 54.5342L13.0138 38.312H23.9214C25.8971 38.312 26.9989 40.5939 25.7704 42.1412L15.3617 55.2506Z"
                          fill="url(#:R54qnnmr6l6:-0)"
                        />
                        <path
                          d="M15.3617 55.2506C14.6719 56.1193 13.2734 55.6433 13.2568 54.5342L13.0138 38.312H23.9214C25.8971 38.312 26.9989 40.5939 25.7704 42.1412L15.3617 55.2506Z"
                          fill="url(#:R54qnnmr6l6:-1)"
                          fillOpacity="0.2"
                        />
                        <path
                          d="M36.514 44.7526C36.6585 46.1037 37.8875 48.4199 41.4541 48.4199C44.5626 48.4199 46.0569 46.4415 46.0569 44.5113C46.0569 42.7742 44.8759 41.3507 42.5386 40.8681L40.8515 40.5062C40.201 40.3856 39.7673 40.0237 39.7673 39.4446C39.7673 38.769 40.442 38.2624 41.2855 38.2624C42.6348 38.2624 43.1409 39.1551 43.2374 39.8548L45.9122 39.2516C45.7677 37.9729 44.635 35.8256 41.2614 35.8256C38.7069 35.8256 36.8274 37.5868 36.8274 39.71C36.8274 41.3748 37.8634 42.7501 40.1527 43.2567L41.7192 43.6186C42.6348 43.8116 42.9964 44.246 42.9964 44.7767C42.9964 45.404 42.4903 45.959 41.43 45.959C40.0324 45.959 39.3333 45.0904 39.2612 44.1494L36.514 44.7526Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M56.2994 48.058H59.3599C59.3116 47.6479 59.2393 46.8276 59.2393 45.9107V36.1874H56.034V43.0878C56.034 44.4631 55.2149 45.4282 53.7932 45.4282C52.2991 45.4282 51.6242 44.3666 51.6242 43.0396V36.1874H48.4191V43.691C48.4191 46.2726 50.0577 48.3717 52.9255 48.3717C54.1784 48.3717 55.5526 47.8892 56.2031 46.7793C56.2031 47.2618 56.2511 47.8167 56.2994 48.058Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M65.8647 52.6422V46.9C66.4429 47.6961 67.648 48.3476 69.2868 48.3476C72.6363 48.3476 74.8772 45.6936 74.8772 42.0986C74.8772 38.5761 72.8773 35.9221 69.4072 35.9221C67.6241 35.9221 66.2986 36.7182 65.7685 37.6351V36.1875H62.6599V52.6422H65.8647ZM71.7204 42.1228C71.7204 44.246 70.4193 45.4764 68.7805 45.4764C67.1422 45.4764 65.8167 44.2218 65.8167 42.1228C65.8167 40.0237 67.1422 38.7932 68.7805 38.7932C70.4193 38.7932 71.7204 40.0237 71.7204 42.1228Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M76.6923 44.825C76.6923 46.6828 78.2344 48.3958 80.765 48.3958C82.5237 48.3958 83.6564 47.5755 84.2587 46.6345C84.2587 47.0929 84.307 47.7443 84.3793 48.058H87.3192C87.2469 47.6479 87.175 46.8034 87.175 46.1761V40.3373C87.175 37.9487 85.7772 35.8256 82.0181 35.8256C78.8369 35.8256 77.1258 37.8763 76.9333 39.7341L79.7767 40.3373C79.8732 39.2998 80.6444 38.4071 82.0417 38.4071C83.3916 38.4071 84.0421 39.1068 84.0421 39.9513C84.0421 40.3614 83.8255 40.6993 83.1506 40.7957L80.2348 41.23C78.2588 41.5196 76.6923 42.7018 76.6923 44.825ZM81.4394 46.0072C80.4034 46.0072 79.8971 45.3317 79.8971 44.632C79.8971 43.7151 80.5476 43.2567 81.3673 43.1361L84.0421 42.7259V43.2567C84.0421 45.3558 82.789 46.0072 81.4394 46.0072Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M93.5143 48.0581V46.6104C94.1405 47.6238 95.3936 48.3476 97.0324 48.3476C100.407 48.3476 102.624 45.6695 102.624 42.0745C102.624 38.5519 100.623 35.8738 97.153 35.8738C95.3936 35.8738 94.0925 36.6459 93.5623 37.4903V30.59H90.4056V48.0581H93.5143ZM99.4181 42.0986C99.4181 44.2701 98.1169 45.4764 96.4781 45.4764C94.8637 45.4764 93.5143 44.246 93.5143 42.0986C93.5143 39.9272 94.8637 38.745 96.4781 38.745C98.1169 38.745 99.4181 39.9272 99.4181 42.0986Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M104.438 44.825C104.438 46.6828 105.98 48.3958 108.511 48.3958C110.27 48.3958 111.403 47.5755 112.005 46.6345C112.005 47.0929 112.053 47.7443 112.125 48.058H115.065C114.993 47.6479 114.921 46.8034 114.921 46.1761V40.3373C114.921 37.9487 113.523 35.8256 109.764 35.8256C106.583 35.8256 104.872 37.8763 104.679 39.7341L107.522 40.3373C107.619 39.2998 108.39 38.4071 109.788 38.4071C111.137 38.4071 111.788 39.1068 111.788 39.9513C111.788 40.3614 111.571 40.6993 110.896 40.7957L107.981 41.23C106.005 41.5196 104.438 42.7018 104.438 44.825ZM109.186 46.0072C108.149 46.0072 107.643 45.3317 107.643 44.632C107.643 43.7151 108.294 43.2567 109.113 43.1361L111.788 42.7259V43.2567C111.788 45.3558 110.535 46.0072 109.186 46.0072Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M117.139 44.7526C117.284 46.1037 118.513 48.4199 122.079 48.4199C125.188 48.4199 126.682 46.4415 126.682 44.5113C126.682 42.7742 125.501 41.3507 123.164 40.8681L121.477 40.5062C120.826 40.3856 120.393 40.0237 120.393 39.4446C120.393 38.769 121.067 38.2624 121.911 38.2624C123.26 38.2624 123.766 39.1551 123.863 39.8548L126.537 39.2516C126.393 37.9729 125.26 35.8256 121.887 35.8256C119.332 35.8256 117.453 37.5868 117.453 39.71C117.453 41.3748 118.488 42.7501 120.778 43.2567L122.344 43.6186C123.26 43.8116 123.622 44.246 123.622 44.7767C123.622 45.404 123.116 45.959 122.055 45.959C120.657 45.959 119.959 45.0904 119.887 44.1494L117.139 44.7526Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M131.549 40.7716C131.622 39.6859 132.538 38.4312 134.2 38.4312C136.032 38.4312 136.803 39.5894 136.851 40.7716H131.549ZM137.165 43.8599C136.779 44.9215 135.96 45.6694 134.465 45.6694C132.875 45.6694 131.549 44.5354 131.478 42.9672H139.96C139.96 42.9189 140.008 42.4364 140.008 41.9779C140.008 38.1659 137.815 35.8256 134.152 35.8256C131.116 35.8256 128.32 38.2865 128.32 42.0745C128.32 46.0796 131.188 48.4199 134.441 48.4199C137.357 48.4199 139.237 46.7069 139.839 44.6561L137.165 43.8599Z"
                          fill="var(--caseStudyLogoColor, #1f1f1f)"
                        />
                        <path
                          d="M10.9251 29.1478C11.6149 28.2791 13.0135 28.7551 13.0301 29.8643L13.1366 46.0865H2.36546C0.389735 46.0865 -0.712162 43.8045 0.516401 42.2572L10.9251 29.1478Z"
                          fill="var(--caseStudyLogoColor, #3ecf8e)"
                        />
                        <defs>
                          <linearGradient
                            id=":R54qnnmr6l6:-0"
                            x1="13.0137"
                            y1="41.9089"
                            x2="22.708"
                            y2="45.9746"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="var(--caseStudyLogoColor, #249361)" />
                            <stop
                              offset="1"
                              stopColor="var(--caseStudyLogoColor, #3ECF8E)"
                            />
                          </linearGradient>
                          <linearGradient
                            id=":R54qnnmr6l6:-1"
                            x1="8.71572"
                            y1="36.0241"
                            x2="13.137"
                            y2="44.3467"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Supabase delivers its backend-as-a-service to 150 countries with Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Supabase’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p4qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p4qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "4" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/linear"
                    data-analytics-label="build_a_foundation__linear"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/linear-w432-c6495866.webp 1x, /stripe/linear-w864-293c312e.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/linear-w432-ce497ef9.png 1x, /stripe/linear-w864-9a51cf4c.png 2x"
                          src="/stripe/linear-w432-ce497ef9.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="99"
                        height="60"
                        fill="none"
                        viewBox="0 0 99 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Linear logo"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M3.19528 31.3101C3.06451 31.4538 3.07317 31.6743 3.21055 31.8117L20.1893 48.7904C20.3267 48.9278 20.5472 48.9364 20.6909 48.8057C23.1804 46.5403 24.7431 43.2741 24.7431 39.6429C24.7431 32.8028 19.1982 27.2578 12.358 27.2578C8.72686 27.2578 5.46065 28.8205 3.19528 31.3101ZM1.0732 34.5324C1.01046 34.6707 1.04209 34.8329 1.1495 34.9403L17.0607 50.8514C17.1681 50.9588 17.3303 50.9905 17.4686 50.9278C17.8362 50.761 18.1941 50.5769 18.5415 50.3764C18.7479 50.2572 18.7795 49.9755 18.611 49.8069L2.19401 33.39C2.02546 33.2214 1.74378 33.2531 1.6246 33.4595C1.42407 33.8068 1.23992 34.1648 1.0732 34.5324ZM0.10792 39.0884C0.033421 39.0139 -0.00621758 38.9112 0.000795856 38.8061C0.0336428 38.3138 0.0952603 37.8293 0.183982 37.3544C0.237181 37.0696 0.585149 36.9708 0.789994 37.1756L14.8253 51.2109C15.0301 51.4158 14.9313 51.7638 14.6466 51.817C14.1716 51.9057 13.6872 51.9673 13.1948 52.0002C13.0897 52.0072 12.987 51.9675 12.9125 51.893L0.10792 39.0884ZM0.969232 42.5445C0.713517 42.2888 0.300852 42.5092 0.394502 42.8585C1.5355 47.1142 4.8868 50.4655 9.14248 51.6064C9.49178 51.7001 9.71213 51.2874 9.45641 51.0317L0.969232 42.5445ZM49.8967 34.0733C50.7846 34.0733 51.5041 33.3511 51.5041 32.4601C51.5041 31.5692 50.7846 30.8469 49.8967 30.8469C49.0091 30.8469 48.2895 31.5692 48.2895 32.4601C48.2895 33.3511 49.0091 34.0733 49.8967 34.0733ZM36.1293 48.1424V30.8479H38.9857V45.6121H46.6873V48.1424H36.1293ZM56.4598 41.0853V48.1424H53.6959V35.8853H56.4251V37.9862L56.4598 37.963C56.7372 37.3053 57.1845 36.7559 57.8013 36.3148C58.4179 35.866 59.2043 35.6416 60.1605 35.6416C61.0085 35.6416 61.7793 35.8312 62.4733 36.2103C63.1671 36.5818 63.7221 37.1273 64.1384 37.8469C64.5548 38.5666 64.7629 39.4487 64.7629 40.4933V48.1424H61.9991V40.8764C61.9991 39.9478 61.7523 39.2437 61.259 38.7639C60.7733 38.2764 60.1219 38.0326 59.3045 38.0326C58.7803 38.0326 58.3023 38.141 57.8706 38.3576C57.439 38.5743 57.0959 38.907 56.8414 39.3559C56.587 39.8047 56.4598 40.3811 56.4598 41.0853ZM81.4855 47.9335C82.1177 48.2043 82.8425 48.3398 83.6595 48.3398C84.3303 48.3398 84.9046 48.2546 85.3825 48.0844C85.8608 47.9064 86.2538 47.6704 86.5622 47.3764C86.8783 47.0823 87.1288 46.7612 87.314 46.413H87.3602V48.1424H90.0085V39.7041C90.0085 39.1082 89.8927 38.5627 89.6615 38.0675C89.4303 37.5722 89.0949 37.1428 88.6553 36.7791C88.2236 36.4154 87.6994 36.1368 87.0825 35.9434C86.466 35.7422 85.7719 35.6416 85.0011 35.6416C83.9449 35.6416 83.0313 35.8234 82.2603 36.1871C81.4969 36.5431 80.8997 37.0228 80.4677 37.6264C80.0361 38.23 79.8009 38.9109 79.7623 39.6692H82.4338C82.4645 39.3133 82.588 38.996 82.8039 38.7175C83.0197 38.4389 83.3128 38.2222 83.6828 38.0675C84.0529 37.905 84.4806 37.8237 84.9665 37.8237C85.4521 37.8237 85.8645 37.905 86.2038 38.0675C86.5506 38.23 86.8167 38.4505 87.0016 38.7291C87.1867 39.0076 87.2793 39.3326 87.2793 39.7041V39.7969C87.2793 40.0755 87.1828 40.2805 86.9902 40.4121C86.8051 40.5436 86.489 40.6404 86.0419 40.7023C85.6023 40.7642 85.0011 40.8377 84.2378 40.9228C83.6133 40.9924 83.012 41.0969 82.4338 41.2362C81.8556 41.3755 81.339 41.5806 80.8841 41.8514C80.437 42.1222 80.0823 42.482 79.8202 42.9308C79.5581 43.3797 79.4271 43.9561 79.4271 44.6603C79.4271 45.4728 79.6121 46.1537 79.9821 46.7031C80.3521 47.2448 80.8534 47.6549 81.4855 47.9335ZM85.961 45.879C85.5137 46.1189 84.9625 46.2389 84.3073 46.2389C83.6442 46.2389 83.116 46.0996 82.7229 45.821C82.3296 45.5347 82.1331 45.1439 82.1331 44.6487C82.1331 44.2618 82.241 43.9484 82.4568 43.7085C82.6806 43.4686 82.9734 43.2791 83.3358 43.1398C83.6981 43.0005 84.0912 42.9038 84.5152 42.8496C84.8236 42.8032 85.1244 42.7567 85.4174 42.7103C85.7103 42.6561 85.984 42.6058 86.2385 42.5594C86.4929 42.5053 86.7088 42.4511 86.886 42.3969C87.0711 42.3428 87.206 42.2847 87.2907 42.2228V43.5925C87.2907 44.0722 87.1791 44.5133 86.9553 44.9157C86.7395 45.3103 86.408 45.6314 85.961 45.879ZM92.4199 48.1424V35.8853H95.0795V37.905H95.1144C95.3379 37.2085 95.6886 36.6785 96.1666 36.3148C96.6522 35.9434 97.2884 35.7577 98.0748 35.7577C98.2676 35.7577 98.4411 35.7654 98.5951 35.7809C98.7572 35.7886 98.8921 35.7964 99 35.8041V38.2996C98.8998 38.2841 98.7223 38.2648 98.4681 38.2416C98.2136 38.2184 97.9438 38.2068 97.6584 38.2068C97.2035 38.2068 96.7874 38.3112 96.4094 38.5201C96.0317 38.7291 95.731 39.0502 95.5075 39.4835C95.2916 39.9091 95.1837 40.4469 95.1837 41.0969V48.1424H92.4199ZM48.5091 48.1424V35.8853H51.2729V48.1424H48.5091ZM69.3599 47.5969C70.2465 48.1463 71.299 48.421 72.5171 48.421C73.4576 48.421 74.3133 48.2508 75.0844 47.9103C75.8631 47.5621 76.5106 47.0862 77.0272 46.4826C77.5437 45.8713 77.8791 45.1671 78.0333 44.3701H75.4314C75.3156 44.7338 75.1267 45.0549 74.8646 45.3335C74.6104 45.6043 74.2903 45.8171 73.9049 45.9719C73.5193 46.1267 73.0723 46.204 72.5633 46.204C71.8772 46.204 71.2874 46.0493 70.7941 45.7398C70.3084 45.4302 69.9384 45.0008 69.6839 44.4514C69.453 43.9457 69.3267 43.3731 69.3055 42.7335H78.1952V41.9907C78.1952 41.0466 78.0564 40.1877 77.7789 39.4139C77.5014 38.6323 77.1081 37.9591 76.5992 37.3943C76.0905 36.8216 75.4777 36.3806 74.7606 36.0711C74.0512 35.7615 73.2611 35.6068 72.3898 35.6068C71.2567 35.6068 70.2545 35.8815 69.3832 36.4309C68.5119 36.9803 67.8297 37.7386 67.3362 38.7059C66.8429 39.6731 66.5961 40.7797 66.5961 42.0255C66.5961 43.2636 66.8352 44.3663 67.3131 45.3335C67.7911 46.293 68.4735 47.0475 69.3599 47.5969ZM75.1769 39.4835C74.9225 38.9573 74.5601 38.5511 74.0898 38.2648C73.6195 37.9785 73.0646 37.8353 72.4245 37.8353C71.7923 37.8353 71.2411 37.9785 70.7708 38.2648C70.3084 38.5511 69.946 38.9573 69.6839 39.4835C69.4968 39.8646 69.3785 40.2979 69.329 40.7835H75.5316C75.4821 40.2979 75.3638 39.8646 75.1769 39.4835Z"
                          fill="var(--caseStudyLogoColor, #222326)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Linear partners with Stripe to handle billing and payments."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Linear’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p5qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p5qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "5" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/elevenlabs"
                    data-analytics-label="build_a_foundation__elevenlabs"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/Eleven_Labs-w432-ab81d69c.webp 1x, /stripe/Eleven_Labs-w864-5d4bed5c.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/Eleven_Labs-w432-31926ea9.png 1x, /stripe/Eleven_Labs-w864-3f004dab.png 2x"
                          src="/stripe/Eleven_Labs-w432-31926ea9.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="127"
                        height="60"
                        fill="none"
                        viewBox="0 0 127 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="ElevenLabs logo"
                      >
                        <path
                          d="M45.2383 36.0433H41.9957L45.9138 48.1286H49.4042L53.3223 36.0433H50.0798L47.6261 45.1468L45.2383 36.0433ZM0 32H3.35522V48.1288H1.1081e-05L0 32ZM6.66559 32H10.0208V48.1288H6.66559V32ZM13.3304 32H23.2608V34.6881H16.6856V38.5283H22.8106V41.2164H16.6856V45.4406H23.2608V48.1288H13.3304V32ZM25.31 32H28.485V48.1288H25.31V32ZM30.3989 42.075C30.3989 37.6701 32.5831 35.7726 35.9833 35.7726C39.3836 35.7726 41.3203 37.6475 41.3203 42.1202V42.843H33.5289C33.6414 45.4634 34.4296 46.3444 35.9383 46.3444C37.1317 46.3444 37.8749 45.6441 38.01 44.4243H41.185C40.9824 47.0898 38.7757 48.4 35.9383 48.4C32.3356 48.4 30.3989 46.4799 30.3989 42.075ZM38.1902 40.7422C38.0327 38.5285 37.2669 37.8056 35.9383 37.8056C34.6098 37.8056 33.7765 38.5511 33.5515 40.7422H38.1902ZM53.9303 42.075C53.9303 37.6701 56.1146 35.7726 59.5149 35.7726C62.9151 35.7726 64.8517 37.6475 64.8517 42.1202V42.843H57.0603C57.173 45.4634 57.9611 46.3444 59.4698 46.3444C60.6632 46.3444 61.4063 45.6441 61.5415 44.4243H64.7165C64.5138 47.0898 62.307 48.4 59.4698 48.4C55.8668 48.4 53.9303 46.4799 53.9303 42.075ZM61.7215 40.7422C61.564 38.5285 60.7984 37.8056 59.4698 37.8056C58.1412 37.8056 57.308 38.5511 57.0829 40.7422H61.7215ZM79.893 32H83.2482V45.4406H89.5532V48.1288H79.893V32Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M90.3415 42.075C90.3415 37.4668 92.4581 35.7726 95.1829 35.7726C96.5338 35.7726 97.7725 36.5406 98.2679 37.3539V36.0437H101.511V48.1289H98.358V46.7058C97.8851 47.6546 96.5565 48.4 95.0927 48.4C92.2106 48.4 90.3415 46.5477 90.3415 42.075ZM96.0161 38.1445C97.5922 38.1445 98.4479 39.3417 98.4479 42.075C98.4479 44.8083 97.5922 46.0281 96.0161 46.0281C94.4398 46.0281 93.5392 44.8083 93.5392 42.075C93.5392 39.3417 94.4398 38.1445 96.0161 38.1445ZM107.118 46.7056V48.1288H103.965V32H107.14V37.3537C107.681 36.5179 108.942 35.7724 110.293 35.7724C112.95 35.7724 115.067 37.4666 115.067 42.0748C115.067 46.683 112.995 48.3998 110.225 48.3998C108.762 48.3998 107.568 47.6544 107.118 46.7056ZM109.392 38.1669C110.968 38.1669 111.869 39.3415 111.869 42.0748C111.869 44.8081 110.968 46.0279 109.392 46.0279C107.816 46.0279 106.96 44.8081 106.96 42.0748C106.96 39.3415 107.816 38.1669 109.392 38.1669Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                        <path
                          d="M116.373 44.5372H119.547C119.593 45.8023 120.269 46.4121 121.462 46.4121C122.655 46.4121 123.331 45.87 123.331 44.9213C123.331 44.0629 122.813 43.7466 121.688 43.4755L120.719 43.2271C117.972 42.5268 116.598 41.7813 116.598 39.4998C116.598 37.2183 118.715 35.7726 121.417 35.7726C124.119 35.7726 126.168 36.8343 126.258 39.3417H123.083C123.016 38.2348 122.341 37.7605 121.372 37.7605C120.404 37.7605 119.728 38.2348 119.728 39.1384C119.728 39.9742 120.269 40.2905 121.214 40.5163L122.206 40.7648C124.817 41.4199 126.461 42.075 126.461 44.5146C126.461 46.9543 124.299 48.4 121.372 48.4C118.196 48.4 116.44 47.2028 116.373 44.5372ZM69.9855 41.0133C69.9855 39.1158 70.8863 38.0767 72.2825 38.0767C73.4308 38.0767 74.0839 38.7995 74.0839 40.3582V48.1289H77.2589V39.8613C77.2589 37.0602 75.6826 35.7726 73.3858 35.7726C71.832 35.7726 70.5487 36.5632 69.9855 37.6023V36.0437H66.7655V48.1289H69.9855V41.0133Z"
                          fill="var(--caseStudyLogoColor, #000)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "ElevenLabs grows into a $3B AI audio leader with Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Watch the video"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p6qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p6qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "6" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/browserbase"
                    data-analytics-label="build_a_foundation__browserbase"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/browserbase-w432-b2d6d659.webp 1x, /stripe/browserbase-w864-f7dad980.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/browserbase-w432-fe57d8e8.png 1x, /stripe/browserbase-w864-5ba8f266.png 2x"
                          src="/stripe/browserbase-w432-fe57d8e8.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="143"
                        height="60"
                        fill="none"
                        viewBox="0 0 143 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Browserbase logo"
                      >
                        <path
                          d="M0 47.9998V30.7465H5.91498C8.37991 30.7465 10.3518 32.7183 10.3518 35.1831V36.1689C10.3518 37.3029 9.93283 38.3626 9.21788 39.1267C10.2037 39.94 10.8448 41.1725 10.8448 42.5773V43.5633C10.8448 46.0281 8.87293 47.9998 6.408 47.9998H0ZM2.46475 45.5351H6.408C7.51726 45.5351 8.37991 44.6724 8.37991 43.5633V42.5773C8.37991 41.4682 7.51726 40.6056 6.408 40.6056H2.46475V45.5351ZM2.46475 38.1408H5.91498C7.02442 38.1408 7.88689 37.2782 7.88689 36.1689V35.1831C7.88689 34.074 7.02442 33.2112 5.91498 33.2112H2.46475V38.1408ZM13.407 48V35.4297H15.8717V37.3275L18.6569 35.4297H19.3719C21.6394 35.4297 23.5126 37.4016 23.5126 39.8663V40.8522H21.0476V39.8663C21.0476 38.7817 20.3579 37.8944 19.3719 37.8944H19.1498L15.8717 40.0881V48H13.407ZM29.5083 48C27.0439 48 25.072 46.0528 25.072 43.588V39.8663C25.072 37.4016 27.0439 35.4297 29.5083 35.4297H31.4802C33.945 35.4297 35.9169 37.4016 35.9169 39.8663V43.588C35.9169 46.0528 33.945 48 31.4802 48H29.5083ZM27.537 43.588C27.537 44.6973 28.3994 45.5106 29.5083 45.5353H31.4802C32.5895 45.5353 33.4521 44.6973 33.4521 43.588V39.8663C33.4521 38.7571 32.5895 37.8944 31.4802 37.8944H29.5083C28.3994 37.8944 27.537 38.7571 27.537 39.8663V43.588ZM40.4079 48L38.0664 41.0986V35.4297H40.5313V40.3593L41.7634 44.2783L43.8587 37.648H45.88L47.9747 44.2783L49.2074 40.3593V35.4297H51.6721V41.0986L49.3308 48H47.2355L44.8693 42.1091L42.5032 48H40.4079ZM57.7548 48C55.3641 48 53.5896 46.4473 53.5896 44.3521V43.8591H56.0544V44.3521C56.0544 45.1409 56.6949 45.7078 57.7548 45.7078H59.9976C61.1563 45.7078 61.7233 45.2395 61.7233 44.5247C61.7233 41.7395 53.7618 43.5389 53.7618 38.7571C53.7618 36.7607 55.3641 35.4297 57.7055 35.4297H59.8254C62.0436 35.4297 63.7687 37.0318 63.7687 39.1022V39.3239H61.3043V39.1022C61.3043 38.3136 60.6881 37.722 59.8254 37.722H57.7055C56.6702 37.722 56.2266 38.141 56.2266 38.7571C56.2266 40.7537 64.1877 39.4965 64.1877 44.5247C64.1877 46.5952 62.4872 48 59.9976 48H57.7548ZM70.5953 48C68.1551 48 66.1585 45.9789 66.1585 43.5389V39.8663C66.1585 37.4016 68.1551 35.4297 70.5953 35.4297H72.567C74.9579 35.4297 76.8805 37.2782 77.0039 39.6197V42.2817H68.6234V43.5389C68.6234 44.6232 69.5105 45.5106 70.5953 45.5106H72.567C73.6518 45.5106 74.5389 44.6232 74.5389 43.5389V43.2923H77.0039V43.5389C77.0039 45.9789 75.032 48 72.567 48H70.5953ZM68.6234 40.31H74.5389V39.8663C74.5389 38.7571 73.6759 37.8944 72.567 37.8944H70.5953C69.4859 37.8944 68.6234 38.7817 68.6234 39.8663V40.31ZM79.6715 48V35.4297H82.1362V37.3275L84.9214 35.4297H85.6358C87.9033 35.4297 89.777 37.4016 89.777 39.8663V40.8522H87.3121V39.8663C87.3121 38.7817 86.6218 37.8944 85.6358 37.8944H85.4142L82.1362 40.0881V48H79.6715ZM96.2654 47.9998L94.2195 46.6196V47.9998H91.7546V30.5H94.2195V36.8098L96.2654 35.4295H98.1633C100.603 35.4295 102.6 37.4014 102.6 39.8661V43.5633C102.6 46.0034 100.603 47.9998 98.1633 47.9998H96.2654ZM94.2195 43.6372L97.0292 45.5351H98.1633C99.2479 45.5351 100.135 44.6477 100.135 43.5633V39.8661C100.135 38.7816 99.2479 37.8942 98.1633 37.8942H97.0292L94.2195 39.7923V43.6372ZM109.3 48C106.86 48 104.863 46.0036 104.863 43.5635V39.8663C104.863 37.4016 106.86 35.4297 109.3 35.4297H111.198L113.243 36.81V35.4297H115.708V48H113.243V46.6198L111.198 48H109.3ZM107.328 43.5635C107.328 44.6479 108.215 45.5353 109.3 45.5353H110.433L113.243 43.6374V39.7923L110.433 37.8944H109.3C108.215 37.8944 107.328 38.7817 107.328 39.8663V43.5635ZM122.334 48C119.943 48 118.169 46.4473 118.169 44.3521V43.8591H120.634V44.3521C120.634 45.1409 121.274 45.7078 122.334 45.7078H124.577C125.735 45.7078 126.303 45.2395 126.303 44.5247C126.303 41.7395 118.342 43.5389 118.342 38.7571C118.342 36.7607 119.943 35.4297 122.285 35.4297H124.405C126.623 35.4297 128.348 37.0318 128.348 39.1022V39.3239H125.884V39.1022C125.884 38.3136 125.267 37.722 124.405 37.722H122.285C121.249 37.722 120.806 38.141 120.806 38.7571C120.806 40.7537 128.767 39.4965 128.767 44.5247C128.767 46.5952 127.066 48 124.577 48H122.334ZM135.174 48C132.735 48 130.738 45.9789 130.738 43.5389V39.8663C130.738 37.4016 132.735 35.4297 135.174 35.4297H137.147C139.536 35.4297 141.46 37.2782 141.584 39.6197V42.2817H133.202V43.5389C133.202 44.6232 134.09 45.5106 135.174 45.5106H137.147C138.231 45.5106 139.118 44.6232 139.118 43.5389V43.2923H141.584V43.5389C141.584 45.9789 139.611 48 137.147 48H135.174ZM133.202 40.31H139.118V39.8663C139.118 38.7571 138.256 37.8944 137.147 37.8944H135.174C134.066 37.8944 133.202 38.7817 133.202 39.8663V40.31Z"
                          fill="var(--caseStudyLogoColor, #100d0d)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Browserbase offers usage-based billing for an AI agent browser with Stripe."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Browserbase’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p7qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p7qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
              <li
                className="carousel__item case-study-carousel__item"
                style={{ "--carousel-item-index": "7" }}
              >
                <div
                  className="carousel__inner case-study-carousel__inner"
                  style={{
                    "--carousel-item-hover-scale": "1.000000",
                    "--carousel-item-hover-shift": "0px",
                  }}
                >
                  <a
                    className="case-study-card"
                    href="/customers/decagon"
                    data-analytics-label="build_a_foundation__decagon"
                  >
                    <div className="case-study-card__media">
                      <picture>
                        <source
                          type="image/webp"
                          srcSet="/stripe/decagon-w432-c0b1dca6.webp 1x, /stripe/decagon-w864-d467fc6f.webp 2x"
                        />
                        <img
                          loading="lazy"
                          width="864"
                          height="960"
                          alt=""
                          className="case-study-card__image"
                          srcSet="/stripe/decagon-w432-817e86ba.png 1x, /stripe/decagon-w864-2491b504.png 2x"
                          src="/stripe/decagon-w432-817e86ba.png"
                        />
                      </picture>
                    </div>
                    <div className="case-study-card__mediaLogo">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="139"
                        height="60"
                        fill="none"
                        viewBox="0 0 139 60"
                        className="case-study-card__logo case-study-logo--flat"
                        role="img"
                        aria-label="Decagon logo"
                      >
                        <path
                          d="M103.918 35.6309C104.738 35.6309 105.472 35.8125 106.119 36.1748C106.766 36.5213 107.239 36.9702 107.539 37.5215V35.9619H110.356V47.7539C110.356 48.762 110.143 49.6597 109.717 50.4473C109.307 51.2349 108.66 51.8576 107.776 52.3145C106.893 52.7713 105.78 53 104.438 53C102.845 53 101.59 52.6848 100.675 52.0547C99.7755 51.4246 99.2391 50.5029 99.0654 49.29H102.001C102.127 49.8097 102.395 50.1953 102.806 50.4473C103.232 50.6993 103.807 50.8252 104.533 50.8252C105.527 50.8252 106.277 50.5735 106.782 50.0693C107.287 49.5653 107.539 48.8328 107.539 47.8721V45.8398C107.223 46.4068 106.75 46.8634 106.119 47.21C105.504 47.5565 104.77 47.7304 103.918 47.7305C102.924 47.7305 102.016 47.5018 101.195 47.0449C100.375 46.5723 99.7282 45.8784 99.2549 44.9648C98.7816 44.0512 98.5449 42.9565 98.5449 41.6807C98.5449 40.4205 98.7815 39.3336 99.2549 38.4199C99.7282 37.5063 100.375 36.8125 101.195 36.3398C102.016 35.8672 102.924 35.6309 103.918 35.6309ZM30.7988 47.0879L21.3652 52.5996L17.4844 50.332L26.917 44.8203L30.7988 47.0879ZM3.86816 37.8398V44.3271L9.41992 47.5713V52.1074L0 46.6035V35.5791L3.86816 37.8398ZM26.0752 43.3584L11.1035 52.1074V47.5723L26.0752 38.8242V43.3584ZM64.3867 35.6084C65.6015 35.6085 66.6583 35.892 67.5576 36.459C68.4729 37.0261 69.1835 37.8534 69.6885 38.9404C70.1933 40.0116 70.4539 41.3033 70.4697 42.8154H61.2041C61.244 43.3933 61.3883 43.921 61.6406 44.3984C61.9404 44.9498 62.3428 45.3832 62.8477 45.6982C63.3684 46.0133 63.968 46.1709 64.6465 46.1709C65.2777 46.1709 65.7987 46.0527 66.209 45.8164C66.635 45.5801 66.9502 45.2649 67.1553 44.8711H70.1377C69.8221 45.9423 69.1756 46.8014 68.1973 47.4473C67.2348 48.0774 66.0354 48.3925 64.5996 48.3926C63.3214 48.3926 62.2085 48.1322 61.2617 47.6123C60.315 47.0767 59.5813 46.3281 59.0605 45.3672C58.5557 44.4063 58.3027 43.2876 58.3027 42.0117C58.3028 40.7831 58.5796 39.6807 59.1318 38.7041C59.6841 37.7274 60.4255 36.9711 61.3564 36.4355C62.2875 35.8842 63.2979 35.6084 64.3867 35.6084ZM119.075 35.6084C120.227 35.6084 121.277 35.8842 122.224 36.4355C123.17 36.9712 123.911 37.7275 124.447 38.7041C124.984 39.6808 125.253 40.7753 125.253 41.9883C125.253 43.2171 124.984 44.3202 124.447 45.2969C123.911 46.2733 123.17 47.0376 122.224 47.5889C121.277 48.1245 120.227 48.3926 119.075 48.3926C117.907 48.3926 116.85 48.1245 115.903 47.5889C114.957 47.0375 114.215 46.2735 113.679 45.2969C113.142 44.3202 112.874 43.2171 112.874 41.9883C112.874 40.7754 113.142 39.6808 113.679 38.7041C114.215 37.7274 114.957 36.9711 115.903 36.4355C116.85 35.8842 117.907 35.6084 119.075 35.6084ZM78.2314 35.6309C79.2413 35.6309 80.1331 35.8202 80.9062 36.1982C81.6952 36.5606 82.3187 37.0574 82.7764 37.6875C83.2496 38.3175 83.5495 39.0183 83.6758 39.79H80.8594C80.67 39.223 80.3539 38.7742 79.9121 38.4434C79.4861 38.1126 78.9419 37.9473 78.2793 37.9473C77.6639 37.9473 77.1189 38.1048 76.6455 38.4199C76.1723 38.7349 75.7937 39.1994 75.5098 39.8135C75.2415 40.4279 75.1074 41.161 75.1074 42.0117C75.1074 42.878 75.2416 43.6181 75.5098 44.2324C75.7938 44.8311 76.1645 45.2884 76.6221 45.6035C77.0954 45.9028 77.6319 46.0527 78.2314 46.0527C78.9258 46.0527 79.486 45.8865 79.9121 45.5557C80.3539 45.2248 80.6777 44.7838 80.8828 44.2324H83.6758C83.5653 44.9886 83.2732 45.69 82.7998 46.3359C82.3264 46.966 81.6875 47.4706 80.8828 47.8486C80.0939 48.2109 79.1866 48.3915 78.1611 48.3916C77.0092 48.3916 75.9748 48.1322 75.0596 47.6123C74.1444 47.0924 73.427 46.3593 72.9062 45.4141C72.4013 44.4532 72.1485 43.3192 72.1484 42.0117C72.1484 40.7514 72.409 39.6407 72.9297 38.6797C73.4504 37.703 74.1687 36.9544 75.084 36.4346C76.0148 35.8991 77.064 35.6309 78.2314 35.6309ZM91.1943 35.6084C92.2989 35.6084 93.2145 35.7583 93.9404 36.0576C94.6661 36.3412 95.2027 36.766 95.5498 37.333C95.9127 37.9 96.0937 38.5854 96.0938 39.3887V45.1309C96.0938 45.6035 96.134 46.1002 96.2129 46.6201C96.2918 47.1242 96.3856 47.597 96.4961 48.0381H93.6797C93.5534 47.471 93.4663 46.9425 93.4189 46.4541C93.0876 46.9897 92.5828 47.4471 91.9043 47.8252C91.2416 48.1874 90.4369 48.3682 89.4902 48.3682C88.2753 48.3682 87.2494 48.0539 86.4131 47.4238C85.5926 46.778 85.1827 45.8718 85.1826 44.7061C85.1826 43.8081 85.4268 43.1067 85.916 42.6025C86.4209 42.0827 87.0053 41.7204 87.668 41.5156C88.3306 41.3109 89.1038 41.1455 89.9873 41.0195L90.8633 40.9248C91.4785 40.846 91.9519 40.7518 92.2832 40.6416C92.6304 40.5313 92.8832 40.3737 93.041 40.1689C93.2145 39.9642 93.3007 39.6727 93.3008 39.2949C93.3008 38.791 93.1118 38.3968 92.7334 38.1133C92.3705 37.814 91.8494 37.6641 91.1709 37.6641C90.5083 37.6641 89.9718 37.7978 89.5615 38.0654C89.1512 38.3175 88.8984 38.6567 88.8037 39.082H85.7031C85.8451 38.4046 86.1449 37.806 86.6025 37.2861C87.0759 36.7663 87.6994 36.3569 88.4727 36.0576C89.2458 35.7583 90.1529 35.6084 91.1943 35.6084ZM134.122 35.6084C134.943 35.6084 135.653 35.7813 136.253 36.1279C136.868 36.4588 137.334 36.9557 137.649 37.6172C137.981 38.2629 138.146 39.0504 138.146 39.9795V48.0381H135.306V40.2158C135.306 39.5228 135.14 38.9711 134.809 38.5615C134.493 38.1364 133.988 37.9239 133.294 37.9238C132.821 37.9238 132.378 38.042 131.968 38.2783C131.558 38.5146 131.226 38.8933 130.974 39.4131C130.721 39.917 130.596 40.547 130.596 41.3027V48.0381H127.755V35.9629H130.524V37.5225C130.887 36.9554 131.368 36.4979 131.968 36.1514C132.583 35.789 133.302 35.6084 134.122 35.6084ZM47.8018 31.4961C49.4586 31.4961 50.9499 31.843 52.2754 32.5361C53.6007 33.2293 54.6344 34.2057 55.376 35.4658C56.1334 36.7103 56.5117 38.144 56.5117 39.7666C56.5117 41.3891 56.1333 42.8306 55.376 44.0908C54.6343 45.3353 53.6009 46.3049 52.2754 46.998C50.9499 47.6912 49.4586 48.0371 47.8018 48.0371H42.3574V31.4961H47.8018ZM93.3008 41.7754C93.0957 42.0432 92.8121 42.2565 92.4492 42.4141C92.1021 42.5558 91.5733 42.6817 90.8633 42.792C89.9165 42.9495 89.2298 43.1465 88.8037 43.3828C88.3777 43.6191 88.1651 44.0285 88.165 44.6113C88.165 45.1154 88.3623 45.5094 88.7568 45.793C89.1513 46.0606 89.6562 46.1943 90.2715 46.1943C90.871 46.1943 91.3999 46.0608 91.8574 45.793C92.3148 45.5253 92.6694 45.155 92.9219 44.6826C93.1744 44.1943 93.3008 43.6581 93.3008 43.0752V41.7754ZM25.2461 37.3564L10.2617 46.1123L6.38086 43.8447L21.3652 35.0879L25.2461 37.3564ZM119.075 37.9004C118.412 37.9004 117.828 38.0657 117.323 38.3965C116.834 38.7116 116.448 39.1767 116.164 39.791C115.896 40.4054 115.762 41.1377 115.762 41.9883C115.762 42.8547 115.896 43.6033 116.164 44.2334C116.448 44.8477 116.834 45.3129 117.323 45.6279C117.828 45.943 118.412 46.1006 119.075 46.1006C119.738 46.1006 120.314 45.9428 120.803 45.6279C121.292 45.3129 121.671 44.8478 121.939 44.2334C122.223 43.6033 122.365 42.8547 122.365 41.9883C122.365 41.1378 122.223 40.4053 121.939 39.791C121.671 39.1766 121.292 38.7116 120.803 38.3965C120.314 38.0658 119.738 37.9004 119.075 37.9004ZM31.6279 34.5957V45.6191L27.7598 43.3594V36.8711L22.208 33.626V29.0908L31.6279 34.5957ZM104.486 37.8057C103.855 37.8057 103.31 37.9632 102.853 38.2783C102.395 38.5934 102.048 39.0422 101.812 39.625C101.575 40.1921 101.456 40.8772 101.456 41.6807C101.456 42.8937 101.717 43.8469 102.237 44.54C102.758 45.2174 103.508 45.5557 104.486 45.5557C105.102 45.5556 105.638 45.3903 106.096 45.0596C106.569 44.7288 106.932 44.2722 107.185 43.6895C107.453 43.0908 107.587 42.4211 107.587 41.6807C107.587 40.9245 107.453 40.2548 107.185 39.6719C106.932 39.0891 106.569 38.6326 106.096 38.3018C105.638 37.971 105.102 37.8057 104.486 37.8057ZM45.3398 45.5088H47.5645C48.8111 45.5088 49.8771 45.2888 50.7607 44.8477C51.6601 44.3908 52.3383 43.7364 52.7959 42.8857C53.2692 42.0193 53.5059 40.9795 53.5059 39.7666C53.5058 38.5536 53.2693 37.5216 52.7959 36.6709C52.3384 35.8047 51.6599 35.151 50.7607 34.71C49.8771 34.2531 48.8111 34.0244 47.5645 34.0244H45.3398V45.5088ZM20.5244 33.626L5.55176 42.375V37.8398L20.5244 29.0908V33.626ZM64.4814 37.8535C63.866 37.8535 63.3057 38.0111 62.8008 38.3262C62.3117 38.6254 61.917 39.0503 61.6172 39.6016C61.4294 39.9556 61.3049 40.3341 61.2412 40.7363H67.6436C67.5211 40.0073 67.2572 39.3923 66.8477 38.8926C66.2797 38.1997 65.491 37.8536 64.4814 37.8535ZM14.1426 30.8672L4.70996 36.3789L0.829102 34.1113L10.2617 28.5996L14.1426 30.8672Z"
                          fill="var(--caseStudyLogoColor, #111111)"
                        />
                      </svg>
                    </div>
                    <h4 className="hds-text case-study-card__title hds-text--md">
                      {
                        "Decagon decreases support costs by 65% with Stripe-integrated agents."
                      }
                    </h4>
                    <div className="hds-link fake-link case-study-card__link hds-link--callout">
                      {"Read Decagon’s story"}
                      <span className="hds-nowrap-svg">
                        <span className="hds-nowrap-svg">
                          <svg
                            className="hds-icon hds-icon-hover-arrow"
                            width="5"
                            height="8"
                            fill="none"
                            viewBox="0 0.5 5 8"
                          >
                            <defs>
                              <clipPath id=":R1p8qnnmr6l6:">
                                <rect x="0" y="0" width="12" height="9" />
                              </clipPath>
                            </defs>
                            <g clipPath="url(#:R1p8qnnmr6l6:)">
                              <g className="arrow-group">
                                <rect
                                  className="shaft"
                                  x="-10"
                                  y="3.375"
                                  width="13"
                                  height="1.75"
                                  fill="currentColor"
                                />
                                <path
                                  d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                                  fill="currentColor"
                                />
                              </g>
                            </g>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>
        <div className="startups__program-card-grid">
          <a
            className="startups-program-card startups__program-card--startups"
            href="/startups#application"
            data-analytics-label="stripe_startups_program___apply_now"
          >
            <div className="startups-program-card__border">
              <div className="startups-program-card__border-color">
                <div className="startups-program-card__border-color-gradient"></div>
              </div>
            </div>
            <div className="startups-program-card__inner">
              <div className="startups-program-card__content">
                <div className="startups-program-card__text">
                  <h4 className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                    {"Stripe Startups program."}
                  </h4>
                  <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    {
                      "Access financial benefits, a focused community, and expert resources to help you grow your business."
                    }
                  </p>
                </div>
                <div className="hds-link fake-link startups-program-card-action hds-link--callout">
                  {"Apply now"}
                  <span className="hds-nowrap-svg">
                    <span className="hds-nowrap-svg">
                      <svg
                        className="hds-icon hds-icon-hover-arrow"
                        width="5"
                        height="8"
                        fill="none"
                        viewBox="0 0.5 5 8"
                      >
                        <defs>
                          <clipPath id=":Red7nnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Red7nnmr6l6:)">
                          <g className="arrow-group">
                            <rect
                              className="shaft"
                              x="-10"
                              y="3.375"
                              width="13"
                              height="1.75"
                              fill="currentColor"
                            />
                            <path
                              d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                              fill="currentColor"
                            />
                          </g>
                        </g>
                      </svg>
                    </span>
                  </span>
                </div>
              </div>
              <div className="startups-program-card__graphic">
                <div className="startups__startups-graphic">
                  <picture className="startups__startups-graphic-background">
                    <source
                      type="image/webp"
                      srcSet="/stripe/card_startups-w585-45c1d9e7-mono.webp 1x, /stripe/card_startups-w1169-a9395759-mono.webp 2x"
                    />
                    <img
                      loading="lazy"
                      width="1169"
                      height="472"
                      alt=""
                      srcSet="/stripe/card_startups-w585-3c117cfa-mono.png 1x, /stripe/card_startups-w1169-8d8d64b4-mono.png 2x"
                      src="/stripe/card_startups-w585-3c117cfa-mono.png"
                    />
                  </picture>
                </div>
              </div>
            </div>
          </a>
          <a
            className="startups-program-card startups__program-card--atlas"
            href="/atlas"
            data-analytics-label="stripe_atlas___start_your_company"
          >
            <div className="startups-program-card__border">
              <div className="startups-program-card__border-color">
                <div className="startups-program-card__border-color-gradient"></div>
              </div>
            </div>
            <div className="startups-program-card__inner">
              <div className="startups-program-card__content">
                <div className="startups-program-card__text">
                  <h4 className="hds-text hds-text--md hds-text--emphasized hds-text--inline">
                    {"Stripe Atlas."}
                  </h4>
                  <p className="hds-text hds-text--md hds-text--inline hds-text--soft">
                    {
                      "Incorporate and get everything you need to fundraise, bank, and accept payments in two business days."
                    }
                  </p>
                </div>
                <div className="hds-link fake-link startups-program-card-action hds-link--callout">
                  {"Start your company"}
                  <span className="hds-nowrap-svg">
                    <span className="hds-nowrap-svg">
                      <svg
                        className="hds-icon hds-icon-hover-arrow"
                        width="5"
                        height="8"
                        fill="none"
                        viewBox="0 0.5 5 8"
                      >
                        <defs>
                          <clipPath id=":Redbnnmr6l6:">
                            <rect x="0" y="0" width="12" height="9" />
                          </clipPath>
                        </defs>
                        <g clipPath="url(#:Redbnnmr6l6:)">
                          <g className="arrow-group">
                            <rect
                              className="shaft"
                              x="-10"
                              y="3.375"
                              width="13"
                              height="1.75"
                              fill="currentColor"
                            />
                            <path
                              d="M4.84766 3.63379L5.45898 4.25L4.84766 4.86621L1.24219 8.49902L0 7.2666L2.99316 4.24902L0 1.23242L1.24219 0L4.84766 3.63379Z"
                              fill="currentColor"
                            />
                          </g>
                        </g>
                      </svg>
                    </span>
                  </span>
                </div>
              </div>
              <div className="startups-program-card__graphic">
                <div className="startups__atlas-graphic">
                  <svg
                    className="startups__atlas-graphic-background"
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M19.9952 1c.9747 0 1.8657.5513 2.3006 1.42365l7.9975 15.99495 8.425 16.8558c.3991.7977.3569 1.7452-.1118 2.5041-.3437.5566-.8808.9537-1.4945 1.126l-.1692.0412c-.114.0238-.2301.04-.3478.0481L36.4176 39l-16.4224-3.2655L9.69702 18.4186 17.6945 2.42365C18.1295 1.5513 19.0204 1 19.9952 1"
                      fill="#9a9a9a"
                    />
                    <path
                      d="M19.9952 1c.9748 0 1.8657.5513 2.3007 1.42365l7.9975 15.99495-10.2982 17.3159L3.5728 39c-.892 0-1.72022-.4625-2.1889-1.2215-.468672-.7589-.510968-1.7064-.11178-2.5041l8.42495-16.8558L17.6945 2.42365C18.1295 1.5513 19.0204 1 19.9952 1"
                      fill="url(#atlas-gradient-a-:R7nmr6l6:)"
                    />
                    <path
                      d="M19.9952 1c.9747 0 1.8657.5513 2.3006 1.42365l7.9975 15.99495-10.2981 17.3159L9.69702 18.4186 17.6945 2.42365c.4078-.81782 1.2163-1.35348 2.119-1.41725z"
                      fill="url(#atlas-gradient-b-:R7nmr6l6H1:)"
                    />
                    <defs>
                      <linearGradient
                        id="atlas-gradient-a-:R7nmr6l6:"
                        x1="15.6303"
                        y1="18.2379"
                        x2="15.545"
                        y2="38.9999"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#dedede" />
                        <stop offset=".5362" stopColor="#cacaca" />
                        <stop offset="1" stopColor="#b8b8b8" />
                      </linearGradient>
                      <linearGradient
                        id="atlas-gradient-b-:R7nmr6l6H1:"
                        x1="19.9976"
                        y1="34.5164"
                        x2="19.9976"
                        y2="15.3186"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#6a6a6a" />
                        <stop offset="1" stopColor="#454545" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>
    </>
  );
}
