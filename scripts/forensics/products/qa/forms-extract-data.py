"""Extract the reference content the "forms" controller ports need but the page generator does not emit.

build_pages.py (html2tsx) collapses whitespace in every non-<pre> text node and drops <template> elements.
Two legacy controllers depend on exactly that content:

* CodeEditor / SnippetsCodeEditor / DeveloperCentricCodeEditor / DetailCodeSnippetCarousel read their source
  code from hidden elements (CodeEditor.finalCode, *.snippets, *.codeSnippets) whose line breaks are lost.
  -> CODE_SOURCES: the original texts; the CodeEditor port restores a collapsed text by whitespace-normalised
     lookup (a no-op once the generator keeps the line breaks).
* PaymentMethodHubGrid clones filtered cards from <template data-js-target="PaymentMethodHubGrid.cardTemplateEl">
  (123 cards). -> PM_CARDS: identifier -> card HTML, serialised with the generator's own rules (mono colours
  outside brand marks, local hrefs, collapsed whitespace), loaded lazily by the grid port.

Output: src/components/sites/stripe-com-9ababc9a/v1/controllers/forms/data/{codeSources,pmCards}.ts
Run:    python3 scripts/forensics/products/qa/forms-extract-data.py
"""
from __future__ import annotations

import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from html2tsx import COLOR_ATTRS, DROP_ATTRS, INLINE, NO_WS_PARENTS, VOID, Node, parse  # noqa: E402
from mono import is_brand, mono_text  # noqa: E402
import build_pages  # noqa: E402

ROOT = build_pages.ROOT
RAW = build_pages.RAW
OUT = os.path.join(ROOT, "src/components/sites/stripe-com-9ababc9a/v1/controllers/forms/data")
LEGACY = ["payments", "payment-links", "checkout", "elements", "payment-methods", "terminal", "authorization-boost",
          "link", "financial-connections", "invoicing", "tax", "revenue-recognition", "sigma", "data-pipeline"]
CODE_TARGET = re.compile(r"(^|\s)(CodeEditor\.finalCode|[A-Za-z]+\.snippets|[A-Za-z]+\.codeSnippets)(\s|$)")


def ws_key(s: str) -> str:
    return " ".join(s.split())


def code_sources() -> list[str]:
    seen: dict[str, str] = {}
    for slug in LEGACY:
        doc = parse(open(os.path.join(RAW, f"{slug}.html"), encoding="utf-8").read())
        for n in doc.iter():
            t = (n.get("data-js-target") or "") + " " + (n.get("data-js-target-list") or "")
            if not CODE_TARGET.search(t):
                continue
            src = n.text()
            if "\n" not in src.strip():
                continue  # single-line sources survive collapsing unchanged
            seen.setdefault(ws_key(src), src)
    return list(seen.values())


# --- HTML serialisation with the generator's attribute/whitespace rules ---------------------------

def _is_inline(n) -> bool:
    return isinstance(n, str) or n.tag in INLINE


def _attr(v: str) -> str:
    return v.replace("&", "&amp;").replace('"', "&quot;")


def _text(v: str) -> str:
    return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")


def _style(v: str) -> str:
    parts = []
    for decl in v.split(";"):
        if ":" not in decl:
            continue
        k, val = decl.split(":", 1)
        k, val = k.strip(), " ".join(val.split())
        if k and val:
            parts.append(f"{k}: {val}")
    return "; ".join(parts)


def to_html(node: Node, in_brand: bool = False, parent_tag: str = "") -> str:
    tag = node.tag
    if tag in ("script", "noscript", "style", "link", "meta", "template", "#comment"):
        return ""
    if not in_brand and tag in ("svg", "img", "picture", "span", "div", "li") and is_brand(node):
        in_brand = True
    recolor = (lambda v: v) if in_brand else mono_text
    attrs = []
    for k, v in node.attrs:
        if DROP_ATTRS.match(k):
            continue
        val = v if v is not None else ""
        if k == "class":
            val = " ".join(val.split())
            if not val:
                continue
        if k in COLOR_ATTRS:
            val = recolor(val)
        if k == "style":
            val = _style(recolor(val))
            if not val:
                continue
        if k in ("href", "xlink:href"):
            val = build_pages.map_href(val)
        if build_pages.ASSET_RE.search(val):
            raise SystemExit(f"unexpected asset reference in template: {val[:80]}")
        attrs.append(f'{k}="{_attr(val)}"')
    open_tag = f"<{tag}{(' ' + ' '.join(attrs)) if attrs else ''}>"
    if tag in VOID:
        return open_tag
    kids = []
    ch = node.children
    for i, c in enumerate(ch):
        if isinstance(c, str):
            t = re.sub(r"[ \t\r\n\f]+", " ", c)
            if not t.strip():
                if tag in NO_WS_PARENTS or tag == "svg" or parent_tag == "svg":
                    continue
                prev_n = ch[i - 1] if i > 0 else None
                next_n = ch[i + 1] if i + 1 < len(ch) else None
                if prev_n is not None and next_n is not None and _is_inline(prev_n) and _is_inline(next_n):
                    kids.append(" ")
                continue
            kids.append(_text(t))
        else:
            kids.append(to_html(c, in_brand, tag))
    return f"{open_tag}{''.join(kids)}</{tag}>"


def pm_cards() -> dict[str, str]:
    doc = parse(open(os.path.join(RAW, "payment-methods.html"), encoding="utf-8").read())
    tpl = doc.find(lambda n: n.tag == "template" and n.get("data-js-target") == "PaymentMethodHubGrid.cardTemplateEl")
    if tpl is None:
        raise SystemExit("card template not found")
    cards = {}
    for n in tpl.iter():
        if n is not tpl and n.get("data-id") is not None and "PaymentMethodCard" in n.classes:
            cards[n.get("data-id")] = to_html(n)
    return cards


HEADER = """// Generated by scripts/forensics/products/qa/forms-extract-data.py from docs/research/products/_raw/*.html.
// Do not edit by hand; re-run the script. See the script docstring for why this content exists.
"""


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    src = code_sources()
    with open(os.path.join(OUT, "codeSources.ts"), "w", encoding="utf-8") as f:
        f.write(HEADER)
        f.write("/** Original (line-broken) text of every multi-line code source on the legacy pages. */\n")
        f.write("export const CODE_SOURCES: readonly string[] = ")
        f.write(json.dumps(src, ensure_ascii=False, indent=1))
        f.write(";\n")
    cards = pm_cards()
    with open(os.path.join(OUT, "pmCards.ts"), "w", encoding="utf-8") as f:
        f.write(HEADER)
        f.write("/** PaymentMethodHubGrid card template: payment-method identifier -> card markup. */\n")
        f.write("export const PM_CARDS: Readonly<Record<string, string>> = ")
        f.write(json.dumps(cards, ensure_ascii=False, indent=0))
        f.write(";\n")
    print(f"code sources: {len(src)} ({sum(len(s) for s in src)} chars); cards: {len(cards)} "
          f"({sum(len(c) for c in cards.values())} chars)")


if __name__ == "__main__":
    main()
