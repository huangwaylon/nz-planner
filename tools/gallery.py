"""Merge the image galleries into data/nz/gallery.json (URLs only; nothing is downloaded).

    python3 tools/gallery.py           # research/gallery-{commons,biz}.json -> data/nz/gallery.json
    python3 tools/gallery.py --check   # validate the shipped file only (CI)

Each entry is {u, w, h, by, lic, page, alt, altJa}. Rejects what would break later: non-https,
signed or expiring CDN URLs, Instagram/Facebook/Google-photo hosts (their terms, or they expire),
duplicates, and ids that are not places. Prints coverage so the gaps stay visible.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data', 'nz')
OUT = os.path.join(D, 'gallery.json')
SRC = [os.path.join(ROOT, 'research', 'gallery-commons.json'), os.path.join(ROOT, 'research', 'gallery-biz.json')]
BAD_HOST = re.compile(r'(cdninstagram|fbcdn|instagram\.com|facebook\.com|googleusercontent|ggpht|gstatic|'
                      r'tripadvisor|yelp|lookaside)', re.I)
SIGNED = re.compile(r'[?&](oe|se|sig|signature|x-amz-signature|x-goog-signature|expires|token)=', re.I)
MAX_PER_PLACE = 6


def ids():
    p = {x['id'] for x in json.load(open(os.path.join(D, 'places.json')))}
    p |= {b['id'] for b in json.load(open(os.path.join(D, 'plans.json'))).get('basePlaces', [])}
    return p


def clean(entries, known, log):
    out = {}
    for pid, imgs in entries.items():
        if pid not in known:
            log.append('unknown id ' + pid)
            continue
        seen, keep = set(), []
        for im in imgs or []:
            u = str(im.get('u', ''))
            why = ('not https' if not u.startswith('https://') else
                   'banned host' if BAD_HOST.search(u) else
                   'signed/expiring' if SIGNED.search(u) else
                   'duplicate' if u in seen else None)
            if why:
                log.append('%s: drop %s (%s)' % (pid, u[:80], why))
                continue
            seen.add(u)
            e = {k: im.get(k) for k in ('u', 'w', 'h', 'by', 'lic', 'page', 'alt', 'altJa') if im.get(k) not in (None, '')}
            if any('\ufffd' in str(v) for v in e.values()):
                log.append('%s: drop %s (U+FFFD in its text; fix the caption in research/gallery-fix.json)' % (pid, u[:80]))
                continue
            if 'upload.wikimedia.org' in u and '/960px-' not in u:
                log.append('%s: drop %s (Commons URL must be the 960px thumb form the app swaps widths on)' % (pid, u[:80]))
                continue
            if not (isinstance(e.get('w'), int) and isinstance(e.get('h'), int) and e['w'] > 0 and e['h'] > 0):
                log.append('%s: drop %s (no size; the app needs w/h for zero layout shift)' % (pid, u[:80]))
                continue
            keep.append(e)
        if keep:
            out[pid] = keep[:MAX_PER_PLACE]
    return out


def report(g, known):
    places = json.load(open(os.path.join(D, 'places.json')))
    n = {k: 0 for k in ('3+', '1-2', '0')}
    zero = []
    for p in places:
        c = len(g.get(p['id'], []))
        n['3+' if c >= 3 else '1-2' if c else '0'] += 1
        if not c:
            zero.append(p['id'])
    imgs = sum(len(v) for v in g.values())
    print('places %d: %s images in 3+, %d with 1-2, %d with none; %d images total' % (len(places), n['3+'], n['1-2'], n['0'], imgs))
    if zero:
        print('no images:', ' '.join(zero))


def main():
    known = ids()
    log = []
    if '--check' in sys.argv:
        g = json.load(open(OUT))
        again = clean(g, known, log)
        for l in log:
            print('FAIL', l)
        report(g, known)
        sys.exit(1 if log or again != g else 0)
    g = {}
    fx = os.path.join(ROOT, 'research', 'gallery-fix.json')
    alias = json.load(open(fx)).get('alias', {}) if os.path.exists(fx) else {}
    for f in SRC:
        if os.path.exists(f):
            raw = {}
            altfix = json.load(open(fx)).get('alt', {}) if os.path.exists(fx) else {}
            for pid, imgs in json.load(open(f)).items():   # a dropped duplicate's images join its survivor
                # caption corrections apply before validation, so a fixed caption passes the U+FFFD check
                raw.setdefault(alias.get(pid, pid), []).extend(dict(im, **altfix.get(im.get('u'), {})) for im in (imgs or []))
            for pid, imgs in clean(raw, known, log).items():
                have = {x['u'] for x in g.get(pid, [])}
                g[pid] = (g.get(pid, []) + [x for x in imgs if x['u'] not in have])[:MAX_PER_PLACE]
        else:
            log.append('missing ' + f)
    # research/gallery-fix.json: reviewer corrections by URL, applied last so a re-merge keeps them.
    fx = os.path.join(ROOT, 'research', 'gallery-fix.json')
    if os.path.exists(fx):
        fix = json.load(open(fx))
        for pid, urls in fix.get('drop', {}).items():
            if pid in g:
                g[pid] = [x for x in g[pid] if x['u'] not in set(urls)]
                if not g[pid]:
                    del g[pid]
        for pid in g:
            for x in g[pid]:
                x.update(fix.get('alt', {}).get(x['u'], {}))
    json.dump(g, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('\n'.join(log[:60]) + ('\n… %d more' % (len(log) - 60) if len(log) > 60 else ''))
    report(g, known)
    import gzip
    s = open(OUT, 'rb').read()
    print('gallery.json %d bytes, %d gz' % (len(s), len(gzip.compress(s, 9))))


if __name__ == '__main__':
    main()
