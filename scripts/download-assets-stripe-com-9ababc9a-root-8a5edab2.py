"""Localize assets observed in the frozen Stripe browser session."""
import concurrent.futures
import hashlib
import json
import pathlib
import shutil
import urllib.request
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'docs/research/stripe-com-9ababc9a/root-8a5edab2'
PUBLIC = ROOT / 'public/sites/stripe-com-9ababc9a/root-8a5edab2'
PUBLIC.mkdir(parents=True, exist_ok=True)
observed = {}
bundled = {}
for name in ['asset-bundle.json', 'loaded-asset-bundle.json']:
    data = json.loads((RESEARCH / name).read_text(encoding='utf-8'))
    for asset in data['assets']:
        bundled[asset['url']] = asset
for name in ['asset-inventory.json', 'loaded-asset-inventory.json']:
    data = json.loads((RESEARCH / name).read_text(encoding='utf-8'))
    for asset in data['assets']:
        if asset['kind'] in ['font', 'stylesheet', 'image', 'video'] and urlparse(asset['url']).hostname in ['b.stripecdn.com', 'images.stripeassets.com', 'assets.stripeassets.com']:
            observed[asset['url']] = asset
observed.update(bundled)

def acquire(pair):
    url, asset = pair
    suffix = pathlib.Path(asset.get('path') or urlparse(url).path).suffix or '.bin'
    name = hashlib.sha256(url.encode()).hexdigest()[:12] + suffix
    target = PUBLIC / name
    try:
        if not target.exists():
            if url in bundled:
                shutil.copyfile(bundled[url]['path'], target)
            else:
                request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(request, timeout=35) as response:
                    target.write_bytes(response.read())
        return {'url': url, 'local': '/sites/stripe-com-9ababc9a/root-8a5edab2/' + name, 'kind': asset['kind'], 'bytes': target.stat().st_size}
    except Exception as error:
        return {'url': url, 'error': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(acquire, observed.items()))
(RESEARCH / 'local-assets.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps({'downloaded': len([r for r in results if 'local' in r]), 'failures': [r for r in results if 'error' in r]}, indent=2))
