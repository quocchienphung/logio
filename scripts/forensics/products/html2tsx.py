"""Server-rendered stripe.com HTML -> React TSX.

A small, dependency-free HTML tree builder (html.parser) plus a JSX serializer that keeps the
reference's class names, inline custom properties and data-js-* hooks, so the captured
stylesheets apply unchanged and the controller runtime can find its targets.

Used by build_pages.py; kept separate so section extraction and serialization can be tested alone.
"""
from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
# elements whose start implicitly closes an open <p> (HTML parsing rules)
P_CLOSERS = {"address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset", "figcaption", "figure",
             "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "menu", "nav", "ol", "p",
             "pre", "section", "table", "ul"}
RAW_TEXT = {"script", "style", "textarea", "title"}
INLINE = {"a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "dfn", "em", "i", "img", "input",
          "kbd", "label", "mark", "q", "s", "samp", "select", "small", "span", "strong", "sub", "sup", "svg", "time",
          "u", "var", "wbr", "picture", "video", "del", "ins"}
NO_WS_PARENTS = {"table", "thead", "tbody", "tfoot", "tr", "colgroup", "select", "optgroup", "html", "head",
                 "picture", "video", "audio", "ul", "ol", "dl"}


@dataclass
class Node:
    tag: str
    attrs: list[tuple[str, str | None]] = field(default_factory=list)
    children: list["Node | str"] = field(default_factory=list)
    parent: "Node | None" = None

    def get(self, name: str, default: str | None = None) -> str | None:
        for k, v in self.attrs:
            if k == name:
                return v if v is not None else ""
        return default

    def set(self, name: str, value: str | None) -> None:
        for i, (k, _) in enumerate(self.attrs):
            if k == name:
                self.attrs[i] = (k, value)
                return
        self.attrs.append((name, value))

    def remove_attr(self, name: str) -> None:
        self.attrs = [(k, v) for k, v in self.attrs if k != name]

    @property
    def classes(self) -> list[str]:
        return (self.get("class") or "").split()

    def iter(self):
        yield self
        for c in self.children:
            if isinstance(c, Node):
                yield from c.iter()

    def find_all(self, pred):
        return [n for n in self.iter() if pred(n)]

    def find(self, pred):
        for n in self.iter():
            if pred(n):
                return n
        return None

    def text(self) -> str:
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return "".join(out)


NS_HTML = "{http://www.w3.org/1999/xhtml}"
NS_ATTR = {"{http://www.w3.org/1999/xlink}": "xlink:", "{http://www.w3.org/XML/1998/namespace}": "xml:",
           "{http://www.w3.org/2000/xmlns/}": "xmlns:"}


def _convert(el, parent: "Node | None") -> Node:
    tag = el.tag
    if not isinstance(tag, str):  # comment / processing instruction
        return None
    tag = re.sub(r"^\{[^}]+\}", "", tag)
    if NS_HTML in el.tag:
        tag = tag.lower()
    attrs = []
    for k, v in el.attrib.items():
        for ns, pre in NS_ATTR.items():
            if k.startswith(ns):
                k = pre + k[len(ns):]
                break
        if k == "xmlns:xmlns":
            k = "xmlns"
        attrs.append((k, v))
    n = Node(tag, attrs, [], parent)
    if el.text:
        n.children.append(el.text)
    for c in el:
        cn = _convert(c, n)
        if cn is not None:
            n.children.append(cn)
        if c.tail:
            n.children.append(c.tail)
    return n


def parse(src: str) -> Node:
    """Parse with html5lib (WHATWG algorithm), so the tree matches what a browser builds."""
    import html5lib
    doc = html5lib.parse(src, treebuilder="etree", namespaceHTMLElements=True)
    root = Node("#document")
    root.children.append(_convert(doc, root))
    return root


# ---------------------------------------------------------------------------------------------
# JSX serialization

ATTR_MAP = {
    "class": "className", "for": "htmlFor", "srcset": "srcSet", "fetchpriority": "fetchPriority",
    "playsinline": "playsInline", "autoplay": "autoPlay", "crossorigin": "crossOrigin", "datetime": "dateTime",
    "readonly": "readOnly", "controlslist": "controlsList", "disablepictureinpicture": "disablePictureInPicture",
    "disableremoteplayback": "disableRemotePlayback", "maxlength": "maxLength", "minlength": "minLength", "autocomplete": "autoComplete",
    "colspan": "colSpan", "rowspan": "rowSpan", "novalidate": "noValidate", "spellcheck": "spellCheck",
    "contenteditable": "contentEditable", "frameborder": "frameBorder", "allowfullscreen": "allowFullScreen",
    "enctype": "encType", "inputmode": "inputMode", "autofocus": "autoFocus", "tabindex": "tabIndex",
    "referrerpolicy": "referrerPolicy", "accept-charset": "acceptCharset", "http-equiv": "httpEquiv",
    "formnovalidate": "formNoValidate", "usemap": "useMap", "cellpadding": "cellPadding",
    "cellspacing": "cellSpacing", "charset": "charSet", "enterkeyhint": "enterKeyHint",
    "xlink:href": "xlinkHref", "xml:space": "xmlSpace", "xmlns:xlink": "xmlnsXlink", "xml:lang": "xmlLang",
    "xlink:title": "xlinkTitle", "viewbox": "viewBox", "preserveaspectratio": "preserveAspectRatio",
    "gradientunits": "gradientUnits", "gradienttransform": "gradientTransform", "patternunits": "patternUnits",
    "clippathunits": "clipPathUnits", "maskunits": "maskUnits", "maskcontentunits": "maskContentUnits",
    "filterunits": "filterUnits", "primitiveunits": "primitiveUnits", "stddeviation": "stdDeviation",
    "spreadmethod": "spreadMethod", "patterncontentunits": "patternContentUnits",
    "patterntransform": "patternTransform", "markerwidth": "markerWidth", "markerheight": "markerHeight",
    "refx": "refX", "refy": "refY", "markerunits": "markerUnits", "textlength": "textLength",
    "lengthadjust": "lengthAdjust", "startoffset": "startOffset", "basefrequency": "baseFrequency",
    "numoctaves": "numOctaves", "tablevalues": "tableValues", "kernelmatrix": "kernelMatrix",
    "diffuseconstant": "diffuseConstant", "specularexponent": "specularExponent",
    "surfacescale": "surfaceScale", "limitingconeangle": "limitingConeAngle", "pointsatx": "pointsAtX",
    "pointsaty": "pointsAtY", "pointsatz": "pointsAtZ", "edgemode": "edgeMode", "attributename": "attributeName",
    "attributetype": "attributeType", "calcmode": "calcMode", "keytimes": "keyTimes", "keysplines": "keySplines",
    "keypoints": "keyPoints", "repeatcount": "repeatCount", "repeatdur": "repeatDur", "requiredfeatures": "requiredFeatures",
    "systemlanguage": "systemLanguage", "externalresourcesrequired": "externalResourcesRequired",
}
BOOL = {"disabled", "checked", "readOnly", "hidden", "autoPlay", "muted", "loop", "playsInline", "controls", "open",
        "required", "selected", "multiple", "autoFocus", "noValidate", "allowFullScreen", "defer", "async",
        "inert", "formNoValidate", "reversed", "default", "itemScope", "disablePictureInPicture"}
NUM = {"tabIndex", "maxLength", "minLength", "colSpan", "rowSpan", "rows", "cols", "size", "span", "start"}
DROP_ATTRS = re.compile(r"^(on[a-z]+|bis_skin_checked|nonce|jsaction)$")
# React DOM warns on unknown camelCase for these; keep data-/aria- and custom elements as-is
SVG_TAGS_CAMEL = {
    "clippath": "clipPath", "lineargradient": "linearGradient", "radialgradient": "radialGradient",
    "foreignobject": "foreignObject", "textpath": "textPath", "feblend": "feBlend", "fecolormatrix": "feColorMatrix",
    "fecomponenttransfer": "feComponentTransfer", "fecomposite": "feComposite", "feconvolvematrix": "feConvolveMatrix",
    "fediffuselighting": "feDiffuseLighting", "fedisplacementmap": "feDisplacementMap", "fedropshadow": "feDropShadow",
    "feflood": "feFlood", "fefunca": "feFuncA", "fefuncb": "feFuncB", "fefuncg": "feFuncG", "fefuncr": "feFuncR",
    "fegaussianblur": "feGaussianBlur", "feimage": "feImage", "femerge": "feMerge", "femergenode": "feMergeNode",
    "femorphology": "feMorphology", "feoffset": "feOffset", "fespecularlighting": "feSpecularLighting",
    "fetile": "feTile", "feturbulence": "feTurbulence", "fedistantlight": "feDistantLight",
    "fepointlight": "fePointLight", "fespotlight": "feSpotLight", "animatetransform": "animateTransform",
    "animatemotion": "animateMotion",
}


def camel(s: str) -> str:
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), s)


# SVG presentation attributes React does not know as camelCase props: keep the hyphenated name
PASSTHROUGH = {"transform-box", "paint-order", "vector-effect", "mask-type", "white-space"}
# presentation attributes React only accepts as CSS: folded into the inline style
TO_STYLE = {"transform-origin": "transform-origin"}


def jsx_attr_name(name: str) -> str:
    if name in PASSTHROUGH:
        return name
    if name in ATTR_MAP:
        return ATTR_MAP[name]
    if name.startswith("data-") or name.startswith("aria-"):
        return name
    if ":" in name:
        return re.sub(r":([a-z])", lambda m: m.group(1).upper(), name)
    if "-" in name:
        return camel(name)
    return name


def split_decls(style: str) -> list[tuple[str, str]]:
    """Split an inline style into (prop, value), respecting parentheses and quotes."""
    out, buf, depth, quote = [], [], 0, None
    for ch in style:
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        elif ch == ";" and depth == 0:
            out.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    out.append("".join(buf))
    decls = []
    for d in out:
        d = d.strip()
        if not d or ":" not in d:
            continue
        k, v = d.split(":", 1)
        k, v = k.strip(), v.strip()
        if not k or not v:
            continue
        decls.append((k, v))
    return decls


def style_obj(style: str) -> str | None:
    decls = split_decls(style)
    if not decls:
        return None
    parts = []
    last = {}
    for k, v in decls:
        last[k.lower() if not k.startswith("--") else k] = v
    decls = list(last.items())
    for k, v in decls:
        if k.startswith("--"):
            key = json.dumps(k)
        else:
            k = k.lower()
            if k.startswith("-ms-"):
                key = camel(k[1:])
            elif k.startswith("-"):
                key = camel(k[1:])
                key = key[0].upper() + key[1:]
            else:
                key = camel(k)
        parts.append(f"{key}: {json.dumps(v, ensure_ascii=False)}")
    return "{{ " + ", ".join(parts) + " }}"


def jstr(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def jattr(s: str) -> str:
    """JSX attribute value: plain string when safe, otherwise an expression (JSX strings have no escapes
    and decode HTML entities)."""
    if re.search(r'["\\&\n\r\t{}<>]', s) or "\u2028" in s:
        return "{" + json.dumps(s, ensure_ascii=False) + "}"
    return '"' + s + '"'


@dataclass
class Ctx:
    url_map: callable = None  # (url, kind) -> str
    mono: callable = None  # colour text -> monochrome colour text
    is_brand: callable = None  # node -> bool (brand marks keep their colours)
    warnings: list[str] = field(default_factory=list)
    in_pre: bool = False
    in_brand: bool = False


COLOR_ATTRS = {"fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"}


def _is_inline(n) -> bool:
    return isinstance(n, str) or n.tag in INLINE


def serialize(node: Node, ctx: Ctx, ind: str = "", parent_tag: str = "") -> str:
    saved = ctx.in_brand
    try:
        return _serialize(node, ctx, ind, parent_tag)
    finally:
        ctx.in_brand = saved


def _serialize(node: Node, ctx: Ctx, ind: str = "", parent_tag: str = "") -> str:
    tag = node.tag
    if tag in ("script", "noscript", "style", "link", "meta", "template", "#comment"):
        if tag == "script" and (node.get("type") or "").endswith("json"):
            body = node.text()
            attrs = f' type={jattr(node.get("type"))}'
            for k, v in node.attrs:
                if k.startswith("data-") or k == "id":
                    attrs += f" {jsx_attr_name(k)}={jattr(v or '')}"
            return f"{ind}<script{attrs} dangerouslySetInnerHTML={{{{ __html: {jstr(body)} }}}} />\n"
        return ""
    jtag = SVG_TAGS_CAMEL.get(tag, tag)
    attrs = []
    was_brand = ctx.in_brand
    if not ctx.in_brand and ctx.is_brand and tag in ("svg", "img", "picture", "span", "div", "li") and ctx.is_brand(node):
        ctx.in_brand = True
    recolor = ctx.mono if (ctx.mono and not ctx.in_brand) else (lambda v: v)
    extra_style = "".join(f"{TO_STYLE[k]}:{v};" for k, v in node.attrs if k in TO_STYLE and v)
    if extra_style:
        node = Node(node.tag, [(k, v) for k, v in node.attrs if k not in TO_STYLE and k != "style"] +
                    [("style", extra_style + (node.get("style") or ""))], node.children, node.parent)
    for k, v in node.attrs:
        if DROP_ATTRS.match(k):
            continue
        n = jsx_attr_name(k)
        val = v if v is not None else ""
        if k == "class":
            val = " ".join(val.split())
            if not val:
                continue
        if k in COLOR_ATTRS:
            val = recolor(val)
        if k == "style":
            so = style_obj(recolor(ctx.url_map(val, "style") if ctx.url_map else val))
            if so:
                attrs.append(f"style={so}")
            continue
        if ctx.url_map and k in ("src", "srcset", "poster", "href", "xlink:href", "data-src", "data-srcset",
                                 "data-poster", "data-video-src", "data-image", "content"):
            val = ctx.url_map(val, k)
        if tag == "input" and k == "value":
            n = "defaultValue"
        if tag == "input" and k == "checked":
            n = "defaultChecked"
        if tag == "option" and k == "selected":
            continue
        if n in BOOL and (val == "" or val.lower() == n.lower() or val == "true"):
            attrs.append(n)
            continue
        if n in NUM and re.fullmatch(r"-?\d+", val):
            attrs.append(f"{n}={{{val}}}")
            continue
        attrs.append(f"{n}={jattr(val)}")
    if tag == "img" and node.get("alt") is None:
        attrs.append('alt=""')  # reference images without alt are decorative
    if tag == "textarea":
        attrs.append(f"defaultValue={jattr(node.text())}")
        return f"{ind}<textarea {' '.join(attrs)} />\n"
    if tag == "select":
        sel = node.find(lambda x: x.tag == "option" and x.get("selected") is not None)
        if sel is not None:
            attrs.append(f"defaultValue={jattr(sel.get('value') if sel.get('value') is not None else sel.text())}")
    attr_s = (" " + " ".join(attrs)) if attrs else ""
    if tag in VOID:
        return f"{ind}<{jtag}{attr_s} />\n"
    pre = ctx.in_pre or tag == "pre"
    kids = []
    ch = node.children
    for i, c in enumerate(ch):
        if isinstance(c, str):
            if pre:
                if c:
                    kids.append(f"{ind}  {{{jstr(c)}}}\n")
                continue
            t = re.sub(r"[ \t\r\n\f]+", " ", c)
            if not t.strip():
                if tag in NO_WS_PARENTS or tag in SVG_TAGS_CAMEL or tag == "svg" or parent_tag == "svg":
                    continue
                prev_n = ch[i - 1] if i > 0 else None
                next_n = ch[i + 1] if i + 1 < len(ch) else None
                if prev_n is not None and next_n is not None and _is_inline(prev_n) and _is_inline(next_n):
                    kids.append(f'{ind}  {{" "}}\n')
                continue
            kids.append(f"{ind}  {{{jstr(t)}}}\n")
        else:
            old = ctx.in_pre
            ctx.in_pre = pre
            kids.append(serialize(c, ctx, ind + "  ", tag if tag != "svg" else "svg"))
            ctx.in_pre = old
    body = "".join(kids)
    if not body:
        return f"{ind}<{jtag}{attr_s} />\n" if tag not in ("div", "span", "a", "p", "button", "i", "canvas", "video", "iframe", "td", "th") else f"{ind}<{jtag}{attr_s}></{jtag}>\n"
    return f"{ind}<{jtag}{attr_s}>\n{body}{ind}</{jtag}>\n"


def check_nesting(root: Node) -> list[str]:
    """Report nesting React would reject during hydration."""
    issues = []
    for n in root.iter():
        if n.tag in ("a", "button", "p"):
            anc = n.parent
            while anc is not None:
                if anc.tag == n.tag:
                    issues.append(f"<{n.tag}> inside <{n.tag}> ({' '.join(n.classes)[:60]})")
                    break
                anc = anc.parent
    return issues
