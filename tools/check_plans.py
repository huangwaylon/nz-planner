"""Simulate every day of every plan in data/nz/plans.json and report what would go wrong.

    python3 tools/check_plans.py            # all plans
    python3 tools/check_plans.py classic    # one plan
    python3 tools/check_plans.py --json     # machine-readable, for the curator loop
    python3 tools/check_plans.py --gate     # CI: exit 1 on any blocking problem

Uses the same inputs as the app: travel.json minutes (OSRM free-flow), the ferry model in
plans.json, place hours by weekday, dwell minutes, and the day's start/end anchors (a plan may
override them in `anchors`). Times are minutes after midnight; a stop can run past midnight on the
last day because the flight is at 00:10.

Checks, worst first:
  closed     the place is closed that weekday, or shut before the visit ends
  ferry      an island leg misses the listed sailing, the weekday has no service, or no way back
  late       the day reaches its end anchor after its deadline (default 22:30; Feb 16 airport 20:30)
  tide       a tide-flagged beach visited outside low water ±90 min (Taranaki, Auckland west coast, Waitematā)
  dark       an outdoor stop (hike/beach/view/swim) ends after sunset
  long       more than 4 h 30 of driving in one day
  tight      a day with less than 30 min of slack before its deadline
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sun as SUN

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data', 'nz')
WD = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
# Sunset from the travel book (NOAA): Auckland 20:23 on Feb 11, about 1 min earlier a day;
# New Plymouth 20:28 on Feb 13. Taranaki/Waikato stops use the New Plymouth figure.
SUNSET = {'2027-02-11': 1223, '2027-02-12': 1222, '2027-02-13': 1221, '2027-02-14': 1220,
          '2027-02-15': 1219, '2027-02-16': 1218}
SUNSET_WEST = {'2027-02-13': 1228, '2027-02-14': 1227}
OUTDOOR = {'hike', 'beach', 'view', 'swim'}
# Low tides (NZDT) by place area. Port Taranaki from research/regions.json's researcher; Auckland
# west coast and Waitematā added by the curator from LINZ. Elsewhere a tide flag is reported unchecked.
LOW_TIDE = {
    'taranaki': {'2027-02-13': ['08:42', '21:10'], '2027-02-14': ['09:36', '22:06']},
    # Auckland west coast: LINZ 2027 Onehunga low waters (NZDT, static.charts.linz.govt.nz
    # tide-tables/maj-ports/csv/Onehunga 2027.csv) shifted by the Piha Beach secondary-port low-water
    # difference, -0h35 (LINZ NZNA_Secondary-ports-2026-27.csv, port 6375b). Bethells is -0h50,
    # Muriwai -0h30, Paratutae Island (Whatipu) -0h28 — all inside the 90-min window, so one table
    # serves the coast. Onehunga lows: 11th 08:21/20:44, 12th 08:59/21:24, 13th 09:42/22:08,
    # 14th 10:31/23:00, 15th 11:33, 16th 00:05/12:50.
    'west': {'2027-02-11': ['07:46', '20:09'], '2027-02-12': ['08:24', '20:49'],
             '2027-02-13': ['09:07', '21:33'], '2027-02-14': ['09:56', '22:25'],
             '2027-02-15': ['10:58', '23:30'], '2027-02-16': ['12:15']},
    # Waitematā side (Takapuna fossil forest): LINZ 2027 Auckland (port 6400) low waters, NZDT, as is.
    'city': {'2027-02-11': ['05:03', '17:33'], '2027-02-12': ['05:42', '18:13'],
             '2027-02-13': ['06:26', '18:57'], '2027-02-14': ['07:14', '19:45'],
             '2027-02-15': ['08:10', '20:40'], '2027-02-16': ['09:14', '21:43']},
}
TIDE_WINDOW = 90     # minutes either side of low water that a tide-flagged beach is walkable
DEADLINE = 22 * 60 + 30


def hm(m):
    m = int(round(m))
    return '%s%02d:%02d' % ('+' if m >= 1440 else '', (m // 60) % 24, m % 60)


def mins(s):
    h, m = s.split(':')
    return int(h) * 60 + int(m)


def weekday(date):
    import datetime
    return WD[datetime.date.fromisoformat(date).weekday()]


def load():
    places = {p['id']: p for p in json.load(open(os.path.join(D, 'places.json')))}
    plans = json.load(open(os.path.join(D, 'plans.json')))
    for b in plans.get('basePlaces', []):
        places.setdefault(b['id'], b)
    t = json.load(open(os.path.join(D, 'travel.json')))
    idx = {k: i for i, k in enumerate(t['ids'])}
    return places, plans, t['min'], idx


def ferry_of(p, ferries):
    for f in ferries:
        if p['id'] in f.get('ids', []) or p.get('area') in f.get('areas', []):
            return f
    return None


class Sim:
    def __init__(self):
        self.places, self.plans, self.M, self.idx = load()
        # plans.json `tides` is the one copy the app reads too; LOW_TIDE is only the fallback.
        global LOW_TIDE
        LOW_TIDE = {k: v for k, v in self.plans.get('tides', LOW_TIDE).items() if not k.startswith('_')}
        self.ferries = self.plans.get('ferries', [])

    def drive(self, a, b):
        i, j = self.idx.get(a), self.idx.get(b)
        if i is None or j is None:
            pa, pb = self.places[a], self.places[b]
            r = math.pi / 180
            x = (pb['lon'] - pa['lon']) * r * math.cos((pa['lat'] + pb['lat']) / 2 * r)
            km = 6371 * math.hypot(x, (pb['lat'] - pa['lat']) * r) * 1.35
            return km / 50 * 60, True
        return self.M[i][j], False

    def leg(self, a, b, t, date, warn):
        """Minutes from a to b leaving at t, routing island crossings through the ferry and
        no-road places (plans.json `noRoad`: id -> road end) on foot through their road end.
        Sets self.drove to the driving part, so a walk-then-drive leg counts only its drive."""
        nr = self.plans.get('noRoad', {})
        ea, eb = nr.get(a), nr.get(b)
        if (ea or eb) and not self.walk(a, b):
            m, k, d = 0, 'walk', 0
            x = a
            if ea and ea != b:
                m += self.walk(a, ea)
                x = ea
            y = eb if eb and eb != x else b
            if x != y:
                mm, kk = self.leg(x, y, t + m, date, warn)
                m, d = m + mm, d + self.drove
                k = 'drive' if kk == 'drive' else kk
            if eb and y != b:
                m += self.walk(y, b)
            self.drove = d
            return m, k
        self.drove = 0
        w = self.walk(a, b)
        if w is not None:
            return w, 'walk'
        r = self._leg(a, b, t, date, warn)
        self.drove = r[0] if r[1] in ('drive', '≈') else 0
        return r

    def walk(self, a, b):
        for w in self.plans.get('walks', []):
            if (w['a'], w['b']) == (a, b):
                return w['min']
            if (w['b'], w['a']) == (a, b):
                return w.get('down', w['min'])
        return None

    def _leg(self, a, b, t, date, warn):
        fa, fb = ferry_of(self.places[a], self.ferries), ferry_of(self.places[b], self.ferries)
        if fa is fb:
            m, est = self.drive(a, b)
            return m, ('≈' if est else 'drive')
        if fb:      # mainland -> island
            m, _ = self.drive(a, fb['from'])
            ready = t + m + fb.get('board', 15)
            dep = self.sailing(fb, 'out', date, ready, warn)
            return (dep - t) + fb['min'] + self.drive(fb['to'], b)[0], 'ferry'
        if fa:      # island -> mainland
            ready = t + self.drive(a, fa['to'])[0] + 10
            dep = self.sailing(fa, 'back', date, ready, warn)
            return (dep - t) + fa['min'] + self.drive(fa['from'], b)[0], 'ferry'
        return self.drive(a, b)[0], 'drive'

    def sailing(self, f, way, date, ready, warn):
        wd = weekday(date)
        if f.get('days') and wd not in f['days']:
            warn.append(('ferry', '%s ferry does not run on %s' % (f['id'], wd)))
        sched = f.get(way) or {}
        times = sched.get('all') or (sched.get('mon-fri') if wd in WD[:5] else sched.get('sat-sun'))
        if not times:
            return ready      # "about hourly" / unknown: assume the next boat, flagged unverified
        for s in times:
            if mins(s) >= ready:
                return mins(s)
        warn.append(('ferry', 'missed the last %s %s sailing (%s), ready at %s' % (f['id'], way, times[-1], hm(ready))))
        return ready

    def day(self, plan, d):
        date = d['date']
        a = dict(d['start']), dict(d['end'])
        ov = plan.get('anchors', {}).get(date, {})
        start, end = dict(a[0], **ov.get('start', {})), dict(a[1], **ov.get('end', {}))
        stops = plan['days'].get(date, [])
        stay = plan.get('stay', {})
        t = mins(plan.get('start', {}).get(date) or start.get('time') or '09:00') + start.get('buffer', 0)
        warn, rows, driving, cur = [], [], 0, start['id']
        wd = weekday(date)
        for sid in stops:
            p = self.places.get(sid)
            if not p:
                warn.append(('closed', 'unknown place id %s' % sid))
                continue
            m, kind = self.leg(cur, sid, t, date, warn)
            driving += self.drove
            arr = t + m
            # stayDay {date: {id: min}} beats stay {id: min}: the same place can be visited on two
            # days for different lengths (the tarns at sunset, then again at sunrise).
            dur = plan.get('stayDay', {}).get(date, {}).get(sid, stay.get(sid, p.get('dur', 60)))
            h = p.get('hours', 'always')
            if isinstance(h, dict):
                span = h.get(wd)
                if not span:
                    warn.append(('closed', '%s is closed on %s' % (sid, wd)))
                else:
                    o, c = [mins(x) for x in span.split(',')[0].split('-')]
                    if arr < o:
                        arr = o
                    if arr + min(dur, 45) > c:
                        warn.append(('closed', '%s: arrive %s, closes %s' % (sid, hm(arr), hm(c))))
            elif h == 'unknown':
                warn.append(('hours?', '%s hours unknown' % sid))
            dep = arr + dur
            if 'tide' in (p.get('flags') or []) or any('tide' in f for f in (p.get('flags') or [])):
                lows = LOW_TIDE.get(p.get('area'), {}).get(date)
                if lows is None:
                    warn.append(('tide?', '%s needs low tide; no table for %s on %s' % (sid, p.get('area'), date)))
                elif not any(abs(arr + dur / 2 - mins(x)) <= TIDE_WINDOW for x in lows):
                    warn.append(('tide', '%s at %s-%s; low tide %s' % (sid, hm(arr), hm(dep), ' / '.join(lows))))
            # Sun at the place itself (tools/sun.py, NOAA; matches the book's figures to a minute).
            sunset, sunrise = SUN.sunset(date, p['lat'], p['lon']), SUN.sunrise(date, p['lat'], p['lon'])
            best = set(str(p.get('best') or 'any').split(','))     # "sunrise,sunset" = either end of day
            if p.get('cat') in OUTDOOR and dep > sunset + 1 and not best & {'sunset', 'night'}:
                warn.append(('dark', '%s ends %s, sunset %s' % (sid, hm(dep), hm(sunset))))
            # Before dawn is fine when it is the approach to a sunrise stop later the same day
            # (a headlamp start at the trailhead).
            later = stops[stops.index(sid) + 1:]
            for_dawn = any('sunrise' in str(self.places.get(x, {}).get('best')) for x in later)
            if p.get('cat') in OUTDOOR and arr < sunrise - 30 and not best & {'sunrise', 'night'} and not for_dawn:
                warn.append(('dark', '%s starts %s, sunrise %s' % (sid, hm(arr), hm(sunrise))))
            # A stop that exists for the sun has to be there for it: in the morning for sunrise, by
            # evening for sunset. A place good for both passes on whichever end of the day it is.
            morning = arr < 12 * 60
            # `mustSun` places exist for the sun (the tarns' reflection): missing it blocks. For the
            # rest, `best` is a preference, so it is a golden-hour hint only.
            sk = 'sun' if p.get('mustSun') else 'golden'
            if 'sunrise' in best and (morning or best == {'sunrise'}) and not (arr <= sunrise + 10 and dep >= sunrise):
                warn.append((sk, '%s at %s-%s misses sunrise %s' % (sid, hm(arr), hm(dep), hm(sunrise))))
            if 'sunset' in best and (not morning or best == {'sunset'}) and not (arr <= sunset + 15 and dep >= sunset - 30):
                warn.append((sk, '%s at %s-%s misses sunset %s' % (sid, hm(arr), hm(dep), hm(sunset))))
            rows.append((hm(arr), hm(dep), sid, kind, int(round(m))))
            t, cur = dep, sid
        m, kind = self.leg(cur, end['id'], t, date, warn)
        driving += self.drove
        fin = t + m
        dl = mins(end['time']) if end.get('time') else DEADLINE
        if fin > dl:
            warn.append(('late', 'reaches %s at %s, deadline %s' % (end['id'], hm(fin), hm(dl))))
        elif dl - fin < 30:
            warn.append(('tight', 'only %d min slack before %s' % (dl - fin, hm(dl))))
        if driving > 270:
            warn.append(('long', '%s of driving' % hm(driving)))
        rows.append((hm(fin), '', end['id'], kind, int(round(m))))
        return {'date': date, 'rows': rows, 'warn': warn, 'driving': int(driving), 'end': hm(fin)}


def main():
    s = Sim()
    want = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = []
    for plan in s.plans['plans']:
        if want and plan['id'] not in want:
            continue
        days = [s.day(plan, d) for d in s.plans['days']]
        out.append({'plan': plan['id'], 'days': days,
                    'problems': sum(1 for d in days for w in d['warn'] if w[0] not in ('tight', 'hours?', 'tide?', 'golden'))})
    if '--gate' in sys.argv:
        # Data hygiene the schedule depends on: no U+FFFD anywhere (mojibake reached the plan
        # picker once), and no cafe or restaurant claiming to be open around the clock.
        hyg = []
        for f in ('places.json', 'places-more.json', 'plans.json', 'photos.json'):
            fp = os.path.join(D, f)
            if os.path.exists(fp) and '\ufffd' in open(fp, encoding='utf-8').read():
                hyg.append('U+FFFD in ' + f)
        hyg += ['%s: hours "always" on a %s' % (i, p['cat']) for i, p in s.places.items()
                if p.get('cat') in ('cafe', 'food') and p.get('hours') == 'always']
        # Every place flag needs a label in flags.json ({flag: {ja, en, level}}), or the app drops it
        # silently (safety flags went missing that way once). A flag matches whole, or by the part
        # before ':' ("track-closed:lion-rock-summit"). level is safety | info | hidden.
        fp = os.path.join(D, 'flags.json')
        lab = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
        hyg += ['flags.json: %s has no ja/en or a bad level' % k for k, v in lab.items()
                if not (isinstance(v, dict) and v.get('ja') and v.get('en') and v.get('level') in ('safety', 'info', 'hidden'))]
        hyg += ['%s: flag %r has no label in flags.json' % (i, f) for i, p in s.places.items() for f in (p.get('flags') or [])
                if f not in lab and str(f).split(':')[0] not in lab]
        # Every drive leg a preset or cluster draws must ship its road shape in routes.json, or
        # each fresh phone asks the OSRM demo server at boot (ARCH: no runtime APIs).
        rp = os.path.join(D, 'routes.json')
        have = set(json.load(open(rp))) if os.path.exists(rp) else set()
        legs = set()
        for plan in s.plans['plans']:
            for d in s.plans['days']:
                r = s.day(plan, d)
                st = (plan.get('anchors', {}).get(d['date'], {}).get('start') or d['start'])['id']
                ids = [st] + [x[2] for x in r['rows']]
                legs |= {(a, b) for a, b, row in zip(ids, ids[1:], r['rows']) if row[3] == 'drive' and a != b}
        for c in s.plans.get('clusters', []):
            legs |= {(a, b) for a, b in zip(c['ids'], c['ids'][1:])
                     if a != b and s.leg(a, b, 600, '2027-02-12', [])[1] == 'drive'}
        hyg += ['no road shape for %s>%s (run tools/fetch.js startRoutes + tools/routes.py)' % l
                for l in sorted(legs) if '%s>%s' % l not in have]
        for h in hyg:
            print('FAIL data', h)
        # CI: any closed/ferry/late/dark/tide problem fails the deploy. Long driving days are
        # allowed because each version's blurb states them.
        bad = [(p['plan'], d['date'], w) for p in out for d in p['days'] for w in d['warn']
               if w[0] in ('closed', 'ferry', 'late', 'dark', 'tide', 'sun')]
        for b in bad:
            print('FAIL %s %s %s: %s' % (b[0], b[1], b[2][0], b[2][1]))
        print('%d plans, %d blocking problems, %d data problems' % (len(out), len(bad), len(hyg)))
        sys.exit(1 if bad or hyg else 0)
    if '--json' in sys.argv:
        print(json.dumps(out, ensure_ascii=False))
        return
    for p in out:
        print('== %s  (%d problems)' % (p['plan'], p['problems']))
        for d in p['days']:
            print('  %s  drive %s  end %s' % (d['date'], hm(d['driving']), d['end']))
            for r in d['rows']:
                print('      %-6s %-6s %-34s %s %d' % r)
            for w in d['warn']:
                print('    ! %-6s %s' % w)


if __name__ == '__main__':
    main()
