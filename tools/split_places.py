# -*- coding: utf-8 -*-
"""Splits data/nz/places.json into what the planner shows on first paint and what it shows only in
a place sheet, and derives each place's one sourced signal ("badge") from its evidence.

    data/nz/places.json        what first paint needs;
                               book only when true, badge.en only when it differs from ja
    data/nz/places-more.json   {id: {vibe, vibeJa, kw, evidence:[...], sources:[...], + authoring notes}}
                               + badge {ja[,en]}, cost, mapsAt, igN (follower count, e.g. "13K"): place-sheet facts
                               loaded after first paint; the app merges kw/ig/igTag/cost/mapsAt/igN/badge back into each place
    dropped: osmQuery, src, gmaps (the app links Google Maps by coordinates)

Idempotent: if places.json was already split, the evidence is read back from places-more.json.
Run after tools/merge.py:   python3 tools/merge.py && python3 tools/split_places.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'data', 'nz', 'places.json')
MORE = os.path.join(ROOT, 'data', 'nz', 'places-more.json')
DROP = ('evidence', 'sources', 'osmQuery', 'src', 'gmaps')
# kw, ig, igTag, cost, mapsAt and igN are read by search, the place sheet, the import matcher and the
# story, each of which awaits places-more first (the app merges them back into the place); the rest are authoring notes
# no screen reads. Moving them keeps the boot path inside its 100 KB budget.
MOVE = ('vibe', 'vibeJa', 'kw', 'ig', 'igTag', 'cost', 'mapsAt', 'igN', 'badge', 'coordNote', 'coordVerified', 'driveNote', 'driveMin', 'driveFromNewLynnMin',
        'driveFromNewPlymouthMin', 'driveToMangoreiMin', 'hoursNote', 'notes', 'subarea')

places = json.load(open(PL, encoding='utf-8'))
more = json.load(open(MORE, encoding='utf-8')) if os.path.exists(MORE) else {}
for p in places:      # fill anything already split out, so a second run loses nothing
    for k, v in (more.get(p['id']) or {}).items():
        if k not in p or p[k] in (None, [], ''):
            p[k] = v

def kfmt(s):
    s = s.replace(',', '').strip()
    m = re.match(r'^(\d+(?:\.\d+)?)\s*([kKmM]?)$', s)
    if not m: return None
    n, u = float(m.group(1)), m.group(2).lower()
    if u == 'k': n *= 1e3
    if u == 'm': n *= 1e6
    if n >= 1e6: return ('%.1fM' % (n / 1e6)).replace('.0M', 'M')
    if n >= 1e3: return ('%.1fK' % (n / 1e3)).replace('.0K', 'K') if n < 1e4 else '%dK' % round(n / 1e3)
    return '%d' % n

def signals(ev):
    text = ' | '.join(ev)
    out = {}
    m = re.search(r'MICHELIN[^|]*?(one|two|three|\d) star', text, re.I)
    if m: out['michelin'] = {'one': 1, 'two': 2, 'three': 3}.get(m.group(1).lower(), m.group(1))
    m = re.search(r'IG[^|]{0,30}?(\d[\d.,]*\s?[kKmM]?)\s*followers', text) or re.search(r'(\d[\d.,]*\s?[kKmM])\s*followers', text)
    if m and kfmt(m.group(1)): out['ig'] = kfmt(m.group(1))
    m = re.search(r'Google[^|]{0,12}?(\d\.\d)\s*\(\s*(\d[\d.,]*\s?[kK]?)\s*\)', text)
    if m: out['google'] = (m.group(1), kfmt(m.group(2)) or m.group(2))
    m = re.search(r'JP\s*20\d\d[–-]\d\d:\s*(\d+)', text)
    if m: out['jp'] = int(m.group(1))
    for e in ev:   # a ranked list: "<Source> ... 2026 ... #6"
        m = re.search(r'^([A-Z][A-Za-z&\' ]{2,24}?)\b[^#|]{0,60}?(202[56])[^#|]{0,40}?#\s?(\d{1,2})\b', e)
        if m:
            out['rank'] = ('%s %s #%s' % (m.group(1).strip().strip('"'), m.group(2), m.group(3)))[:26]
            break
    return out

def badge(s):
    if 'michelin' in s: return {'ja': 'ミシュラン%s つ星' % s['michelin'], 'en': 'MICHELIN %s★' % s['michelin']}
    if 'rank' in s: return {'ja': s['rank'], 'en': s['rank']}
    if s.get('jp', 0) >= 3: return {'ja': '日本語の投稿 ×%d' % s['jp'], 'en': 'Japanese posts ×%d' % s['jp']}
    if 'ig' in s: return {'ja': 'IG %s' % s['ig'], 'en': 'IG %s' % s['ig']}
    if 'google' in s: return {'ja': '★%s · %s' % s['google'], 'en': '★%s · %s' % s['google']}
    return None

out_more, n_badge = {}, 0
for p in places:
    ev, src = p.get('evidence') or [], p.get('sources') or []
    s = signals(ev)
    b = badge(s)
    p.pop('badge', None); p.pop('igN', None)
    if b:
        if b['en'] == b['ja']: del b['en']      # rankings read the same in both; the app falls back to ja
        p['badge'] = b; n_badge += 1
    if p.get('book') is False: del p['book']   # absent = no booking needed
    if 'ig' in s: p['igN'] = s['ig']
    m = {k: p[k] for k in MOVE if p.get(k) not in (None, [], '')}
    if ev: m['evidence'] = ev
    if src: m['sources'] = src
    if m: out_more[p['id']] = m
    for k in DROP + MOVE: p.pop(k, None)

json.dump(places, open(PL, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(out_more, open(MORE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('places.json %d places, %d with a badge; places-more.json %d entries' % (len(places), n_badge, len(out_more)))
