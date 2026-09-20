// Partition the authored Stripe stylesheet into per-component files.
// Every rule is assigned to exactly one bucket by the first owning class prefix found in its
// selector (see BUCKETS); rules that only use design-system primitives go to "foundation";
// rules for components not on the homepage go to docs/research/stripe-live/unused.css.
// Layers, @media, @container and @supports contexts are preserved. Keyframes are assigned
// by name prefix.
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const BUCKETS = {
  // bucket name → class prefixes (matched as .prefix, .prefix--x, .prefix__x)
  tokens: ["__tokens__"],
  navigation: ["navigation-hover-arrow", "navigation-hamburger", "navigation-menu-header", "navigation-menu-footer", "navigation-menu-home-link", "navigation-menu-overflow", "locale-switcher", "link-brand-logo", "mobile-safari-solid-bars", "NotificationsShell_notifications-shell", "navigation", "navigation-item", "navigation-menu", "navigation-menu-list", "navigation-hamburger-button", "hds-navigation-menu", "personalize-banner", "navigation-mobile", "guide-me"],
  hero: ["hero-section", "hero-wave-animation", "hero-logo-wall-section", "logo-carousel", "hds-hero", "hero-logo-section", "customer-logo", "divider-canvas-wrapper", "divider-container"],
  solutions: ["modular-solutions-bento", "modular-solutions-bento-card", "bento-overlay-gradient", "bento-dialog", "bento-dialog-card", "bento-dialog-graphics", "bento-dialog-graphics-container", "bento-dialog-graphic", "bento-dialog-layout", "bento-dialog-footer", "bento-card", "bento-dialog-intro", "bento-dialog-list", "bento-dialog-cards", "bento-dialog-reveal", "bento-dialog-detail", "modular-solutions-section", "feature-detail", "cross-toggle-icon", "double-up-effect", "phone-graphic", "statusbar-mode", "agentic-graphic", "agentic-commerce-bento-modal-graphic", "authorization-boost-graphic", "connect-payments-line-graphic", "code-autocomplete"],
  "graphics/payments": ["payments-graphic", "mobile-payments-graphic", "terminal-graphic"],
  "graphics/billing": ["billing-plan-graphic", "usage-based-billing-graphic", "usage-based-billing-invoice", "pay-as-you-go-graphic", "invoicing-graphic"],
  "graphics/agentic": ["agentic-commerce-graphic", "agentic-commerce-ai-graphic", "agentic-commerce-checkout-graphic", "agentic-commerce-protocol-graphic", "agent-toolkit-graphic", "shared-payment-tokens-graphic"],
  "graphics/issuing": ["issuing-card-balance-graphic", "issuing-spending-limit-graphic", "crypto-issuing-graphic", "authorization-graphic", "fraud-and-risk-graphic", "radar-graphic"],
  "graphics/crypto": ["globe", "crypto-payment-form-graphic", "crypto-account-balance-graphic", "crypto-wallets-graphic", "financial-accounts-graphic", "capital-graphic", "tax-graphic", "instant-payouts-graphic"],
  "graphics/connect": ["connect-platform-graphic", "connect-payments-payouts-graphic", "connect-payments-dashboard-graphic", "connect-graphic", "multilingual-support-graphic", "multilingual-support-section"],
  query: ["LegalDisclaimer", "personalize-section", "query-box", "homepage-query-box", "query-input", "gradient-border-input", "hds-textarea"],
  sessions: ["sessions-banner", "sessions-section", "sessions-on-demand-content-description", "sessions-on-demand-content-logo", "sessions-on-demand"],
  stats: ["data-viz", "stats-section", "stats-menu", "stats-animation-gradient", "time-of-day-select", "time-of-day-select-icon", "stats-list"],
  business: ["platform-graphic-browser-card-item", "platform-graphic-browser-content", "platform-graphic-browser-sidebar-nav", "platform-graphic-browser-sidebar-company-logo", "platform-graphic-browser-sidebar-company", "platform-graphic-browser-sidebar", "platform-graphic-browser-container", "platform-graphic-browser-cards", "platform-graphic-features", "business-sizes-section", "customer-stories", "case-study-card", "customer-story-button", "startups", "startups-program-card", "testimonial-carousel", "testimonial-card", "company-graphic", "platform-graphic", "implementation-flow-list", "carousel", "squeezy-carousel", "hds-resource-card", "hds-accordion", "hds-details", "case-study-carousel", "carousel-pagination", "startups-carousel", "testimonial-carousel-container"],
  developers: ["developer-systems-logo", "animated-dot-grid-background", "user-icon", "all-products-diffuse-wave", "developer-systems-animation", "developers-scale-subsection", "no-code-graphic", "integrated-platforms-graphic", "integrated-code-graphic", "browser-graphic", "developers-section", "developers-wave-animation"],
  news: ["events-carousel", "book-of-the-week", "book-button", "news-section", "events-mobile-carousel-card"],
  cta: ["footer-cta-section"],
  footer: ["footer", "footer-links-block", "hds-globalization-picker", "footer-links", "footer-links-section", "footer-bottom"],
  unused: ["pricing-table", "hds-dialog", "hds-input-group", "hds-select", "hds-listbox", "hds-field", "hds-switch", "hds-checkbox", "hds-phone-input", "hds-select-tile", "hds-tooltip", "hds-positioner", "hds-group", "hds-textinput", "hds-form", "hds-radio", "DevMissingIntlBanner_banner", "DevMissingIntlBanner_cmdCode", "DevMissingIntlBanner_strong", "DevMissingIntlBanner_locale", "DevMissingIntlBanner_cmd", "ThirdPartyFrame", "hds-field-error", "hds-select-value", "footer-newsletter", "pricing-tables", "pricing-section", "hds-autocomplete", "hds-popover", "pricing-section-header", "hds-select-tile-group", "hds-label"],
};

const KEYFRAME_BUCKETS = Object.fromEntries(
  Object.entries(BUCKETS).flatMap(([b, ps]) => ps.map((p) => [p, b])),
);

const css = fs.readFileSync("docs/research/stripe-live/css/all.css", "utf8");
const root = postcss.parse(css);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchers = Object.entries(BUCKETS).map(([b, ps]) => [b, new RegExp(`\\.(${ps.map(esc).join("|")})(?:--[\\w-]+|__[\\w-]+)?(?![\\w-])`)]);

function bucketFor(selector) {
  if (/^(:root|.hds-mode--(light|dark|default))(,|$)/.test(selector.trim()) && !/ /.test(selector.trim())) return "tokens";
  // pick the bucket whose prefix appears earliest in the selector (outermost owner wins)
  let best = null, bestIdx = Infinity;
  for (const [b, re] of matchers) {
    const m = re.exec(selector);
    if (m && m.index < bestIdx) { best = b; bestIdx = m.index; }
  }
  return best || "foundation";
}

const outputs = {};
const ensure = (b) => (outputs[b] ||= postcss.root());
const seen = new Set();

function placeInto(bucketRoot, node) {
  const chain = [];
  let p = node.parent;
  while (p && p.type === "atrule") { chain.push(p); p = p.parent; }
  let target = bucketRoot;
  for (const at of chain.reverse()) {
    const key = at.name + " " + at.params;
    // Only reuse the immediately preceding sibling so the reference source order is preserved.
    const last = target.nodes?.[target.nodes.length - 1];
    let existing = last && last.type === "atrule" && last.name + " " + last.params === key ? last : null;
    if (!existing) { existing = postcss.atRule({ name: at.name, params: at.params }); target.append(existing); }
    target = existing;
  }
  target.append(node.clone());
}

root.walk((node) => {
  if (node.type === "rule") {
    // skip rules that live inside @keyframes (handled with the keyframes at-rule)
    let p = node.parent; while (p && p.type === "atrule") { if (p.name === "keyframes") return; p = p.parent; }
    if (node.selector.startsWith("@")) return;
    const sig = node.selector + "::" + node.nodes.map(String).join(";") + "::" + ctxKey(node);
    if (seen.has(sig)) return;
    seen.add(sig);
    placeInto(ensure(bucketFor(node.selector)), node);
  } else if (node.type === "atrule" && node.name === "keyframes") {
    const name = node.params;
    const b = Object.keys(KEYFRAME_BUCKETS).filter((p) => name.startsWith(p)).sort((a, c) => c.length - a.length)[0];
    const sig = "kf::" + name + "::" + node.toString();
    if (seen.has(sig)) return;
    seen.add(sig);
    placeInto(ensure(b ? KEYFRAME_BUCKETS[b] : "foundation"), node);
  } else if (node.type === "atrule" && node.name === "font-face") {
    return; // fonts are declared in fonts.css
  }
});
function ctxKey(node) { const c = []; let p = node.parent; while (p && p.type === "atrule") { c.push(p.name + p.params); p = p.parent; } return c.join("|"); }

// Light formatter that respects quoted strings and url(...) (data URIs contain ';' and '}').
function pretty(r) {
  const src = r.toString();
  let out = "";
  let q = null;
  let depth = 0;
  const skipWs = (i) => { while (/\s/.test(src[i + 1] || "")) i++; return i; };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) { out += ch; if (ch === q && src[i - 1] !== "\\") q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; out += ch; continue; }
    if (ch === "(") { depth++; out += ch; continue; }
    if (ch === ")") { depth = Math.max(0, depth - 1); out += ch; continue; }
    if (depth > 0) { out += ch; continue; }
    if (ch === "{") { out += "{\n  "; i = skipWs(i); continue; }
    if (ch === "}") { out = out.replace(/\s*$/, "") + "}\n"; i = skipWs(i); continue; }
    if (ch === ";") { out += ";\n  "; i = skipWs(i); continue; }
    out += ch;
  }
  return out.replace(/\n {2}\}/g, "\n}");
}
const OUT = "src/styles/stripe/generated";
// Overwrite in place (deleting the folder confuses the dev server file watcher on Windows).
for (const [b, r] of Object.entries(outputs)) {
  const file = b === "unused" ? "docs/research/stripe-live/unused.css" : path.join(OUT, b + ".css");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const header = `/* Generated by scripts/forensics/partition-css.mjs from the frozen stripe.com stylesheet (2026-09-17).\n   Bucket: ${b}. Do not hand-edit; overrides live next to the component. */\n`;
  fs.writeFileSync(file, header + pretty(r));
  console.log(b.padEnd(20), String(r.toString().length).padStart(7), "bytes");
}
