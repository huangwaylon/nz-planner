"""Sunrise and sunset by place, NOAA's solar position equations (accurate to about a minute
between ±60° latitude). NZDT = UTC+13 throughout the trip.

    python3 tools/sun.py        # self-check against the travel book's NOAA figures
"""
import math, datetime

TZ = 13 * 60  # NZDT, minutes east of UTC


def _events(date, lat, lon):
    d = datetime.date.fromisoformat(date)
    n = d.timetuple().tm_yday
    g = 2 * math.pi / 365 * (n - 1 + 0.5)          # fractional year at local noon
    eqt = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                    - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
            + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    la = math.radians(lat)
    cos_h = (math.cos(math.radians(90.833)) / (math.cos(la) * math.cos(decl))
             - math.tan(la) * math.tan(decl))
    h = math.degrees(math.acos(max(-1, min(1, cos_h))))
    rise = 720 - 4 * (lon + h) - eqt + TZ
    sset = 720 - 4 * (lon - h) - eqt + TZ
    return rise, sset


def sunrise(date, lat, lon):
    return _events(date, lat, lon)[0]


def sunset(date, lat, lon):
    return _events(date, lat, lon)[1]


if __name__ == '__main__':
    hm = lambda m: '%02d:%02d' % (int(round(m)) // 60, int(round(m)) % 60)
    # The travel book's NOAA figures (TRIPS.md): the reference this must reproduce.
    checks = [('Auckland sunset', '2027-02-11', -36.8485, 174.7633, sunset, '20:23'),
              ('New Plymouth sunset', '2027-02-13', -39.0556, 174.0752, sunset, '20:28'),
              ('New Plymouth sunrise', '2027-02-14', -39.0556, 174.0752, sunrise, '06:49')]
    bad = 0
    for name, d, la, lo, f, want in checks:
        got = hm(f(d, la, lo))
        ok = abs(f(d, la, lo) - (int(want[:2]) * 60 + int(want[3:]))) <= 1.5
        bad += not ok
        print('%-22s %s  got %s  want %s  %s' % (name, d, got, want, 'ok' if ok else 'OFF'))
    raise SystemExit(bad)
