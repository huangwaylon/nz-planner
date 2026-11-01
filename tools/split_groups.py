# -*- coding: utf-8 -*-
"""Moves the curated clusters out of plans.json into groups.json, whole, so the first screen
carries only what the day view and the simulation read (the ① tier view never needs them).

    data/nz/plans.json    no clusters
    data/nz/groups.json   {id: {ids, startAt?, best?, name, nameJa, blurb, blurbJa}}, in cluster order
                          (loaded with planner-more.js; tools/check_plans.py reads it back)

Idempotent: a curator may add or edit clusters in plans.json as before (with their words); a run
merges them into groups.json and removes them from plans.json. Run after editing clusters:
    python3 tools/split_groups.py
check_plans.py --gate fails while plans.json still carries clusters.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = os.path.join(ROOT, 'data', 'nz', 'plans.json')
GR = os.path.join(ROOT, 'data', 'nz', 'groups.json')

raw = open(PL, encoding='utf-8').read()
plans = json.loads(raw)
groups = json.load(open(GR, encoding='utf-8')) if os.path.exists(GR) else {}
inc = plans.pop('clusters', None)
if inc is not None:
    out = {}
    for c in inc:                          # plans.json's order wins; its fields over the old entry
        g = dict(groups.get(c['id']) or {})
        g.update({k: v for k, v in c.items() if k != 'id' and v not in (None, '')})
        out[c['id']] = g
    groups = out
# keep plans.json's own formatting style (one line per top-level key is what the curator writes)
indent = 1 if raw.lstrip().startswith('{\n') else None
json.dump(plans, open(PL, 'w', encoding='utf-8'), ensure_ascii=False, indent=indent, separators=None if indent else (',', ':'))
json.dump(groups, open(GR, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('plans.json clusters moved; groups.json %d clusters' % len(groups))
