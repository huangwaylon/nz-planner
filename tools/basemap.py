# -*- coding: utf-8 -*-
"""Extracts the North Island coastline from the travel-plans book into data/nz/land.svg.html.

The travel-plans index.html carries two inline-SVG maps, each with one <g class="land"> block:
the first is Okinawa's, the second is New Zealand's (inside <article class="guide t-nz">). This
takes the one inside the NZ guide — found by position, then checked by its frame — so a reorder of
the books upstream cannot silently hand us Okinawa.

Both maps share the projection the app's JS uses for pins (see prj() in travel-plans/.map/nz.py):
equirectangular with a cos(lat) correction, lat -40.45..-34.30, lon 172.40..178.90, 692x824.

    python3 tools/basemap.py [path/to/travel-plans/index.html]
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'travel-plans', 'index.html')
OUT = os.path.join(HERE, '..', 'data', 'nz', 'land.svg.html')

html = open(SRC, encoding='utf-8').read()
art = html.find('<article class="guide t-nz"')
if art < 0:
    sys.exit('no <article class="guide t-nz"> in ' + SRC)
end = html.find('</article>', art)
nz = html[art:end]

svg = re.search(r'<svg class="map" viewBox="([^"]+)"', nz)
if not svg or svg.group(1) != '0 0 692 824':
    sys.exit('NZ map frame is not 0 0 692 824 — projection would not match')
m = re.search(r'<g class="land">.*?</g>', nz, re.S)
if not m:
    sys.exit('no <g class="land"> inside the NZ guide')
block = m.group(0)

n = block.count('<path')
open(OUT, 'w', encoding='utf-8').write(block + '\n')
print('wrote %s: %d paths, %d bytes' % (os.path.relpath(OUT), n, len(block)))

# A light copy for first paint: the same paths Douglas-Peucker'd to about 1 map unit (~800 m) and
# without specks, so the boot map costs a third of the bytes. The app swaps in the full coast on idle.
NUM = re.compile(r'-?\d*\.?\d+')


def pts_of(d):
    head, _, rest = d.partition('l')
    x, y = map(float, NUM.findall(head.lstrip('M'))[:2])
    out = [(x, y)]
    vals = list(map(float, NUM.findall(rest.rstrip('Zz'))))
    for i in range(0, len(vals) - 1, 2):
        x += vals[i]; y += vals[i + 1]; out.append((x, y))
    return out


def dp(p, tol):
    if len(p) < 3:
        return p
    keep = [False] * len(p); keep[0] = keep[-1] = True; st = [(0, len(p) - 1)]
    while st:
        a, b = st.pop(); (x1, y1), (x2, y2) = p[a], p[b]; dx, dy = x2 - x1, y2 - y1; n = (dx * dx + dy * dy) ** .5 or 1
        mi, md = -1, 0
        for i in range(a + 1, b):
            dd = abs(dy * (p[i][0] - x1) - dx * (p[i][1] - y1)) / n
            if dd > md: mi, md = i, dd
        if md > tol: keep[mi] = True; st += [(a, mi), (mi, b)]
    return [q for q, k in zip(p, keep) if k]


def area(p):
    return abs(sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p)))) / 2


def enc(p):
    t = [(round(x * 10), round(y * 10)) for x, y in p]
    f = lambda v: ('%g' % (v / 10)).replace('0.', '.') if v >= 0 else ('-%g' % (-v / 10)).replace('-0.', '-.')
    s = 'M%s %s' % (f(t[0][0]), f(t[0][1])) + 'l'
    steps = []
    for (ax, ay), (bx, by) in zip(t, t[1:]):
        steps.append(f(bx - ax) + (' ' if bx - ax >= 0 and False else '') + (f(by - ay) if by - ay < 0 else ' ' + f(by - ay)))
    return s + ' '.join(steps) + 'Z'


paths = re.findall(r'<path d="([^"]+)"/>', block)
lo = []
for d in paths:
    p = pts_of(d)
    if area(p) < 6:
        continue
    q = dp(p, 1.0)
    if len(q) >= 4:
        lo.append('<path d="%s"/>' % enc(q))
LO = os.path.join(HERE, '..', 'data', 'nz', 'land-lo.svg.html')
open(LO, 'w', encoding='utf-8').write('<g class="land">\n' + '\n'.join(lo) + '\n</g>\n')
print('wrote %s: %d paths, %d bytes' % (os.path.relpath(LO), len(lo), os.path.getsize(LO)))
