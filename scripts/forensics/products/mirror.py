# Mirror assets referenced by the downloaded stripe pages into /home/user/mirror/<host>/<path>.
import re, os, sys, glob, json, hashlib, urllib.request, urllib.parse, concurrent.futures as cf
RAW = '/home/user/logio/docs/research/products/_raw'
ROOT = '/home/user/mirror'
HOSTS = {'stripe-camo.global.ssl.fastly.net', 'b.stripecdn.com', 'images.stripeassets.com', 'videos.stripeassets.com', 'assets.stripeassets.com', 'stripe.com'}
ASSET_EXT = re.compile(r'\.(css|js|mjs|png|jpe?g|gif|svg|webp|avif|mp4|webm|woff2?|ttf|otf|json|glb|gltf|bin|ktx2|mov)(\?|$)', re.I)
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

def local_path(u):
    p = urllib.parse.urlsplit(u)
    path = urllib.parse.unquote(p.path)
    if path.endswith('/'): path += 'index'
    lp = os.path.join(ROOT, p.netloc, path.lstrip('/'))
    if p.query:
        lp += '__' + hashlib.sha1(p.query.encode()).hexdigest()[:8]
    return lp

def want(u):
    p = urllib.parse.urlsplit(u)
    if p.netloc not in HOSTS: return False
    if p.netloc == 'stripe.com' and not ASSET_EXT.search(p.path): return False
    return True

def fetch(u):
    lp = local_path(u)
    if os.path.exists(lp) and os.path.getsize(lp) > 0: return u, lp, 'cached'
    os.makedirs(os.path.dirname(lp), exist_ok=True)
    req = urllib.request.Request(u, headers={'User-Agent': UA, 'Accept': '*/*', 'Referer': 'https://stripe.com/'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        open(lp, 'wb').write(data)
        return u, lp, 'ok'
    except Exception as e:
        return u, None, 'ERR ' + str(e)[:80]

def html_urls(s):
    s = s.replace('&amp;', '&')
    out = set(re.findall(r'https?://[a-zA-Z0-9.-]+/[^\s"\'<>)\\,]*', s))
    for m in re.findall(r'(?:src|href|srcset|poster|data-[a-z-]*src[a-z-]*)\s*=\s*["\']([^"\']+)["\']', s):
        for part in m.split(','):
            part = part.strip().split(' ')[0]
            if part.startswith('/') and not part.startswith('//'):
                out.add('https://stripe.com' + part)
    # srcset entries contain spaces/commas in absolute form too
    for m in re.findall(r'srcset\s*=\s*["\']([^"\']+)["\']', s):
        for part in m.split(','):
            part = part.strip().split(' ')[0]
            if part.startswith('http'): out.add(part)
    return {u.rstrip('.') for u in out}

def css_urls(css, base):
    out = set()
    for m in re.findall(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', css):
        if m.startswith('data:'): continue
        out.add(urllib.parse.urljoin(base, m))
    for m in re.findall(r'@import\s+["\']([^"\']+)["\']', css):
        out.add(urllib.parse.urljoin(base, m))
    return out

urls = set()
for f in glob.glob(RAW + '/*.html'):
    urls |= {u for u in html_urls(open(f).read()) if want(u)}
done = {}
rounds = 0
while True:
    todo = [u for u in urls if u not in done]
    if not todo: break
    rounds += 1
    with cf.ThreadPoolExecutor(12) as ex:
        for u, lp, st in ex.map(fetch, todo):
            done[u] = (lp, st)
    # recurse into CSS
    new = set()
    for u, (lp, st) in list(done.items()):
        if lp and lp.split('__')[0].endswith('.css'):
            new |= {x for x in css_urls(open(lp, errors='ignore').read(), u) if want(x) or 'stripecdn' in x}
    urls |= new
    if rounds > 4: break
json.dump({u: {'path': lp and os.path.relpath(lp, ROOT), 'status': st} for u, (lp, st) in done.items()}, open(ROOT + '/map.json', 'w'), indent=1)
from collections import Counter
print(Counter(v[1].split(' ')[0] for v in done.values()))
for u, (lp, st) in done.items():
    if st.startswith('ERR'): print(st, u[:140])
