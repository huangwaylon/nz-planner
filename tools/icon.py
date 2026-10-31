# -*- coding: utf-8 -*-
"""Draws icon-180.png and icon-512.png with no dependencies: a night-navy square (the .t-nz ink), a pale cone of
Taranaki over a mist horizon, and a low sun. 3x3 supersampled for clean edges.

    python3 tools/icon.py
"""
import os, struct, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PINE, MIST, SNOW, SUN = (0x1b, 0x1d, 0x33), (0xcb, 0xd9, 0xea), (0xf5, 0xf4, 0xf8), (0xc9, 0x83, 0x2b)


def colour(x, y):            # x, y in 0..1
    if (x - 0.70) ** 2 + (y - 0.36) ** 2 < 0.075 ** 2:
        return SUN
    peak, base = 0.30, 0.66   # cone: apex (0.5, 0.30), base on y=0.66
    half = (y - peak) / (base - peak) * 0.36
    if peak <= y <= base and abs(x - 0.5) <= half:
        return SNOW if y < 0.42 else MIST
    if y > base:
        return tuple(int(a * 0.75 + b * 0.25) for a, b in zip(PINE, MIST)) if y < 0.70 else PINE
    return PINE


def png(n, path):
    ss, rows = 3, []
    for j in range(n):
        row = bytearray([0])
        for i in range(n):
            acc = [0, 0, 0]
            for a in range(ss):
                for b in range(ss):
                    c = colour((i + (a + .5) / ss) / n, (j + (b + .5) / ss) / n)
                    acc = [p + q for p, q in zip(acc, c)]
            row += bytes(int(v / ss / ss) for v in acc)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b''))


for n in (180, 512):
    png(n, os.path.join(ROOT, 'icon-%d.png' % n))
    print('wrote icon-%d.png' % n)
