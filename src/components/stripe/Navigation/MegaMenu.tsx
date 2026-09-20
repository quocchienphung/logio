import { LinkArrow, MenuHoverArrow } from "@/components/stripe/icons";
import type { Menu, MenuBlock } from "./menus";

const SESSIONS_WEBP =
  "/stripe/sessions-2026-nav-bg-w296-e55dd792-mono.webp 296w, /stripe/sessions-2026-nav-bg-w396-8b45e3e2-mono.webp 396w, /stripe/sessions-2026-nav-bg-w608-6cea0791-mono.webp 608w, /stripe/sessions-2026-nav-bg-w760-79f2d73d-mono.webp 760w";
const SESSIONS_PNG =
  "/stripe/sessions-2026-nav-bg-w296-8b481d86-mono.png 296w, /stripe/sessions-2026-nav-bg-w396-36bd9070-mono.png 396w, /stripe/sessions-2026-nav-bg-w608-2cc90536-mono.png 608w, /stripe/sessions-2026-nav-bg-w760-85301b8b-mono.png 760w";

function SessionsBanner() {
  return (
    <div className="sessions-banner">
      <div className="sessions-banner__card">
        <div className="sessions-banner__content">
          <div>
            <span className="hds-text hds-text--sm hds-text--emphasized" id="sessions-banner-opening-text">
              Stripe Sessions 2026
            </span>
            <span className="hds-text hds-text--sm hds-text--subdued">See how Stripe is building the economic infrastructure for AI.</span>
          </div>
          <a className="hds-link sessions-banner__link hds-link--callout" href="/sessions/2026" target="_blank" rel="noopener noreferrer" aria-describedby="sessions-banner-opening-text">
            Watch now
            <LinkArrow />
          </a>
        </div>
        <picture className="sessions-banner__picture">
          <source type="image/webp" srcSet={SESSIONS_WEBP} />
          <img
            loading="lazy"
            width="760"
            height="256"
            alt=""
            className="sessions-banner__image"
            sizes="(min-width: 1300px) 246px, (min-width: 940px) 460px, (min-width: 446px) 90vw, 100vw"
            srcSet={SESSIONS_PNG}
            src="/stripe/sessions-2026-nav-bg-w296-8b481d86-mono.png"
          />
        </picture>
      </div>
    </div>
  );
}

function Block({ block, menuId }: { block: MenuBlock; menuId: Menu["id"] }) {
  const Tag = block.tag;
  const headingClass =
    menuId === "products" ? (block.tag === "aside" ? "hds-heading aside-title hds-heading--xxs" : "hds-heading suite-title hds-heading--xxs") : "hds-heading hds-heading--xxs";
  return (
    <Tag className={block.className}>
      <span className={headingClass} id={block.titleId}>
        {block.title}
      </span>
      <ul className="navigation__links" aria-labelledby={block.titleId}>
        {block.links.map((l) => (
          <li key={l.href + l.label}>
            <a className="hds-link" href={l.href}>
              <span className="navigation-hover-arrow">
                {l.label}
                <MenuHoverArrow />
              </span>
              {l.desc ? <span className="hds-text hds-text--sm">{l.desc}</span> : null}
            </a>
          </li>
        ))}
      </ul>
      {block.banner === "sessions" ? <SessionsBanner /> : null}
    </Tag>
  );
}

export function MegaMenuContent({ menu }: { menu: Menu }) {
  return (
    <div className={`navigation__content navigation__content--${menu.id}`}>
      {menu.blocks.map((b) => (
        <Block key={b.titleId} block={b} menuId={menu.id} />
      ))}
      {menu.personalize ? (
        <div className="personalize-banner">
          <span className="hds-text hds-text--sm hds-text--subdued" id="personalize-banner-text">
            <strong className="hds-text hds-text--sm hds-text--emphasized">Not sure where to start?</strong>{" "}
            Tell us about your business to get personalized Stripe product recommendations.
          </span>
          <a className="hds-link hds-link--callout" href="/personalize" aria-describedby="personalize-banner-text">
            Find what&apos;s right for you
            <LinkArrow />
          </a>
        </div>
      ) : null}
    </div>
  );
}
