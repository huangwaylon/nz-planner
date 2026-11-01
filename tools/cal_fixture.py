"""Build tools/fixtures/cal-model.json, the dev model for planner-cal.js, from the shipped data alone.

    python3 tools/cal_fixture.py

Runs `tools/check_plans.py --json` (offline) and shapes its output the way stage ③ hands it to
planner.cal: model.trip, model.days (the active version) and model.versions (the pinned presets).
MUST is read from a test tier map, tools/fixtures/cal-tiers.json (one of them on no preset day).
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sun as SUN
import check_plans as C

ACTIVE, PINNED = 'classic', ['classic', 'hut', 'cafes']
# 絶対 comes from a test tier map in the v2 trip shape (tools/fixtures/cal-tiers.json), the way the
# app reads trip.tier: the places tiered 'must'.
TIERS = json.load(open(os.path.join(HERE, 'fixtures', 'cal-tiers.json'), encoding='utf-8'))
MUST = [k for k, v in TIERS['tier'].items() if v == 'must']
INFO = ('tight', 'hours?', 'tide?', 'golden')   # the kinds check_plans does not count as problems


def bare(s):
    return re.sub(r'\s*[(（].*?[)）]', '', s)   # 'New Lynn (host)' -> 'New Lynn'


def tm(m):
    m = int(round(m)) % 1440
    return '%02d:%02d' % (m // 60, m % 60)


def main():
    places, plans, _, _ = C.load()
    runs = {p['plan']: p for p in json.loads(subprocess.check_output(
        [sys.executable, os.path.join(HERE, 'check_plans.py'), '--json']))}
    by = {p['id']: p for p in plans['plans']}

    def shape(pid):
        plan, out = by[pid], {}
        for i, (base, run) in enumerate(zip(plans['days'], runs[pid]['days'])):
            date, ov = base['date'], plan.get('anchors', {}).get(base['date'], {})
            end = dict(base['end'], **ov.get('end', {}))
            ids = [r[2] for r in run['rows'][:-1]]
            warn = [{'kind': k, 'text': t} for k, t in run['warn'] if k not in INFO]
            first = places[ids[0]] if ids else places[end['id']]
            last = end['id'] == 'akl'
            p = places[end['id']]
            fact = None
            if i == 0:
                fact = {'ja': '%s 着' % base['start']['time'], 'en': 'Land %s' % base['start']['time']}
            elif '・' in base['labelJa']:
                fact = {'ja': base['labelJa'].split('・', 1)[1], 'en': base['label'].split(': ', 1)[-1].split(', ', 1)[-1]}
            out[date] = {
                'date': date, 'weekday': C.weekday(date),
                'colorVar': '--d%d' % (i + 1), 'inkVar': '--ink',
                'sleep': {'name': 'In flight', 'nameJa': '機内'} if last else
                         {'name': bare(p['name']), 'nameJa': bare(p['nameJa'])},
                'stops': len(ids), 'ids': ids,
                'mustPlaced': sum(1 for x in ids if x in MUST), 'mustTotal': len(MUST),
                'driveMin': run['driving'], 'endTime': run['end'],
                'limit': {'time': end.get('time') or '22:30',
                          'label': {'ja': '返車', 'en': 'car'} if last else ''},
                'warn': warn,
                'booked': {'done': 0, 'total': sum(1 for x in ids if places[x].get('book'))},
                'sunrise': tm(SUN.sunrise(date, first['lat'], first['lon'])),
                'sunset': tm(SUN.sunset(date, first['lat'], first['lon'])),
                'fact': fact,
            }
        return plan, out

    model = {'trip': {'start': plans['days'][0]['date'], 'end': plans['days'][-1]['date'], 'lang': 'ja'},
             'days': [], 'versions': []}
    for pid in PINNED:
        plan, days = shape(pid)
        if pid == ACTIVE:
            model['days'] = [dict((k, v) for k, v in d.items() if k != 'ids') for d in days.values()]
        placed = set(x for d in days.values() for x in d['ids'] if x in MUST)
        model['versions'].append({
            'id': pid, 'name': plan['name'], 'nameJa': plan['nameJa'], 'active': pid == ACTIVE,
            'totals': {'driveMin': sum(d['driveMin'] for d in days.values()),
                       'warn': sum(len(d['warn']) for d in days.values()), 'must': [len(placed), len(MUST)]},
            'days': {k: {'stops': [places[x]['nameJa'] for x in d['ids']], 'endTime': d['endTime'],
                         'warn': len(d['warn']), 'label': plan.get('titles', {}).get(k)} for k, d in days.items()},
        })
    fp = os.path.join(HERE, 'fixtures', 'cal-model.json')
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(model, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('wrote', os.path.relpath(fp), '-', len(model['days']), 'days,', len(model['versions']), 'versions')


if __name__ == '__main__':
    main()
