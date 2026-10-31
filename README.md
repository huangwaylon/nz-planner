# NZ Planner

A proof-of-concept trip planner for the New Zealand book of
[travel-plans](https://github.com/huangwaylon/travel-plans): candidate places on an offline SVG map,
preset versions of the trip, drag or tap to rearrange a day, and live times between stops. It
is built to fold into that book as one more tab; see [docs/FOLD.md](docs/FOLD.md).

Static, with no build step and no dependencies. Runs on GitHub Pages at $0. Japanese first,
English toggle. Made for Safari on iPhone.

## Run it

    python3 -m http.server 8790        # then http://localhost:8790/  (add ?nosw to skip the service worker)

## Tests (CI runs these before every deploy)

    node tools/gmlist.test.js           # Google Maps list parser (pagination included)
    node tools/igsaved.test.js          # Instagram export parser and matching
    node tools/swap.test.js             # quick-swap ranking regressions
    python3 tools/check_plans.py --gate # every version's days: hours, ferries, tides, sunset

## Data pipeline (authoring time only; nothing here runs on the phone)

| Step | Tool | Output |
|---|---|---|
| Merge researched places, apply sourced corrections | `tools/merge.py` (+ `research/overrides.json`, kept local) | `data/nz/places.json` |
| Split the first-paint fields from the rest | `tools/split_places.py` | `places.json`, `places-more.json` |
| Pins against OpenStreetMap | `tools/fetch.js` `startGeocode()` → `tools/verify.py` | report |
| Drive-time matrix, OSRM free-flow | `tools/fetch.js` `startMatrix()` | `data/nz/travel.json` |
| Road shapes for preset legs | `tools/fetch.js` `startRoutes()` → `tools/routes.py` | `data/nz/routes.json` |
| Photos (Wikimedia Commons, CC only) | `tools/photos.js` → `tools/photos.py` | `images/nz/`, `data/nz/photos.json` |
| Coastline (from the book's generator) | `tools/basemap.py` | `data/nz/land*.svg.html` |

The `fetch.js` steps run inside Chrome, which is the only thing on the authoring machine that
reaches OSRM, Nominatim and Commons. `tools/serve.py` serves the repo and accepts their results.

## Deploy

Push to `main`. `.github/workflows/pages.yml` runs the tests, assembles `_site/` from the explicit
allowlist in `tools/dist.sh`, which refuses to publish if a private string appears, and deploys
it. `research/` and `SPEC.md` hold the traveller's profile and tester reports; they are
gitignored and never published.

## Privacy

- Plans hold place ids, minutes and HH:MM times only.
- The base is the New Lynn suburb centre, never an address.
- No names or booking references appear anywhere in the app.

## Credits

- Map data © OpenStreetMap contributors, ODbL. Routes and drive times from the OSRM demo server.
- Tides from LINZ.
- Photos from Wikimedia Commons; each photo's author and licence is shown under it and listed in
  `data/nz/photos.json`. The Pouākai Tarns photo is from the travel book.
