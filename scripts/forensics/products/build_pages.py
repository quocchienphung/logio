"""Generate the 18 Payments + Revenue product pages from the captured stripe.com HTML.

Input : docs/research/products/_raw/<slug>.html   (server-rendered HTML, fetched 2026-09-24)
        MIRROR (default /home/user/mirror)         (CSS/JS/images downloaded from the same pages)
Output: src/components/sites/stripe-com-9ababc9a/<page-key>/sections/*.tsx + <Name>Page.tsx
        src/app/(v1|hds)/<route>/page.tsx
        public/sites/stripe-com-9ababc9a/products/*    (localized assets)
        docs/research/products/_build/{manifest.json, css/*}  (CSS inputs for build_css.mjs)

The markup keeps the reference's class names so the captured stylesheets apply unchanged; behaviours
(data-js-controller) are re-implemented in TypeScript by the page runtimes, not copied.

Run: python3 scripts/forensics/products/build_pages.py [slug ...]
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from html2tsx import Ctx, Node, check_nesting, parse, serialize  # noqa: E402
from mono import is_brand, mono_text  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
RAW = os.path.join(ROOT, "docs/research/products/_raw")
BUILD = os.path.join(ROOT, "docs/research/products/_build")
MIRROR = os.environ.get("MIRROR", "/home/user/mirror")
SITE = "stripe-com-9ababc9a"
PUB_DIR = os.path.join(ROOT, "public/sites", SITE, "products")
PUB_URL = f"/sites/{SITE}/products"
COMP_ROOT = os.path.join(ROOT, "src/components/sites", SITE)
APP = os.path.join(ROOT, "src/app")

PAGES = [
    ("payments", "/payments"), ("managed-payments", "/managed-payments"),
    ("payment-links", "/payments/payment-links"), ("checkout", "/payments/checkout"),
    ("elements", "/payments/elements"), ("payment-methods", "/payments/payment-methods"),
    ("terminal", "/terminal"), ("authorization-boost", "/authorization-boost"), ("link", "/payments/link"),
    ("financial-connections", "/financial-connections"), ("billing", "/billing"),
    ("metronome", "/billing/usage-based-billing"), ("subscriptions", "/billing/subscriptions"),
    ("invoicing", "/invoicing"), ("tax", "/tax"), ("revenue-recognition", "/revenue-recognition"),
    ("sigma", "/sigma"), ("data-pipeline", "/data-pipeline"),
]
LOCAL_ROUTES = {"/"} | {p for _, p in PAGES}
ASSET_HOSTS = ("images.stripeassets.com", "videos.stripeassets.com", "assets.stripeassets.com", "b.stripecdn.com",
               "stripe-camo.global.ssl.fastly.net")
# Large customer films are not bundled (see ARTIFACT notes in docs/research/products/reference-map.md).
MAX_ASSET_BYTES = 12 * 1024 * 1024
ASSET_RE = re.compile(r"https://(?:%s)/[^\s\"'()<>\\,]+" % "|".join(re.escape(h) for h in ASSET_HOSTS))

assets: dict[str, str] = {}  # url -> public url
missing: set[str] = set()
oversize: dict[str, int] = {}


def page_key(path: str) -> str:
    h = hashlib.sha256(path.encode()).hexdigest()[:8]
    slug = path.strip("/").replace("/", "--")
    return f"{slug}-{h}"


def pascal(s: str) -> str:
    return "".join(w[:1].upper() + w[1:] for w in re.split(r"[^A-Za-z0-9]+", s) if w)


def mirror_path(u: str) -> str:
    p = urllib.parse.urlsplit(u)
    path = urllib.parse.unquote(p.path)
    if path.endswith("/"):
        path += "index"
    lp = os.path.join(MIRROR, p.netloc, path.lstrip("/"))
    if p.query:
        lp += "__" + hashlib.sha1(p.query.encode()).hexdigest()[:8]
    return lp


def ext_for(u: str) -> str:
    p = urllib.parse.urlsplit(u)
    q = urllib.parse.parse_qs(p.query)
    if "fm" in q:
        return {"jpg": "jpg", "png": "png", "webp": "webp", "avif": "avif"}.get(q["fm"][0], q["fm"][0])
    base = p.path.rsplit("/", 1)[-1]
    if "." in base:
        return base.rsplit(".", 1)[-1].lower()[:5]
    return "bin"


def localize(u: str) -> str:
    """Map a remote asset URL to its public path (copying it from the mirror)."""
    u = u.rstrip(".")
    if u in assets:
        return assets[u]
    lp = mirror_path(u)
    if not os.path.isfile(lp):
        missing.add(u)
        return u
    size = os.path.getsize(lp)
    if size > MAX_ASSET_BYTES:
        # long customer films: use the 540p grayscale web transcode (see mono_assets.py --transcode)
        stem0 = urllib.parse.urlsplit(u).path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        tc = os.path.join(MIRROR, "transcoded", f"{stem0}-540p-mono.mp4")
        if not os.path.isfile(tc):
            oversize[u] = size
            return u
        lp = tc
    p = urllib.parse.urlsplit(u)
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", p.path.rsplit("/", 1)[-1].rsplit(".", 1)[0])[:48].strip("-") or "asset"
    name = f"{stem}-{hashlib.sha1(u.encode()).hexdigest()[:10]}.{ext_for(u)}"
    os.makedirs(PUB_DIR, exist_ok=True)
    dst = os.path.join(PUB_DIR, name)
    if not os.path.exists(dst):
        shutil.copyfile(lp, dst)
    assets[u] = f"{PUB_URL}/{name}"
    return assets[u]


def map_assets(text: str) -> str:
    return ASSET_RE.sub(lambda m: localize(m.group(0)), text)


def map_href(v: str) -> str:
    if v.startswith("https://stripe.com/") or (v.startswith("/") and not v.startswith("//")):
        p = urllib.parse.urlsplit(v if v.startswith("http") else "https://stripe.com" + v)
        path = p.path.rstrip("/") or "/"
        if path in LOCAL_ROUTES:
            return path + (("?" + p.query) if p.query else "") + (("#" + p.fragment) if p.fragment else "")
        return "https://stripe.com" + p.path + (("?" + p.query) if p.query else "") + (("#" + p.fragment) if p.fragment else "")
    return map_assets(v)


def url_map(val: str, kind: str) -> str:
    if kind == "href":
        return map_href(val)
    return map_assets(val)


# ---------------------------------------------------------------------------------------------

def is_header(n: Node) -> bool:
    return n.tag == "header" and ("SiteHeader" in n.classes or "navigation" in n.classes)


def is_site_footer(n: Node) -> bool:
    return n.tag == "footer" and ("SiteFooterSection" in n.classes or "footer" in n.classes)


SKIP_CLASSES = {"NotificationCenter", "NotificationsShell_notifications-shell__1maaD"}


def content_nodes(doc: Node, stack: str) -> list[Node]:
    body = doc.find(lambda n: n.tag == "body")
    if stack == "hds":
        main = doc.find(lambda n: n.tag == "main")
        return [c for c in main.children if isinstance(c, Node)]
    out = []
    mkt = doc.find(lambda n: n.get("id") == "MktContent")
    seq = [c for c in mkt.children if isinstance(c, Node)]
    after = False
    for c in body.children:
        if c is mkt:
            after = True
            continue
        if after and isinstance(c, Node):
            seq.append(c)
    for c in seq:
        if c.tag in ("script", "template", "style", "link", "noscript"):
            continue
        if is_header(c) or is_site_footer(c) or set(c.classes) & SKIP_CLASSES:
            continue
        out.append(c)
    return out


def section_name(n: Node, i: int, used: set[str]) -> str:
    base = ""
    if n.get("id"):
        base = pascal(n.get("id"))
    if not base:
        for c in n.classes:
            if c in ("hds-color-mode", "section", "Section", "section--white") or c.startswith(("hds-mode", "theme--", "flavor--", "accent--", "Section--", "section--")):
                continue
            base = pascal(c)
            break
    if not base:
        h = n.find(lambda x: x.tag in ("h1", "h2", "h3"))
        if h is not None:
            base = pascal(" ".join(re.sub(r"[^A-Za-z0-9 ]", "", h.text()).split()[:4]))
    base = base or "Block"
    name = f"S{i:02d}{base}"[:60]
    while name in used:
        name += "X"
    used.add(name)
    return name


def page_meta(doc: Node) -> dict:
    title = doc.find(lambda n: n.tag == "title")
    desc = doc.find(lambda n: n.tag == "meta" and n.get("name") == "description")
    return {"title": title.text().strip() if title is not None else "", "description": desc.get("content") if desc is not None else ""}


def collect_css(doc: Node, raw: str, stack: str) -> dict:
    """Inline <style> blocks (document order) and linked stylesheet URLs."""
    styles = []
    for n in doc.iter():
        if n.tag == "style":
            styles.append(n.text())
    links = []
    for n in doc.iter():
        if n.tag == "link" and "stylesheet" in (n.get("rel") or "") and n.get("href"):
            links.append(n.get("href"))
    return {"inline": styles, "links": links}


def mono_body_classes(doc: Node) -> str:
    body = doc.find(lambda n: n.tag == "body")
    return " ".join(body.classes)


HEADER = "/* Generated by scripts/forensics/products/build_pages.py from the stripe.com page captured 2026-09-24.\n   Markup and class names are the reference's; behaviours live in the page runtime. Do not hand-edit\n   structure here without re-running the capture; visual fixes belong in the page stylesheet. */\n"


def build(slug: str, path: str) -> dict:
    raw = open(os.path.join(RAW, slug + ".html"), encoding="utf-8").read()
    stack = "hds" if "mkt-ssr-statics" in raw else "v1"
    doc = parse(raw)
    key = page_key(path)
    comp_dir = os.path.join(COMP_ROOT, key)
    sec_dir = os.path.join(comp_dir, "sections")
    if os.path.isdir(sec_dir):
        shutil.rmtree(sec_dir)
    os.makedirs(sec_dir, exist_ok=True)
    nodes = content_nodes(doc, stack)
    used: set[str] = set()
    sections = []
    ctx = Ctx(url_map=url_map, mono=mono_text, is_brand=is_brand)
    warnings = []
    for i, n in enumerate(nodes):
        name = section_name(n, i, used)
        warnings += check_nesting(n)
        jsx = serialize(n, ctx, "    ")
        src = HEADER + f"export function {name}() {{\n  return (\n{jsx.rstrip()}\n  );\n}}\n"
        open(os.path.join(sec_dir, f"{name}.tsx"), "w", encoding="utf-8").write(src)
        heading = n.find(lambda x: x.tag in ("h1", "h2"))
        sections.append({"name": name, "tag": n.tag, "id": n.get("id"), "classes": n.classes,
                         "controllers": sorted({c for x in n.iter() for c in (x.get("data-js-controller") or "").split()}),
                         "heading": " ".join(heading.text().split())[:160] if heading is not None else "",
                         "bytes": len(jsx)})
    meta = page_meta(doc)
    comp_name = pascal(slug) + "Page"
    imports = "\n".join(f'import {{ {s["name"]} }} from "./sections/{s["name"]}";' for s in sections)
    body = "\n".join(f"        <{s['name']} />" for s in sections)
    if stack == "v1":
        body_classes = mono_body_classes(doc)
        page_src = f'''{HEADER}import {{ Footer }} from "@/components/stripe/Footer/Footer";
import {{ Navigation }} from "@/components/stripe/Navigation/Navigation";
import {{ V1Runtime }} from "@/components/sites/{SITE}/v1/V1Runtime";
{imports}

export function {comp_name}() {{
  return (
    <>
      <div className="mobile-safari-solid-bars" />
      <Navigation />
      <div className="v1-root" data-page="{slug}">
        <div className="MktRoot v1-html">
          <div className="MktBody v1-body {body_classes}">
            <main id="MktContent">
{body}
            </main>
          </div>
        </div>
      </div>
      <Footer />
      <V1Runtime page="{slug}" />
    </>
  );
}}
'''
        page_src = page_src.replace("\n        <S", "\n              <S")
    else:
        page_src = f'''{HEADER}import {{ Footer }} from "@/components/stripe/Footer/Footer";
import {{ Navigation }} from "@/components/stripe/Navigation/Navigation";
import {{ HdsRuntime }} from "@/components/sites/{SITE}/hds/HdsRuntime";
{imports}

export function {comp_name}() {{
  return (
    <>
      <div className="mobile-safari-solid-bars" />
      <Navigation />
      <main id="main-content" data-page="{slug}">
{body}
      </main>
      <Footer />
      <HdsRuntime page="{slug}" />
    </>
  );
}}
'''
    open(os.path.join(comp_dir, f"{comp_name}.tsx"), "w", encoding="utf-8").write(page_src)
    group = "(v1)" if stack == "v1" else "(hds)"
    route_dir = os.path.join(APP, group, path.strip("/"))
    os.makedirs(route_dir, exist_ok=True)
    css_imports = (f'import "@/styles/stripe/products/v1-{slug}-overrides.css";' if stack == "v1" else
                   f'import "@/styles/stripe/products/hds-{slug}.css";\nimport "@/styles/stripe/products/hds-{slug}-overrides.css";')
    route_src = f'''import type {{ Metadata }} from "next";
import {{ {comp_name} }} from "@/components/sites/{SITE}/{key}/{comp_name}";
{css_imports}

export const metadata: Metadata = {{
  title: {json.dumps(meta["title"], ensure_ascii=False)},
  description: {json.dumps(meta["description"] or "", ensure_ascii=False)},
}};

export default function Page() {{
  return <{comp_name} />;
}}
'''
    open(os.path.join(route_dir, "page.tsx"), "w", encoding="utf-8").write(route_src)
    css = collect_css(doc, raw, stack)
    return {"slug": slug, "path": path, "key": key, "stack": stack, "component": comp_name,
            "meta": meta, "sections": sections, "css": css, "warnings": warnings,
            "bodyClasses": mono_body_classes(doc) if stack == "v1" else ""}


def main():
    want = set(sys.argv[1:])
    os.makedirs(BUILD, exist_ok=True)
    mf_path = os.path.join(BUILD, "manifest.json")
    manifest = json.load(open(mf_path)) if os.path.exists(mf_path) else {}
    for slug, path in PAGES:
        if want and slug not in want:
            continue
        m = build(slug, path)
        manifest[slug] = m
        print(f"{slug:22s} {m['stack']:3s} {len(m['sections']):2d} sections  {sum(s['bytes'] for s in m['sections'])//1024:5d}KB  warnings={len(m['warnings'])}")
    json.dump(manifest, open(mf_path, "w"), indent=1, ensure_ascii=False)
    json.dump({"assets": assets, "missing": sorted(missing), "oversize": oversize},
              open(os.path.join(BUILD, f"assets-{'-'.join(sorted(want)) or 'all'}.json"), "w"), indent=1)
    print("assets", len(assets), "missing", len(missing), "oversize", len(oversize))


if __name__ == "__main__":
    main()
