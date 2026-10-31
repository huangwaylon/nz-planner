#!/usr/bin/env python3
"""Build research/gm-regions.json: a tiny offline country/region table for gmlist.js regionOf().

Inputs (gitignored, research/fetched/), fetched once in-page in the chrome-devtools MCP, because
curl and WebFetch are refused by nominatim.openstreetmap.org from this Mac:

  nz-regions.json  GET https://nominatim.openstreetmap.org/lookup?format=json&polygon_geojson=1
                       &polygon_threshold=0.01&addressdetails=1&extratags=1&namedetails=1
                       &accept-language=en&osm_ids=R1638991,R1638992,...   (the 17 NZ admin_level=4
                       relations; ids from Overpass `relation["admin_level"="4"]["ISO3166-2"~"^NZ-"]`)
  countries.json   same, polygon_threshold=0.05, osm_ids=R556706,R382313,R80500 (NZ, JP, AU)

Regional boundaries in OSM run out to the 12 nmi territorial sea, so islands (Waiheke, Great
Barrier) fall inside without any coastline. Output: rings flattened to [lon,lat,lon,lat,...],
3 decimals (~110 m); a point is inside an area by even-odd over all its rings.
Data (c) OpenStreetMap contributors, ODbL 1.0.

    python3 tools/gmregions.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FETCHED = os.path.join(HERE, '..', 'research', 'fetched')
OUT = os.path.join(HERE, '..', 'research', 'gm-regions.json')


def rings(geo):
    polys = [geo['coordinates']] if geo['type'] == 'Polygon' else geo['coordinates']
    out = []
    for poly in polys:
        for ring in poly:
            flat, last = [], None
            for lon, lat in ring:
                pt = (round(lon, 3), round(lat, 3))
                if pt != last:
                    flat += pt
                    last = pt
            if len(flat) >= 8:
                out.append(flat)
    return out


def bbox(rs):
    xs = [v for r in rs for v in r[0::2]]
    ys = [v for r in rs for v in r[1::2]]
    return [min(xs), min(ys), max(xs), max(ys)]


def area(e, level):
    rs = rings(e['geojson'])
    nd = e.get('namedetails') or {}
    cc = e['address']['country_code']
    code = (e.get('extratags') or {}).get('ISO3166-2') or e['address'].get('ISO3166-2-lvl4') if level == 4 else cc.upper()
    return {'level': level, 'cc': cc, 'code': code,
            'name': nd.get('name:en') or e['name'], 'nameJa': nd.get('name:ja') or '',
            'bbox': bbox(rs), 'rings': rs}


def main():
    areas = [area(e, 2) for e in json.load(open(os.path.join(FETCHED, 'countries.json')))]
    areas += [area(e, 4) for e in json.load(open(os.path.join(FETCHED, 'nz-regions.json')))]
    table = {'v': 1, 'src': 'OpenStreetMap via Nominatim /lookup polygon_threshold 0.01 (regions) / 0.05 (countries); ODbL 1.0',
             'areas': areas}
    with open(OUT, 'w') as f:
        json.dump(table, f, ensure_ascii=False, separators=(',', ':'))
    print(OUT, os.path.getsize(OUT), 'bytes,', len(areas), 'areas,',
          sum(len(r) // 2 for a in areas for r in a['rings']), 'points')


if __name__ == '__main__':
    main()
