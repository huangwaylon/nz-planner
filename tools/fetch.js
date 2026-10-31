// Runs inside Chrome on http://127.0.0.1:8791/tools/fetch.html — the only route from this machine
// to OSRM and Nominatim. Results are POSTed to tools/serve.py, never returned through devtools.
// Kick off with startGeocode() / startMatrix(); poll window.status.
window.status = 'idle';
const save = (name, obj) => fetch('/save/' + name + '.json', {method: 'POST', body: JSON.stringify(obj)});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const places = () => fetch('/data/nz/places.json', {cache: 'no-store'}).then(r => r.json());
const bases = () => fetch('/data/nz/plans.json', {cache: 'no-store'}).then(r => r.json()).then(j => j.basePlaces || []).catch(() => []);

// Nominatim, 1 request per 1.1 s as its usage policy asks. Records what OSM thinks each
// osmQuery is, so tools/verify.py can flag pins that disagree with it.
async function startGeocode() {
  const ps = await places();
  // Keep what an earlier run found, so adding places costs only their own lookups.
  const out = await fetch('/research/fetched/geocode.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  let i = 0;
  for (const p of ps) {
    i++;
    if (Array.isArray(out[p.id]) && out[p.id].length && 'cc' in out[p.id][0]) continue;
    window.status = `geocode ${i}/${ps.length} ${p.id}`;
    // osmQuery is sometimes Overpass tag syntax, which Nominatim reads as nothing; fall back to
    // the plain name with and without its parenthetical, and stop at the first query with hits.
    const plain = s => s.replace(/\b[a-z_:]+[~=]("[^"]*"|\S+)/g, m => (m.match(/"([^"]*)"/) || [, ''])[1]).replace(/[()|;]/g, ' ').replace(/\s+/g, ' ').trim();
    const qs = [...new Set([p.osmQuery, p.osmQuery && plain(p.osmQuery), p.name, p.name.replace(/\s*\(.*?\)/g, '')].filter(Boolean))];
    try {
      let r = [];
      for (const q of qs) {
        const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&countrycodes=nz&q=' + encodeURIComponent(q);
        r = await (await fetch(u)).json();
        if (r.length) break;
        await sleep(1100);
      }
      out[p.id] = r.map(x => ({lat: +x.lat, lon: +x.lon, name: x.display_name, type: x.type, cls: x.category,
        cc: (x.address || {}).country_code, region: (x.address || {}).state || (x.address || {}).region, place: (x.address || {}).suburb || (x.address || {}).town || (x.address || {}).city || (x.address || {}).village}));
    } catch (e) { out[p.id] = {error: String(e)}; }
    await sleep(1100);
  }
  await save('geocode', out);
  window.status = 'geocode done';
}

// OSRM /table in blocks: the public server caps a request at 100 coordinates, so the ids are cut
// into chunks of 50 and every (source chunk, destination chunk) pair is one request.
async function startMatrix() {
  const ps = (await bases()).concat(await places());
  const seen = new Set(), pts = [];
  for (const p of ps) if (!seen.has(p.id)) { seen.add(p.id); pts.push(p); }
  const n = pts.length, C = 50;
  const min = Array.from({length: n}, () => Array(n).fill(null));
  const km = Array.from({length: n}, () => Array(n).fill(null));
  const chunks = [];
  for (let s = 0; s < n; s += C) chunks.push([s, Math.min(n, s + C)]);
  let k = 0;
  for (const [a0, a1] of chunks) for (const [b0, b1] of chunks) {
    k++;
    window.status = `matrix ${k}/${chunks.length ** 2}`;
    const idx = [], coords = [];
    for (let i = a0; i < a1; i++) idx.push(i);
    const srcN = idx.length;
    for (let i = b0; i < b1; i++) if (!(i >= a0 && i < a1)) idx.push(i);
    for (const i of idx) coords.push(pts[i].lon.toFixed(5) + ',' + pts[i].lat.toFixed(5));
    const pos = new Map(idx.map((v, j) => [v, j]));
    const src = [...Array(srcN).keys()].join(';');
    const dst = [];
    for (let i = b0; i < b1; i++) dst.push(pos.get(i));
    const u = `https://router.project-osrm.org/table/v1/driving/${coords.join(';')}?sources=${src}&destinations=${dst.join(';')}&annotations=duration,distance`;
    for (let t = 0; t < 4; t++) {
      try {
        const j = await (await fetch(u)).json();
        if (j.code !== 'Ok') throw new Error(j.code);
        for (let a = 0; a < srcN; a++) for (let b = 0; b < dst.length; b++) {
          const d = j.durations[a][b], m = j.distances[a][b];
          min[a0 + a][b0 + b] = d == null ? null : Math.round(d / 60);
          km[a0 + a][b0 + b] = m == null ? null : Math.round(m / 100) / 10;
        }
        break;
      } catch (e) { window.status += ' retry ' + e; await sleep(3000); }
    }
    await sleep(1200);
  }
  await save('travel', {ids: pts.map(p => p.id), min, km, fetched: new Date().toISOString(), source: 'OSRM free-flow'});
  window.status = 'matrix done';
}

// OSRM /route geometry for every drive leg in research/fetched/route-pairs.json (written by the
// lead from tools/check_plans.py). Raw lon/lat goes back; tools/routes.py projects, simplifies
// and encodes it, so this stays a dumb pipe.
async function startRoutes() {
  const pairs = await fetch('/research/fetched/route-pairs.json', {cache: 'no-store'}).then(r => r.json());
  const out = {};
  let i = 0;
  for (const [a, b, la, lo, lb, lob] of pairs) {
    i++;
    window.status = `routes ${i}/${pairs.length} ${a}>${b}`;
    const u = `https://router.project-osrm.org/route/v1/driving/${lo},${la};${lob},${lb}?overview=full&geometries=geojson`;
    for (let t = 0; t < 3; t++) {
      try {
        const j = await (await fetch(u)).json();
        if (j.code !== 'Ok') throw new Error(j.code);
        const r = j.routes[0];
        out[a + '>' + b] = {min: Math.round(r.duration / 60), km: Math.round(r.distance / 100) / 10, geom: r.geometry.coordinates};
        break;
      } catch (e) { await sleep(3000); }
    }
    await sleep(1000);
  }
  await save('routes-raw', out);
  window.status = 'routes done ' + Object.keys(out).length;
}
