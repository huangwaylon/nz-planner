"""research/fetched/routes-raw.json (OSRM lon/lat, from tools/fetch.js startRoutes) -> data/nz/routes.json

    python3 tools/routes.py

Same projection and route tolerance as ../travel-plans/.map/nz.py (frame lat -40.45..-34.30,
lon 172.40..178.90, 692 wide, ROUTE_TOL 0.25 map units), so a planner leg lies on the book's
coastline pixel for pixel. Encoded with Google's polyline algorithm over map units in tenths,
(x, y) order: the format planner.js decPoly() reads. Keys are "<fromId>><toId>".
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAT0, LAT1, LON0, LON1, WIDTH = -40.45, -34.30, 172.40, 178.90, 692
ROUTE_TOL = 0.25
K = math.cos(math.radians((LAT0 + LAT1) / 2))
SC = WIDTH / ((LON1 - LON0) * K)


def prj(lat, lon):
    return ((lon - LON0) * K * SC, (LAT1 - lat) * SC)


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1
        mi, md = -1, 0.0
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - x1) - dx * (pts[i][1] - y1)) / n
            if d > md:
                mi, md = i, d
        if md > tol:
            keep[mi] = True
            st += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep) if k]


def enc(pts):
    out, px, py = [], 0, 0

    def one(v):
        v = ~(v << 1) if v < 0 else v << 1
        while v >= 0x20:
            out.append(chr((0x20 | (v & 0x1f)) + 63))
            v >>= 5
        out.append(chr(v + 63))
    for x, y in pts:
        X, Y = int(round(x * 10)), int(round(y * 10))
        one(X - px)
        one(Y - py)
        px, py = X, Y
    return ''.join(out)


def dec(s):
    pts, i, x, y = [], 0, 0, 0

    def one():
        nonlocal i
        r = sh = 0
        while True:
            b = ord(s[i]) - 63
            i += 1
            r |= (b & 0x1f) << sh
            sh += 5
            if b < 0x20:
                break
        return ~(r >> 1) if r & 1 else r >> 1
    while i < len(s):
        x += one()
        y += one()
        pts.append((x / 10, y / 10))
    return pts


raw = json.load(open(os.path.join(ROOT, 'research', 'fetched', 'routes-raw.json')))
out, npts = {}, 0
for k, r in sorted(raw.items()):
    pts = dp([prj(lat, lon) for lon, lat in r['geom']], ROUTE_TOL)
    e = enc(pts)
    back = dec(e)
    assert len(back) == len(pts) and all(abs(a - c) < 0.051 and abs(b - d) < 0.051 for (a, b), (c, d) in zip(pts, back)), k
    out[k] = e
    npts += len(pts)
s = json.dumps(out, separators=(',', ':'))
open(os.path.join(ROOT, 'data', 'nz', 'routes.json'), 'w').write(s)
import gzip
print('%d legs, %d points, %d bytes, %d gz' % (len(out), npts, len(s), len(gzip.compress(s.encode(), 9))))
