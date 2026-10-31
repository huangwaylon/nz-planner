# -*- coding: utf-8 -*-
"""Moves the curated clusters' words out of plans.json into groups.json, so the first screen
carries only what the day view and the simulation read.

    data/nz/plans.json    clusters: [{id, ids, startAt?, best?}]      (the simulation and the gate)
    data/nz/groups.json   {id: {name, nameJa, blurb, blurbJa}}         (loaded with planner-more.js)

Idempotent: words already in groups.json are kept, and words put back into plans.json (a curator
adding a cluster) move over again. Run after editing clusters:  python3 tools/split_groups.py
check_plans.py --gate fails while plans.json still carries cluster words.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'data', 'nz', 'plans.json')
GR = os.path.join(ROOT, 'data', 'nz', 'groups.json')
WORDS = ('name', 'nameJa', 'blurb', 'blurbJa')

raw = open(PL, encoding='utf-8').read()
plans = json.loads(raw)
groups = json.load(open(GR, encoding='utf-8')) if os.path.exists(GR) else {}
for c in plans.get('clusters', []):
    g = groups.setdefault(c['id'], {})
    for k in WORDS:
        if c.get(k):
            g[k] = c[k]
        c.pop(k, None)
groups = {k: v for k, v in groups.items() if any(c['id'] == k for c in plans.get('clusters', []))}
# keep plans.json's own formatting style (one line per top-level key is what the curator writes)
indent = 1 if raw.lstrip().startswith('{\n') else None
json.dump(plans, open(PL, 'w', encoding='utf-8'), ensure_ascii=False, indent=indent, separators=None if indent else (',', ':'))
json.dump(groups, open(GR, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('plans.json %d clusters; groups.json %d entries' % (len(plans.get('clusters', [])), len(groups)))
