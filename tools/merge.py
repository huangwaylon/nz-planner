"""Merge the researchers' place lists into data/places.json.

    python3 tools/merge.py            # research/{outdoors,cafes,jp-places,regions,ume-list}.json -> data/nz/places.json

Dedupes by id, then by name similarity within 400 m (the record with more evidence wins and the
loser's evidence/sources are folded in), checks every field the app reads, and prints what it
dropped or repaired so nothing disappears silently.
"""
import json, math, re, sys, os, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ['outdoors', 'cafes', 'jp-places', 'regions', 'ume-list']
# Neighbours that share words but are different stops (a hall and a restaurant inside it, a park
# and the cafe beside it). research/apart.json may add more.
APART = {frozenset(x) for x in [('ponsonby-central', 'yomi-ponsonby'), ('silo-park-wynyard', 'mibo-wynyard')]}
CATS = {'hike', 'beach', 'view', 'cafe', 'food', 'sight', 'activity', 'town', 'camp', 'swim'}
AREAS = {'west', 'city', 'east', 'north', 'south', 'waiheke', 'gulf', 'waikato', 'coromandel',
         'taranaki', 'taupo', 'northland', 'rotorua'}
DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
HRS = re.compile(r'^\d\d:\d\d-\d\d:\d\d(,\d\d:\d\d-\d\d:\d\d)*$')
# bbox of the map frame
LAT0, LAT1, LON0, LON1 = -40.45, -34.30, 172.40, 178.90


def km(a, b):
    r = math.pi / 180
    x = (b['lon'] - a['lon']) * r * math.cos((a['lat'] + b['lat']) / 2 * r)
    y = (b['lat'] - a['lat']) * r
    return 6371 * math.hypot(x, y)


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower().replace('&', 'and'))


def clean(p, src, log):
    p = dict(p)
    p['src'] = src
    p['id'] = re.sub(r'[^a-z0-9-]', '-', str(p.get('id', '')).lower()).strip('-')
    if not p['id'] or not p.get('name'):
        log.append('drop (no id/name) %r' % p.get('name'))
        return None
    try:
        p['lat'] = round(float(p['lat']), 5)
        p['lon'] = round(float(p['lon']), 5)
    except (KeyError, TypeError, ValueError):
        log.append('drop (no coords) ' + p['id'])
        return None
    if not (LAT0 <= p['lat'] <= LAT1 and LON0 <= p['lon'] <= LON1):
        log.append('drop (outside frame %s,%s) %s' % (p['lat'], p['lon'], p['id']))
        return None
    if p.get('cat') not in CATS:
        log.append('cat %r -> sight  %s' % (p.get('cat'), p['id']))
        p['cat'] = 'sight'
    if p.get('area') not in AREAS:
        log.append('area %r  %s' % (p.get('area'), p['id']))
    h = p.get('hours', 'always')
    if isinstance(h, dict):
        h2 = {}
        for d in DAYS:
            v = h.get(d)
            if v is None or v == '' or v == 'closed':
                h2[d] = None
            else:
                v = str(v).replace(' ', '').replace('–', '-').replace('—', '-')
                if not HRS.match(v):
                    log.append('hours %s=%r unparsed -> unknown  %s' % (d, v, p['id']))
                    h2 = 'unknown'
                    break
                h2[d] = v
        p['hours'] = h2
    elif h not in ('always', 'unknown'):
        log.append('hours %r -> unknown  %s' % (h, p['id']))
        p['hours'] = 'unknown'
    for k, lo, hi in (('trend', 1, 5), ('outdoor', 0, 5), ('aesthetic', 0, 5)):
        try:
            p[k] = max(lo, min(hi, int(round(float(p.get(k, lo))))))
        except (TypeError, ValueError):
            p[k] = lo
    try:
        p['dur'] = max(15, int(p.get('dur') or 60))
    except (TypeError, ValueError):
        p['dur'] = 60
    ig = p.get('ig')
    if ig and not re.match(r'^https://(www\.)?instagram\.com/[A-Za-z0-9_.]+/?$', ig):
        log.append('ig %r not a profile url -> null  %s' % (ig, p['id']))
        p['ig'] = None
    if p.get('igTag'):
        p['igTag'] = str(p['igTag']).lstrip('#').replace(' ', '')
    if not p.get('gmaps'):
        from urllib.parse import quote_plus
        p['gmaps'] = 'https://www.google.com/maps/search/?api=1&query=' + quote_plus(p['name'])
    p.setdefault('nameJa', p['name'])
    p.setdefault('vibe', '')
    p.setdefault('vibeJa', p['vibe'])
    p['flags'] = list(p.get('flags') or [])
    p['evidence'] = list(p.get('evidence') or [])
    p['sources'] = list(p.get('sources') or [])
    return p


def weight(p):
    return len(p['evidence']) + len(p['sources']) + (2 if p.get('ig') else 0)


def main():
    f = os.path.join(ROOT, 'research', 'apart.json')
    if os.path.exists(f):
        APART.update(frozenset(x) for x in json.load(open(f)))
    log, out = [], []
    for s in SRC:
        f = os.path.join(ROOT, 'research', s + '.json')
        if not os.path.exists(f):
            log.append('missing ' + f)
            continue
        for p in json.load(open(f)):
            c = clean(p, s, log)
            if c:
                out.append(c)
    keep = []
    for p in sorted(out, key=weight, reverse=True):
        dup = None
        for q in keep:
            if frozenset((p['id'], q['id'])) in APART:
                continue
            a, b = norm(p['name']), norm(q['name'])
            d = km(p, q)
            sim = difflib.SequenceMatcher(None, a, b).ratio()
            # One name containing the other ("Driving Creek" / "Driving Creek cafe") is the same
            # venue; a cafe *inside* a hall is not, which is what APART is for.
            contained = min(len(a), len(b)) >= 6 and (a in b or b in a)
            if q['id'] == p['id'] or (d < 0.4 and sim > 0.7) or (d < 1.0 and contained):
                dup = q
                break
        if dup:
            log.append('dup %s (%s) -> %s (%s)' % (p['id'], p['src'], dup['id'], dup['src']))
            for k in ('evidence', 'sources', 'flags'):
                dup[k] += [x for x in p[k] if x not in dup[k]]
            if not dup.get('ig') and p.get('ig'):
                dup['ig'] = p['ig']
            if p.get('saved'):           # in the traveller's own Google Maps list: never lost to a dedupe
                dup['saved'] = True
            dup['trend'] = max(dup['trend'], p['trend'])
        else:
            keep.append(p)
    # research/overrides.json: {"<id>": {"<field>": value, ..., "_why": "source"}} — corrections a
    # curator made with a source, applied last so a re-merge never undoes them. `"_drop": true`
    # removes a place.
    f = os.path.join(ROOT, 'research', 'overrides.json')
    if os.path.exists(f):
        ov = json.load(open(f))
        byid = {p['id']: p for p in keep}
        for i, o in ov.items():
            if i not in byid:
                log.append('override for unknown id ' + i)
                continue
            if o.get('_drop'):
                keep.remove(byid[i])
                log.append('dropped %s: %s' % (i, o.get('_why', '')))
                continue
            for k, v in o.items():
                if not k.startswith('_'):
                    byid[i][k] = v
    keep.sort(key=lambda p: (p['area'] or '', p['cat'], p['id']))
    os.makedirs(os.path.join(ROOT, 'data', 'nz'), exist_ok=True)
    json.dump(keep, open(os.path.join(ROOT, 'data', 'nz', 'places.json'), 'w'), ensure_ascii=False, indent=1)
    print('\n'.join(log))
    print('%d places (%d before dedupe)' % (len(keep), len(out)))


if __name__ == '__main__':
    main()
