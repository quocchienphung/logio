# Download an explicit list of URLs (stdin) into the mirror with the same layout as mirror.py.
import os, sys, json
sys.argv = ['x']
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mirror.py')).read().split("urls = set()")[0])
import concurrent.futures as cf
urls = [l.strip() for l in sys.stdin if l.strip()]
m = json.load(open(ROOT + '/map.json'))
with cf.ThreadPoolExecutor(12) as ex:
    for u, lp, st in ex.map(fetch, urls):
        m[u] = {'path': lp and os.path.relpath(lp, ROOT), 'status': st}
        if not st in ('ok', 'cached'): print(st, u)
json.dump(m, open(ROOT + '/map.json', 'w'), indent=1)
print('fetched', len(urls))
