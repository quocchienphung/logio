// Turn the captured customer-stories markup in Enterprise.tsx into a state-driven accordion.
import fs from "node:fs";
const f = "src/components/stripe/Business/Enterprise.tsx";
let s = fs.readFileSync(f, "utf8");
const names = ["Hertz", "URBN", "Instacart", "LeMonde"];
names.forEach((n, i) => {
  // summary wrapper: open class + click
  s = s.replace(
    new RegExp(`<div className="customer-stories__customer-summary( customer-stories__customer-summary--open)?">(\\s*<div className="customer-stories__customer-summary-logo">[\\s\\S]*?id="summary-customer-content-${n}")`),
    (_m, _o, rest) => `<div className={\`customer-stories__customer-summary\${isOpen(${i}) ? " customer-stories__customer-summary--open" : ""}\`} onClick={() => toggle(${i})}>${rest}`,
  );
});
// buttons: aria-expanded / tabIndex by index (they appear in order)
let bi = 0;
s = s.replace(/aria-expanded="(true|false)"\s*aria-controls="detail-customer-content-([A-Za-z]+)"\s*tabIndex=\{-?\d\}/g, (_m, _v, n) => {
  const i = names.indexOf(n);
  bi++;
  return `aria-expanded={isOpen(${i})}\n                aria-controls="detail-customer-content-${n}"\n                tabIndex={isOpen(${i}) ? -1 : 0}`;
});
// read-story button: open class + widths + text opacity
names.forEach((n, i) => {
  const re = new RegExp(
    `className="hds-button customer-story-button( customer-story-button--open)? hds-button--secondary-on-quiet hds-button--compact"\\s*href="([^"]+)"\\s*style=\\{\\{ width: "[^"]+" \\}\\}\\s*tabIndex=\\{-?\\d\\}`,
  );
  s = s.replace(re, (_m, _o, href) => `className={\`hds-button customer-story-button\${isOpen(${i}) ? " customer-story-button--open" : ""} hds-button--secondary-on-quiet hds-button--compact\`}\n                  href="${href}"\n                  style={{ width: buttonWidth(${i}) }}\n                  tabIndex={isOpen(${i}) ? 0 : -1}\n                  onClick={(e) => { if (!isOpen(${i})) e.preventDefault(); }}`);
});
let ci = 0;
s = s.replace(/className="customer-story-button__container"\s*style=\{\{ width: "[^"]+" \}\}/g, () => `className="customer-story-button__container"\n                    style={{ width: buttonWidth(${ci++}) }}`);
let ti = 0;
s = s.replace(/className="customer-story-button__text"\s*style=\{\{ opacity: "[01]" \}\}/g, () => `className="customer-story-button__text"\n                      ref={(el) => { textRefs.current[${ti}] = el; }}\n                      style={{ opacity: isOpen(${ti++}) ? 1 : 0 }}`);
let ii = 0;
s = s.replace(/className="customer-story-button__icon"\s*style=\{\{ opacity: "[01]" \}\}/g, () => `className="customer-story-button__icon"\n                      style={{ opacity: isOpen(${ii++}) ? 0 : 1 }}`);
// content panels
let pi = 0;
s = s.replace(/className="customer-stories__customer-content"\s*style=\{\{ "--max-height": "[^"]+" \}\}/g, () => {
  const i = pi++;
  return `className="customer-stories__customer-content"\n              ref={(el) => { panelRefs.current[${i}] = el; }}\n              style={{ "--max-height": isOpen(${i}) ? \`\${heights[${i}] || 0}px\` : "0px" }}`;
});
// state + helpers
s = s.replace(
  /export function Enterprise\(\) \{\n  return \(/,
  `const CUSTOMERS = 4;

export function Enterprise() {
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);
  const [textWidths, setTextWidths] = useState<number[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reference: every story is open on mobile (sticky stacked cards); one at a time otherwise.
  const isOpen = (i: number) => mobile || i === active;
  const toggle = (i: number) => {
    if (!mobile) setActive(i);
  };
  const buttonWidth = (i: number) => (isOpen(i) ? \`\${(textWidths[i] || 116) + 50}px\` : "40px");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const measure = () => {
      setMobile(mq.matches);
      setHeights(panelRefs.current.map((el) => el?.scrollHeight ?? 0));
      setTextWidths(textRefs.current.map((el) => Math.round(el?.offsetWidth ?? 0)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    panelRefs.current.forEach((el) => el && ro.observe(el));
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  return (`,
);
s = s.replace(`"use client";\n`, `"use client";\n\nimport { useEffect, useRef, useState } from "react";\n`);
fs.writeFileSync(f, s);
console.log("summary", (s.match(/isOpen\(/g) || []).length, "panels", pi, "buttons", bi, "texts", ti, "icons", ii, "containers", ci);
