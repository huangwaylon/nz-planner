"""Compare every pin in data/places.json with what Nominatim returned for its osmQuery.

    python3 tools/verify.py            # reads research/fetched/geocode.json
    python3 tools/verify.py --fix      # move pins that are >1.5 km off to the OSM hit, when that hit
                                       # is unambiguous (single candidate, or all within 300 m)

Distances under 300 m are agreement; a trailhead vs a summit or a beach centroid vs a car park
legitimately differ by a few hundred metres, so those are printed for review, not rewritten.
"""
import json, os, sys, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def km(a, b):
    r = math.pi / 180
    x = (b[1] - a[1]) * r * math.cos((a[0] + b[0]) / 2 * r)
    return 6371 * math.hypot(x, (b[0] - a[0]) * r)


ps = json.load(open(os.path.join(ROOT, 'data', 'nz', 'places.json')))
geo = json.load(open(os.path.join(ROOT, 'research', 'fetched', 'geocode.json')))
fix = '--fix' in sys.argv
ok = review = moved = miss = 0
for p in ps:
    g = geo.get(p['id'])
    if not isinstance(g, list) or not g:
        miss += 1
        print('  no OSM hit   %-34s %s' % (p['id'], p.get('osmQuery', p['name'])))
        continue
    me = (p['lat'], p['lon'])
    d = [km(me, (h['lat'], h['lon'])) for h in g]
    best = min(d)
    if best < 0.3:
        ok += 1
        p['geoOk'] = True
        continue
    tight = all(km((g[0]['lat'], g[0]['lon']), (h['lat'], h['lon'])) < 0.3 for h in g)
    if best > 1.5 and fix and tight:
        p['lat'], p['lon'] = round(g[0]['lat'], 5), round(g[0]['lon'], 5)
        p['geoOk'] = True
        moved += 1
        print('  MOVED %5.1f km %-30s -> %s' % (d[0], p['id'], g[0]['name'][:70]))
    else:
        review += 1
        print('  %5.2f km off  %-32s nearest OSM: %s' % (best, p['id'], g[d.index(best)]['name'][:70]))
if fix:
    json.dump(ps, open(os.path.join(ROOT, 'data', 'nz', 'places.json'), 'w'), ensure_ascii=False, indent=1)
print('agree %d  review %d  moved %d  no-hit %d' % (ok, review, moved, miss))
