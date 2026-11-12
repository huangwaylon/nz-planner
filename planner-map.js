/* The planner's map engine: MapLibre GL (vendor/maplibre, loaded on first use by import()) over
   OpenFreeMap's vector tiles (OpenStreetMap data, OpenMapTiles schema). The basemap style is our own,
   after ../fitness travel/map/basemap.ts, coloured from the book's theme tokens (GL styles cannot read
   CSS custom properties, so the tokens are read once and resolved to rgb). Labels follow the page
   language; Japanese is drawn from the system font (localIdeographFontFamily), Latin from
   OpenFreeMap's glyphs.

   window.plmap:
     create(el, opts) -> Promise<engine>   opts: {lang, onClick(hit), onMove(), onMode(mode)}
     snapshot(opts)   -> Promise<{canvas, project(lon,lat)->[x,y]}|null>   a one-off still (story.js)
   engine: map, setLang, setData(src, fc), fit(bbox,{padding,maxZoom,instant}), ease(lon,lat,zoom),
     zoomBy(k), zoom(), center(), bounds(), project, unproject, moving(), resize(), marker(el,lon,lat), destroy()
   Overlay sources (setData): 'alld' 'legs' 'marks' 'others' 'cands'. Feature properties drive paint:
     lines {kind:'road'|'est'|'walk'|'ferry', color}, points {id, fill, stroke, r}, marks {text, color}. */
(function () {
  'use strict';
  if (window.plmap) return;
  const ME = document.currentScript && document.currentScript.src || location.href;
  const VENDOR = new URL('vendor/maplibre/', ME).href;
  const TILES = 'https://tiles.openfreemap.org';
  /* the North Island frame (planner.js LAT0…LON1), with room to pan past the coast */
  const FRAME = [[172.40, -40.45], [178.90, -34.30]];
  const MAXB = [[170.9, -41.6], [180.0, -33.4]];
  const ATTR = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
    '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
  const FONT = ['Noto Sans Regular'], FONT_B = ['Noto Sans Bold'];
  const IDEO = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';

  let LIB = null;
  function lib() {
    if (LIB) return LIB;
    if (!document.querySelector('link[data-plmap]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = VENDOR + 'maplibre-gl.css'; l.dataset.plmap = '';
      document.head.appendChild(l);
    }
    LIB = import(VENDOR + 'maplibre-gl.js').then(m => { m.setWorkerUrl(VENDOR + 'maplibre-gl-worker.js'); return m; })
      .catch(e => { LIB = null; throw e; });
    return LIB;
  }

  /* ---------- colour: the theme tokens, resolved ---------- */
  function rgb(s) {
    const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000'; c.fillStyle = s.trim() || '#000';
    const v = c.fillStyle;   /* #rrggbb or rgba(r, g, b, a) */
    if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
    const m = v.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] == null ? 1 : m[3]];
  }
  const css = a => `rgba(${a.map((n, i) => i < 3 ? Math.round(n) : +n.toFixed(3)).join(',')})`;
  const mix = (a, b, t) => css(a.map((n, i) => n + (b[i] - n) * t));
  function theme(el) {
    const cs = getComputedStyle(el), tok = n => rgb(cs.getPropertyValue('--' + n));
    const bg = tok('bg'), sf = tok('surface'), ink = tok('ink'), sea = tok('map-sea'), green = tok('d3'), amber = tok('d4');
    return {
      land: css(bg), sea: css(sea),
      urban: mix(bg, ink, .035), buildings: mix(bg, ink, .085),
      park: mix(bg, green, .16), wood: mix(bg, green, .22), scrub: mix(bg, green, .1), farm: mix(bg, green, .06), sand: mix(bg, amber, .1),
      road: css(sf), roadCasing: mix(bg, ink, .16), major: css(sf), majorCasing: mix(bg, ink, .26),
      highway: mix(sf, amber, .28), highwayCasing: mix(bg, amber, .55), rail: mix(bg, ink, .3), boundary: mix(bg, ink, .35),
      label: css(tok('ink')), labelSoft: css(tok('muted')), roadLabel: css(tok('faint')), parkLabel: mix(green, ink, .45),
      waterLabel: css(tok('acc-d')), halo: css(sf), waterHalo: css(sea)
    };
  }

  /* ---------- the basemap's layers (after fitness basemap.ts) ---------- */
  const labelField = l => l === 'en' ? ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']] : ['coalesce', ['get', 'name:ja'], ['get', 'name']];
  const labelLayout = l => ({ 'text-field': labelField(l), 'text-max-width': l === 'ja' ? 12 : 9 });
  const interp = (stops, base) => ['interpolate', ['exponential', base || 1.4], ['zoom']].concat(stops.flat());
  const edge = z => Math.min(1.6, Math.max(0.5, (z - 9) * 0.25));
  const casing = stops => interp(stops.map(([z, w]) => [z, w + 2 * edge(z)]));
  const at = stops => z => {
    if (z <= stops[0][0]) return stops[0][1];
    for (let k = 1; k < stops.length; k++) { const [z1, v1] = stops[k], [z0, v0] = stops[k - 1]; if (z <= z1) return v0 + (v1 - v0) * (z - z0) / (z1 - z0); }
    return stops[stops.length - 1][1];
  };
  const byClass = (zooms, classes, a, b, base) => ['interpolate', ['exponential', base || 1.4], ['zoom']].concat(zooms.flatMap(z => [z, ['match', ['get', 'class'], classes, a(z), b(z)]]));
  const isClass = (...c) => ['match', ['get', 'class'], c, true, false];
  const lines = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false];
  const polys = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false];
  const ROADS = [
    { id: 'service', filter: isClass('service', 'track'), min: 13, w: [[13, 0.5], [15, 1.6], [18, 6]], color: 'road', edge: 'roadCasing' },
    { id: 'minor', filter: isClass('minor'), min: 12, w: [[12, 0.5], [14, 2.4], [16, 5], [18, 10]], color: 'road', edge: 'roadCasing' },
    { id: 'secondary', filter: isClass('secondary', 'tertiary'), min: 9, w: [[9, 0.5], [12, 1.4], [14, 3.6], [18, 12]], color: 'road', edge: 'roadCasing' },
    { id: 'primary', filter: isClass('primary', 'trunk'), min: 7, w: [[7, 0.5], [10, 1.4], [14, 5], [18, 15]], color: 'major', edge: 'majorCasing' },
    { id: 'motorway', filter: isClass('motorway'), min: 5, w: [[5, 0.5], [10, 1.8], [14, 6], [18, 17]], color: 'highway', edge: 'highwayCasing' }
  ];
  function basemap(t, l) {
    const s = { source: 'base' };
    const fill = (id, layer, filter, color, extra, minzoom) => Object.assign({ id, type: 'fill' }, s, { 'source-layer': layer },
      filter ? { filter } : {}, minzoom ? { minzoom } : {}, { paint: Object.assign({ 'fill-color': color, 'fill-antialias': true }, extra || {}) });
    const halo = { 'text-halo-color': t.halo, 'text-halo-width': 1.6, 'text-halo-blur': 0.4 };
    const text = (size, more, bold) => Object.assign({}, labelLayout(l), { 'text-font': bold ? FONT_B : FONT, 'text-size': size, 'text-letter-spacing': 0.02 }, more || {});
    const sym = (id, layer, minzoom, maxzoom, filter, layout, paint) => Object.assign({ id, type: 'symbol' }, s, { 'source-layer': layer },
      minzoom ? { minzoom } : {}, maxzoom ? { maxzoom } : {}, filter ? { filter } : {}, { layout, paint: Object.assign({}, halo, paint) });
    return [
      { id: 'land', type: 'background', paint: { 'background-color': t.land } },
      fill('landuse-urban', 'landuse', isClass('residential', 'suburb', 'neighbourhood', 'commercial', 'retail', 'industrial', 'railway'), t.urban, { 'fill-opacity': interp([[9, 0.4], [13, 1]], 1) }),
      fill('landcover-farm', 'landcover', isClass('farmland'), t.farm),
      fill('landcover-grass', 'landcover', isClass('grass'), t.scrub),
      fill('landcover-wetland', 'landcover', isClass('wetland'), t.scrub),
      fill('landcover-wood', 'landcover', isClass('wood'), t.wood, { 'fill-opacity': interp([[6, 0.6], [11, 1]], 1) }),
      fill('park', 'park', polys, t.park, { 'fill-opacity': interp([[6, 0.5], [11, 1]], 1) }),
      fill('landuse-grounds', 'landuse', isClass('pitch', 'playground', 'cemetery', 'school', 'hospital', 'university', 'college', 'stadium'), t.park, { 'fill-opacity': 0.6 }, 12),
      fill('landcover-sand', 'landcover', isClass('sand'), t.sand),
      fill('aeroway', 'aeroway', polys, t.urban, {}, 11),
      Object.assign({ id: 'waterway', type: 'line' }, s, { 'source-layer': 'waterway', filter: ['!=', ['get', 'brunnel'], 'tunnel'], minzoom: 9, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': t.sea, 'line-width': byClass([9, 12, 14, 18], ['river'], at([[9, 0.8], [14, 3], [18, 10]]), at([[9, 0], [12, 0.4], [14, 1.2], [18, 4]])) } }),
      fill('water', 'water', ['!=', ['get', 'brunnel'], 'tunnel'], t.sea),
      Object.assign({ id: 'runway', type: 'line' }, s, { 'source-layer': 'aeroway', minzoom: 11, filter: ['all', lines, isClass('runway', 'taxiway')],
        paint: { 'line-color': t.road, 'line-width': byClass([11, 12, 14, 17], ['runway'], at([[11, 2], [14, 12], [17, 40]]), at([[11, 0.3], [12, 0.5], [17, 8]])) } }),
      Object.assign({ id: 'building', type: 'fill' }, s, { 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': t.buildings, 'fill-outline-color': t.roadCasing, 'fill-opacity': interp([[14, 0], [15, 1]], 1) } }),
      Object.assign({ id: 'ferry', type: 'line' }, s, { 'source-layer': 'transportation', minzoom: 9, filter: isClass('ferry'), paint: { 'line-color': t.waterLabel, 'line-opacity': 0.3, 'line-width': 1, 'line-dasharray': [3, 3] } }),
      Object.assign({ id: 'path', type: 'line' }, s, { 'source-layer': 'transportation', minzoom: 13, filter: ['all', lines, isClass('path', 'pedestrian')], layout: { 'line-cap': 'round' }, paint: { 'line-color': t.roadCasing, 'line-width': interp([[13, 0.8], [18, 3]]), 'line-dasharray': [0.1, 2] } }),
      Object.assign({ id: 'rail', type: 'line' }, s, { 'source-layer': 'transportation', minzoom: 10, filter: isClass('rail', 'transit'), paint: { 'line-color': t.rail, 'line-width': interp([[10, 0.6], [16, 2]]), 'line-dasharray': [4, 2] } }),
      ...ROADS.map(r => Object.assign({ id: `road-${r.id}-casing`, type: 'line' }, s, { 'source-layer': 'transportation', minzoom: r.min, filter: ['all', lines, r.filter],
        layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': t[r.edge], 'line-width': casing(r.w) } })),
      ...ROADS.map(r => Object.assign({ id: `road-${r.id}`, type: 'line' }, s, { 'source-layer': 'transportation', minzoom: r.min, filter: ['all', lines, r.filter],
        layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': t[r.color], 'line-width': interp(r.w) } })),
      Object.assign({ id: 'boundary', type: 'line' }, s, { 'source-layer': 'boundary', filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
        paint: { 'line-color': t.boundary, 'line-width': interp([[4, 0.6], [12, 1.4]]), 'line-dasharray': [3, 2], 'line-opacity': 0.6 } }),
      /* labels */
      sym('label-waterway', 'waterway', 13, 0, lines, text(11, { 'symbol-placement': 'line' }), { 'text-color': t.waterLabel, 'text-halo-color': t.waterHalo }),
      ...['point', 'line'].map(p => sym('label-water-' + p, 'water_name', 0, 0, p === 'line' ? lines : ['!', lines],
        text(byClass([4, 8, 10, 14], ['ocean', 'sea'], at([[4, 12], [10, 16]]), at([[8, 11], [14, 14]]), 1), { 'text-letter-spacing': 0.12, 'symbol-placement': p }),
        { 'text-color': t.waterLabel, 'text-halo-color': t.waterHalo })),
      sym('label-road', 'transportation_name', 13, 0, ['any', isClass('motorway', 'trunk', 'primary', 'secondary', 'tertiary'), ['all', ['>=', ['zoom'], 15], isClass('minor', 'service')]],
        text(interp([[13, 10.5], [17, 13]], 1), { 'symbol-placement': 'line', 'text-padding': 8 }), { 'text-color': t.roadLabel }),
      sym('label-poi', 'poi', 14, 0, ['all', ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false], isClass('park', 'beach', 'attraction', 'museum', 'zoo', 'aquarium', 'castle', 'campsite', 'viewpoint', 'monument', 'ferry_terminal')],
        text(interp([[14, 10.5], [17, 12.5]], 1), { 'symbol-sort-key': ['get', 'rank'], 'text-padding': 6 }),
        { 'text-color': ['match', ['get', 'class'], ['park', 'beach', 'campsite', 'viewpoint'], t.parkLabel, t.labelSoft] }),
      sym('label-peak', 'mountain_peak', 11, 0, null, text(11, { 'symbol-sort-key': ['get', 'rank'] }), { 'text-color': t.parkLabel }),
      sym('label-park', 'park', 10, 0, ['!', lines], text(interp([[10, 10.5], [14, 12.5]], 1), { 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99], 'text-padding': 6 }), { 'text-color': t.parkLabel }),
      sym('label-hood', 'place', 13, 0, isClass('suburb', 'quarter', 'neighbourhood', 'hamlet', 'isolated_dwelling'), text(interp([[13, 10.5], [16, 13]], 1), { 'symbol-sort-key': ['get', 'rank'], 'text-padding': 4 }), { 'text-color': t.labelSoft }),
      sym('label-island', 'place', 8, 0, isClass('island', 'islet'), text(interp([[8, 11], [14, 15]], 1), { 'symbol-sort-key': ['get', 'rank'] }), { 'text-color': t.labelSoft }),
      sym('label-village', 'place', 10, 0, isClass('village'), text(interp([[10, 11], [15, 15]], 1), { 'symbol-sort-key': ['get', 'rank'], 'text-padding': 4 }), { 'text-color': t.label }),
      sym('label-town', 'place', 7, 0, isClass('town'), text(interp([[7, 11], [14, 17]], 1), { 'symbol-sort-key': ['get', 'rank'], 'text-padding': 4 }), { 'text-color': t.label }),
      sym('label-city', 'place', 4, 0, isClass('city'), text(interp([[4, 12], [12, 20]], 1), { 'symbol-sort-key': ['get', 'rank'] }, true), { 'text-color': t.label }),
      sym('label-state', 'place', 4, 8, isClass('state', 'province'), text(13, { 'text-letter-spacing': 0.1 }), { 'text-color': t.labelSoft })
    ];
  }

  /* ---------- the planner's overlays ---------- */
  const EMPTY = () => ({ type: 'FeatureCollection', features: [] });
  const OVER = ['alld', 'legs', 'marks', 'others', 'cands'];
  function overlays(t) {
    const w = add => ['interpolate', ['linear'], ['zoom'], 6, 2 + add, 10, 3.2 + add, 14, 5 + add];
    const kind = k => ['==', ['get', 'kind'], k];
    const lc = { 'line-join': 'round', 'line-cap': 'round' };
    const col = ['coalesce', ['get', 'color'], t.label];
    return {
      lines: [
        { id: 'alld', type: 'line', source: 'alld', layout: lc, paint: { 'line-color': col, 'line-width': w(-0.5), 'line-opacity': 0.55 } },
        { id: 'legs-casing', type: 'line', source: 'legs', filter: ['in', ['get', 'kind'], ['literal', ['road', 'est']]], layout: lc, paint: { 'line-color': t.halo, 'line-width': w(3), 'line-opacity': 0.9 } },
        { id: 'legs-road', type: 'line', source: 'legs', filter: kind('road'), layout: lc, paint: { 'line-color': col, 'line-width': w(0) } },
        { id: 'legs-est', type: 'line', source: 'legs', filter: kind('est'), layout: lc, paint: { 'line-color': col, 'line-width': w(0), 'line-opacity': 0.6 } },
        { id: 'legs-walk', type: 'line', source: 'legs', filter: kind('walk'), layout: { 'line-join': 'round', 'line-cap': 'butt' }, paint: { 'line-color': col, 'line-width': w(-0.5), 'line-dasharray': [1.4, 1.1] } },
        { id: 'legs-ferry', type: 'line', source: 'legs', filter: kind('ferry'), layout: lc, paint: { 'line-color': col, 'line-width': w(-0.5), 'line-dasharray': [0, 1.8] } }
      ],
      points: [
        { id: 'marks', type: 'symbol', source: 'marks', layout: { 'text-field': ['get', 'text'], 'text-font': FONT_B, 'text-size': 13, 'text-allow-overlap': true },
          paint: { 'text-color': col, 'text-halo-color': t.halo, 'text-halo-width': 2 } },
        { id: 'others', type: 'circle', source: 'others', paint: { 'circle-radius': ['case', ['boolean', ['feature-state', 'sel'], false], ['+', ['coalesce', ['get', 'r'], 4.5], 2.5], ['coalesce', ['get', 'r'], 4.5]], 'circle-color': ['coalesce', ['get', 'fill'], t.label], 'circle-stroke-color': ['coalesce', ['get', 'stroke'], t.halo], 'circle-stroke-width': 1.5 } },
        { id: 'cands-cluster', type: 'circle', source: 'cands', filter: ['has', 'point_count'], paint: { 'circle-radius': ['step', ['get', 'point_count'], 12, 10, 14, 50, 17], 'circle-color': t.halo, 'circle-stroke-color': t.labelSoft, 'circle-stroke-width': 1.5 } },
        { id: 'cands-count', type: 'symbol', source: 'cands', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': FONT_B, 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': t.label } },
        { id: 'cands', type: 'circle', source: 'cands', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-radius': ['case', ['boolean', ['feature-state', 'sel'], false], ['+', ['coalesce', ['get', 'r'], 4.5], 3], ['coalesce', ['get', 'r'], 4.5]],
            'circle-color': ['coalesce', ['get', 'fill'], t.halo], 'circle-opacity': ['coalesce', ['get', 'op'], 1], 'circle-stroke-opacity': ['coalesce', ['get', 'op'], 1],
            'circle-stroke-color': ['case', ['boolean', ['feature-state', 'sel'], false], t.label, ['coalesce', ['get', 'stroke'], t.labelSoft]],
            'circle-stroke-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.4, ['coalesce', ['get', 'sw'], 2]] } }
      ]
    };
  }
  /* ground and roads, the route lines, the basemap's labels (their halos over the lines), then the points */
  function style(t, l) {
    const base = basemap(t, l), o = overlays(t), src = {};
    OVER.forEach(k => { src[k] = Object.assign({ type: 'geojson', data: EMPTY() }, k === 'cands' ? { cluster: true, clusterRadius: 36, clusterMaxZoom: 11, promoteId: 'id' } : k === 'others' ? { promoteId: 'id' } : {}); });
    src.base = { type: 'vector', url: TILES + '/planet', attribution: ATTR };
    return { version: 8, name: 'nz-planner', glyphs: TILES + '/fonts/{fontstack}/{range}.pbf', sources: src,
      layers: base.filter(x => x.type !== 'symbol').concat(o.lines, base.filter(x => x.type === 'symbol'), o.points) };
  }
  const HIT = ['cands', 'cands-cluster', 'others'];

  async function create(el, opts) {
    opts = opts || {};
    const m = await lib();
    /* the module's evaluation and the map's construction in separate tasks, so neither is one long boot task */
    await new Promise(r => setTimeout(r, 0));
    let lang = opts.lang === 'en' ? 'en' : 'ja';
    const t = theme(el), st = style(t, lang);
    const labels = st.layers.filter(x => x.type === 'symbol' && x.source === 'base').map(x => x.id);
    const map = new m.Map({
      container: el, style: st, bounds: FRAME, fitBoundsOptions: { padding: 16 }, maxBounds: MAXB,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0,
      minZoom: 5, maxZoom: 17.5, renderWorldCopies: false, fadeDuration: 120, localIdeographFontFamily: IDEO,
      cooperativeGestures: false, validateStyle: !!opts.validate   /* the style is ours and fixed: validated in the spike only */
    });
    map.touchZoomRotate.disableRotation(); map.keyboard.disableRotation();
    map.addControl(new m.AttributionControl({ compact: true }), 'bottom-left');
    /* compact starts open; keep it to the ⓘ until tapped (the credit stays one tap away, never over the map) */
    const attr = el.querySelector('.maplibregl-ctrl-attrib');
    if (attr && window.MutationObserver) {
      const mo = new MutationObserver(() => { if (attr.classList.contains('maplibregl-compact-show')) { attr.classList.remove('maplibregl-compact-show'); attr.removeAttribute('open'); mo.disconnect(); } });
      mo.observe(attr, { attributes: true, attributeFilter: ['class'] }); setTimeout(() => mo.disconnect(), 15000);
    }
    let tiles = 'wait';
    const mode = x => opts.onMode && opts.onMode(x);
    map.on('data', e => { if (e.dataType === 'source' && e.sourceId === 'base' && e.tile && tiles !== 'ok') { tiles = 'ok'; mode('ready'); } });
    map.on('error', e => { if (e.sourceId === 'base') { if (tiles !== 'down') { tiles = 'down'; mode('offline'); } } else console.error(e.error); });
    map.on('webglcontextlost', () => mode('lost'));
    map.on('webglcontextrestored', () => mode(tiles === 'down' ? 'offline' : 'ready'));
    if (opts.onMove) map.on('moveend', opts.onMove);
    let selId = null;
    map.on('click', e => {
      if (!opts.onClick) return;
      const p = e.point, box = [[p.x - 16, p.y - 16], [p.x + 16, p.y + 16]];
      const f = map.getLayer('cands') ? map.queryRenderedFeatures(box, { layers: HIT }) : [];
      /* the nearest feature to the tap, clusters last */
      let best = null, bd = Infinity;
      f.forEach(x => { const c = x.geometry.coordinates, q = map.project(c), d = Math.hypot(q.x - p.x, q.y - p.y) + (x.properties.point_count ? 8 : 0); if (d < bd) { bd = d; best = x; } });
      const hit = { lon: e.lngLat.lng, lat: e.lngLat.lat, x: p.x, y: p.y, target: e.originalEvent && e.originalEvent.target };
      if (best && best.properties.point_count) {
        const c = best.geometry.coordinates;
        map.getSource('cands').getClusterExpansionZoom(best.properties.cluster_id).then(z => map.easeTo({ center: c, zoom: Math.min(z + 0.2, 16), duration: reduced() ? 0 : 420 }));
        return;
      }
      if (best) { hit.kind = best.layer.id === 'others' ? 'other' : 'cand'; hit.id = best.properties.id; }
      opts.onClick(hit);
    });
    await new Promise((res, rej) => { map.once('load', res); map.once('error', e => { if (!map.loaded() && !e.sourceId) rej(e.error); }); });
    const dur = d => reduced() ? 0 : d;
    return {
      map,
      setLang(l) { lang = l === 'en' ? 'en' : 'ja'; const lay = labelLayout(lang); labels.forEach(id => { map.setLayoutProperty(id, 'text-field', lay['text-field']); map.setLayoutProperty(id, 'text-max-width', lay['text-max-width']); }); },
      setData(src, fc) { const s = map.getSource(src); if (s) s.setData(fc || EMPTY()); },
      /* the candidate a selection rings (feature-state; never a rebuild) */
      select(id) {
        if (selId != null) { map.setFeatureState({ source: 'cands', id: selId }, { sel: false }); map.setFeatureState({ source: 'others', id: selId }, { sel: false }); }
        selId = id || null;
        if (selId != null) { map.setFeatureState({ source: 'cands', id: selId }, { sel: true }); map.setFeatureState({ source: 'others', id: selId }, { sel: true }); }
      },
      /* bbox [[w,s],[e,n]]; padding {top,right,bottom,left} */
      fit(bbox, o) {
        o = o || {};
        const [[w, s], [e, n]] = bbox, one = Math.abs(e - w) < 1e-4 && Math.abs(n - s) < 1e-4;
        const pad = o.padding || 24;
        if (one) { map.easeTo({ center: [w, s], zoom: o.oneZoom || 12, padding: pad, duration: o.instant ? 0 : dur(420) }); return; }
        map.fitBounds(bbox, { padding: pad, maxZoom: o.maxZoom || 14, duration: o.instant ? 0 : dur(420) });
      },
      ease(lon, lat, zoom) { map.easeTo({ center: [lon, lat], zoom: zoom == null ? map.getZoom() : zoom, duration: dur(420) }); },
      zoomBy(k) { map.easeTo({ zoom: map.getZoom() + Math.log2(k), duration: dur(260) }); },
      zoom: () => map.getZoom(),
      center() { const c = map.getCenter(); return [c.lng, c.lat]; },
      bounds() { const b = map.getBounds(); return [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]]; },
      project(lon, lat) { const p = map.project([lon, lat]); return [p.x, p.y]; },
      unproject(x, y) { const c = map.unproject([x, y]); return [c.lat, c.lng]; },
      moving: () => map.isMoving() || map.isZooming(),
      resize: () => map.resize(),
      marker(node, lon, lat, o) {
        const mk = new m.Marker(Object.assign({ element: node, anchor: 'center' }, o || {})).setLngLat([lon, lat]).addTo(map);
        return { el: node, set(lo, la) { mk.setLngLat([lo, la]); return this; }, remove() { mk.remove(); } };
      },
      destroy() { const g = map.style && map.style.glyphManager; map.remove(); if (g && g.destroy) g.destroy(); }
    };
  }

  /* A one-off still for story.js: a w×h canvas (px), drawn at `scale` device px per CSS px (labels
     and lines read at that size on the card), fitted to bbox, with the planner's overlays given as
     {legs, others, marks} feature collections; labels:false leaves the basemap's names out. project(lon,lat) -> [x,y] in the canvas's px (Web
     Mercator from the still's camera, so it outlives the map). Resolves null when the basemap does not
     draw within `wait` ms (offline, no WebGL): the caller draws without it. */
  async function snapshot(o) {
    let m; try { m = await lib(); } catch (e) { return null; }
    const k = o.scale || 1, cw = o.w / k, ch = o.h / k;
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-10000px;top:0;width:${cw}px;height:${ch}px;pointer-events:none;`;
    (o.parent || document.body).appendChild(host);
    let map;
    try {
      const t = theme(o.themeEl || host), st = style(t, o.lang === 'en' ? 'en' : 'ja');
      st.sources.cands.cluster = false;
      if (o.labels === false) st.layers = st.layers.filter(x => !(x.type === 'symbol' && x.source === 'base'));
      Object.keys(o.data || {}).forEach(n => { if (st.sources[n]) st.sources[n].data = o.data[n]; });
      map = new m.Map({ container: host, style: st, bounds: o.bbox, fitBoundsOptions: { padding: o.padding == null ? 16 : o.padding, maxZoom: o.maxZoom || 13 },
        interactive: false, attributionControl: false, pixelRatio: k, fadeDuration: 0, localIdeographFontFamily: IDEO,
        canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true } });
    } catch (e) { host.remove(); return null; }
    let tiles = false;
    map.on('data', e => { if (e.dataType === 'source' && e.sourceId === 'base' && e.tile) tiles = true; });
    const ok = await new Promise(res => {
      const to = setTimeout(() => res(false), o.wait || 3500);
      map.once('load', () => map.once('idle', () => { clearTimeout(to); res(tiles); }));
      map.on('error', e => { if (e.sourceId === 'base' || !map.loaded()) { clearTimeout(to); res(false); } });
    });
    let out = null;
    if (ok) {
      try {
        const c = document.createElement('canvas'); c.width = o.w; c.height = o.h;
        c.getContext('2d').drawImage(map.getCanvas(), 0, 0, o.w, o.h);
        c.getContext('2d').getImageData(0, 0, 1, 1);   /* throws if the tiles tainted it */
        const z = map.getZoom(), ctr = map.getCenter(), ws = 512 * Math.pow(2, z);
        const merc = (lon, lat) => { const s = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360 * ws, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * ws]; };
        const c0 = merc(ctr.lng, ctr.lat);
        out = { canvas: c, project: (lon, lat) => { const p = merc(lon, lat); return [(p[0] - c0[0] + cw / 2) * k, (p[1] - c0[1] + ch / 2) * k]; } };
      } catch (e) { out = null; }
    }
    map.remove(); host.remove();
    return out;
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.plmap = { create, snapshot, FRAME, preload: () => lib().then(() => true, () => false) };
})();
