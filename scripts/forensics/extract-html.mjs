// Print a subtree of the frozen DOM as cleaned HTML, and optionally as JSX.
// node extract-html.mjs "<selector>" [index] [--jsx] [--depth N] [--file dom.html]
import fs from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const sel = args[0];
const idx = args[1] && !args[1].startsWith("--") ? +args[1] : 0;
const jsx = args.includes("--jsx");
const di = args.indexOf("--depth");
const depth = di >= 0 ? +args[di + 1] : 99;
const fi = args.indexOf("--file");
const file = fi >= 0 ? args[fi + 1] : "docs/research/stripe-live/dom-1440.html";
const html = fs.readFileSync(file, "utf8");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.route("**/*", (r) => (r.request().url().startsWith("data:") ? r.continue() : r.abort()));
await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g, ""), { waitUntil: "domcontentloaded" });

const outText = await page.evaluate(
  ([sel, idx, jsx, depth]) => {
    const el = document.querySelectorAll(sel)[idx];
    if (!el) return "NOT FOUND";
    const VOID = new Set(["img", "br", "hr", "input", "source", "path", "circle", "rect", "line", "use", "stop", "polyline", "polygon", "ellipse", "meta", "link"]);
    const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const MAP = { srcset: "srcSet", fetchpriority: "fetchPriority", playsinline: "playsInline", autoplay: "autoPlay", crossorigin: "crossOrigin", datetime: "dateTime", readonly: "readOnly", maxlength: "maxLength", autocomplete: "autoComplete", colspan: "colSpan", rowspan: "rowSpan", novalidate: "noValidate", spellcheck: "spellCheck", contenteditable: "contentEditable", frameborder: "frameBorder", allowfullscreen: "allowFullScreen", enctype: "encType", inputmode: "inputMode", autofocus: "autoFocus", tabindex: "tabIndex", "xlink:href": "xlinkHref", "xml:space": "xmlSpace" };
    const BOOL = new Set(["disabled", "checked", "readOnly", "hidden", "autoPlay", "muted", "loop", "playsInline", "controls", "open", "required", "selected", "multiple", "autoFocus", "noValidate", "allowFullScreen", "defer", "async", "draggable"]);
    const attrName = (n) => {
      if (!jsx) return n;
      if (MAP[n]) return MAP[n];
      if (n === "class") return "className";
      if (n === "for") return "htmlFor";
      if (n === "tabindex") return "tabIndex";
      if (n === "viewbox") return "viewBox";
      if (n.startsWith("data-") || n.startsWith("aria-")) return n;
      if (n.includes(":")) return n.replace(/:([a-z])/g, (_, c) => c.toUpperCase());
      if (n.includes("-")) return camel(n);
      return n;
    };
    const styleObj = (s) =>
      "{{" +
      s
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const i = d.indexOf(":");
          const k = d.slice(0, i).trim();
          const v = d.slice(i + 1).trim();
          return (k.startsWith("--") ? JSON.stringify(k) : camel(k)) + ": " + JSON.stringify(v);
        })
        .join(", ") +
      "}}";
    function walk(node, d, ind) {
      if (node.nodeType === 3) {
        const t = node.textContent.replace(/\s+/g, " ");
        if (!t.trim()) return "";
        // keep a single leading/trailing space when the source had one (inline text split across spans)
        const kept = (t.startsWith(" ") ? " " : "") + t.trim() + (t.endsWith(" ") ? " " : "");
        return jsx ? ind + "{" + JSON.stringify(kept) + "}\n" : ind + t.trim() + "\n";
      }
      if (node.nodeType !== 1) return "";
      const tag = node.namespaceURI === "http://www.w3.org/2000/svg" ? node.tagName : node.tagName.toLowerCase();
      if (tag === "script" || tag === "noscript") return "";
      let attrs = "";
      for (const a of node.attributes) {
        if (a.name === "bis_skin_checked") continue;
        const n = attrName(a.name);
        if (jsx && a.name === "style") {
          attrs += ` style=${styleObj(a.value)}`;
          continue;
        }
        const NUM = new Set(["tabIndex", "maxLength", "colSpan", "rowSpan", "rows", "cols", "size", "span", "start"]);
        if (jsx && NUM.has(n) && /^-?\d+$/.test(a.value)) {
          attrs += ` ${n}={${a.value}}`;
          continue;
        }
        attrs += a.value === "" && jsx && BOOL.has(n) ? ` ${n}` : ` ${n}=${JSON.stringify(a.value)}`;
      }
      const kids =
        d < depth
          ? [...node.childNodes].map((c) => walk(c, d + 1, ind + "  ")).join("")
          : node.childNodes.length
            ? ind + "  …\n"
            : "";
      if (VOID.has(tag) && !kids) return `${ind}<${tag}${attrs}${jsx ? " /" : ""}>\n`;
      return `${ind}<${tag}${attrs}>\n${kids}${ind}</${tag}>\n`;
    }
    return walk(el, 0, "");
  },
  [sel, idx, jsx, depth],
);
await browser.close();
process.stdout.write(outText);
