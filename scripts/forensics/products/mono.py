"""Monochrome colour mapping shared by the product-page generators (same curve as build_css.mjs and
scripts/mono-assets.py): neutrals keep perceptual luminance, saturated colours use the designed
hue -> luminance keys so graphic hierarchy survives."""
import re

LIGHT_KEYS = [(0, 0.54), (25, 0.63), (45, 0.72), (70, 0.78), (150, 0.76), (200, 0.82), (235, 0.72), (255, 0.40),
              (270, 0.26), (290, 0.28), (310, 0.34), (330, 0.42), (350, 0.50), (360, 0.54)]


def _interp(x, keys):
    for i in range(1, len(keys)):
        if x <= keys[i][0]:
            x0, y0 = keys[i - 1]
            x1, y1 = keys[i]
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return keys[-1][1]


def _smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mono_value(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    c = mx - mn
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if c < 0.12:
        return lum
    if mx == r:
        h = ((g - b) / c) % 6
    elif mx == g:
        h = (b - r) / c + 2
    else:
        h = (r - g) / c + 4
    h *= 60
    l = (mx + mn) / 2
    hv = _interp(h, LIGHT_KEYS)
    w = _smooth(0.08, 0.55, c)
    hue = min(1.0, max(0.0, l * (1 - w) + hv * (0.7 + 0.55 * l) * w))
    t = _smooth(0.12, 0.35, c)
    return lum * (1 - t) + hue * t


def _grey(v, a=None):
    n = round(min(1, max(0, v)) * 255)
    if a is None or a >= 1:
        return "#%02x%02x%02x" % (n, n, n)
    return f"rgba({n},{n},{n},{round(a, 3)})"


COLOR_RE = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\([^()]*\)")


def _mono_token(tok: str) -> str:
    try:
        if tok[0] == "#":
            h = tok[1:]
            if len(h) <= 4:
                h = "".join(c * 2 for c in h)
            r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
            a = int(h[6:8], 16) / 255 if len(h) == 8 else None
        else:
            nums = [x for x in re.split(r"[\s,/]+", tok[tok.index("(") + 1:-1]) if x]
            if any("var" in x or "calc" in x for x in nums):
                return tok
            f = lambda s, sc: float(s[:-1]) / 100 if s.endswith("%") else float(s) / sc
            r, g, b = (f(x, 255) for x in nums[:3])
            a = f(nums[3], 1) if len(nums) > 3 else None
    except (ValueError, IndexError):
        return tok
    return _grey(mono_value(r, g, b), a)


def mono_text(s: str) -> str:
    return COLOR_RE.sub(lambda m: _mono_token(m.group(0)), s)


# Third-party marks keep their official colours (docs/research/MONOCHROME_SYSTEM.md): payment-method,
# card-network, bank and wallet logos, customer/partner logos, and country flags.
BRAND_RE = re.compile(
    r"PaymentLogo|[Cc]ard-?[Ii]cons?\b|CardField__icon|CardNumberInput__icon|PaymentMethod\w*[Ii]con|"
    r"payment-method-(?:brands|icon)|payment-icon|[Bb]ank\w*[Ii]con|bankItem|LogoGrid|logo-carousel|"
    r"ApplePaySheet__logo|queriedLogo|LogoItem|[Ff]lags?\b|LocaleControl|[Ff]lag__|currency-pill|affirmLabel|"
    r"Dashboard__row|data-pipeline-graphic__button|UserLogo|CustomerLogo|customer-logo|partner-logo|PartnerLogo|"
    r"BrandLogo|brand-logo|WalletLogo|wallet-logo|PaymentMethodHubCard__logo|PaymentMethodLogo|method-logo"
)


def is_brand(node) -> bool:
    n, depth = node, 0
    while n is not None and depth < 6:
        label = " ".join(n.classes) + " " + (n.get("aria-label") or "") + " " + (n.get("data-name") or "")
        if BRAND_RE.search(label):
            return True
        n, depth = n.parent, depth + 1
    return False
