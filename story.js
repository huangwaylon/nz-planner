/* story.js: the 9:16 「きょうのプラン」 story image of one day. Loaded lazily, one global.

     plstory.open(model)    draw, then share the PNG (or show a preview sheet with a save link)
     plstory.render(model)  -> Promise<{canvas, blob}>, no UI (used by open() and by tests)

   model = {date:'2027-02-14', dayNo:4, title, titleJa, color:'#e07c00', lang:'ja'|'en',
            stops:[{time:'06:49', name, nameJa, cat, photo?, lat?, lon?}], stats?, tags?, ink?, legs?}
   ink is the day colour darkened for text (else computed); legs = [{kind, pts:[[x,y],…]}] in map
   units draw the road shapes (else straight lines between stops); tags are igTags, '#' optional.
   photo is a URL or {src, src2x, credit}. The first stop with one is the hero. lat/lon, when
   present, draw the mini route over the book's land (data/nz/land.svg.html, the planner's own
   projection). Nothing personal goes on the card: no names, base, room code or link.

   Classic script, no dependencies; tokens come from the guide's computed style. Folds into the
   book with the planner; the sheet's CSS is injected here, all under the pl- prefix. */
(function () {
  'use strict';
  if (window.plstory) return;
  const W = 1080, H = 1920;
  const SERIF = '"Hiragino Mincho ProN","Hiragino Mincho Pro","Yu Mincho","Noto Serif JP",serif';
  const SANS = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif';
  const LATIN = '-apple-system,"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif';
  // The planner's projection (planner.js prj(), after .map/nz.py), so the route lands where the map has it.
  const LAT0 = -40.45, LAT1 = -34.30, LON0 = 172.40, LON1 = 178.90, MW = 692;
  const KC = Math.cos((LAT0 + LAT1) / 2 * Math.PI / 180), SC = MW / ((LON1 - LON0) * KC);
  const prj = (lat, lon) => [(lon - LON0) * KC * SC, (LAT1 - lat) * SC];
  // The book's sprite (24-unit Lucide strokes), same glyph per category as planner.js GLYPH.
  const GL = {
    hike: ['m8 3 4 8 5-5 5 15H2L8 3z'],
    beach: ['M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', 'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', 'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'],
    view: ['M12 10V2', 'm4.93 10.93 1.41 1.41', 'M2 18h2', 'M20 18h2', 'm19.07 10.93-1.41 1.41', 'M22 22H2', 'm8 6 4-4 4 4', 'M16 18a4 4 0 0 0-8 0'],
    cafe: ['M17 8h1a4 4 0 0 1 0 8h-1', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z', 'M6 2v3', 'M10 2v3', 'M14 2v3'],
    food: ['M2 12h20', 'M20 12a8 8 0 0 1-16 0', 'M12 4a3 3 0 0 0-3 3c0 1 .5 1.5 1.5 2', 'M15.5 5.5c.8.6 1 1.4.5 2.5'],
    sight: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z', 'M20 3v4', 'M22 5h-4'],
    activity: ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z', 'M13 5v2', 'M13 17v2', 'M13 11v2'],
    town: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2', 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4', 'M10 10h4', 'M10 14h4', 'M10 18h4'],
    camp: ['M3.5 21 14 3', 'M20.5 21 10 3', 'M15.5 21 12 15l-3.5 6', 'M2 21h20'],
    swim: ['M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 4.8 7 3.5c-.29 1.3-1.15 2.84-2.29 3.75S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z', 'M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a4.16 4.16 0 0 1-7.33 2.66']
  };
  const ST = {
    title: {ja: 'ストーリー用画像', en: 'Story image'},
    share: {ja: '共有', en: 'Share'},
    save: {ja: '画像を保存', en: 'Save image'},
    close: {ja: '閉じる', en: 'Close'},
    making: {ja: '画像を作成中…', en: 'Drawing…'},
    hint: {ja: '長押しで「写真に保存」もできます。', en: 'Or press and hold the image to save it.'},
    fail: {ja: '画像を作れませんでした', en: 'Could not draw the image'},
    more: {ja: 'ほか{n}か所', en: '+{n} more'},
    plan: {ja: 'きょうのプラン', en: "Today's plan"}
  };
  const WD = {ja: ['日', '月', '火', '水', '木', '金', '土'], en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']};
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const TAGS = {
    base: ['ニュージーランド旅行', 'nz2027'],
    hike: 'ニュージーランドハイキング', camp: 'ニュージーランドキャンプ', beach: 'ニュージーランドの海',
    cafe: 'ニュージーランドカフェ', view: '絶景', swim: 'ニュージーランドの海', sight: '海外旅行'
  };
  const L = (m, k) => (ST[k] || {})[m.lang === 'en' ? 'en' : 'ja'];

  /* ---------- tokens: the guide's theme, with the NZ book's values as fallback ---------- */
  function tokens(color) {
    const g = document.querySelector('.guide.t-nz') || document.querySelector('.guide') || document.documentElement;
    const cs = getComputedStyle(g);
    const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    return {
      bg: v('--bg', '#f5f4f8'), bg2: v('--bg-2', '#ebeaf1'), surface: v('--surface', '#ffffff'),
      ink: v('--ink', '#1b1d33'), ink2: v('--ink-2', '#414565'), muted: v('--muted', '#5e6382'),
      line: v('--line', 'rgba(27,29,51,.10)'), acc: v('--acc', '#2f5d9e'), eyebrow: v('--eyebrow', '#ffd08a'),
      sea: v('--map-sea', '#cbd9ea'), day: color || v('--d1', '#1f6fe0')
    };
  }
  // Mix a colour toward black until white text on it clears 4.5:1 (the --pl-dN-ink rule).
  function deep(c) {
    const cv = document.createElement('canvas').getContext('2d');
    cv.fillStyle = c; const hex = cv.fillStyle;
    let [r, g, b] = /^#/.test(hex) ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) : (hex.match(/\d+/g) || [0, 0, 0]).map(Number);
    const lum = (r, g, b) => [r, g, b].map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((a, x, i) => a + x * [.2126, .7152, .0722][i], 0);
    for (let i = 0; i < 20 && 1.05 / (lum(r, g, b) + .05) < 4.5; i++) { r *= .9; g *= .9; b *= .9; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  /* ---------- loading: nothing is drawn until fonts and images have decoded ---------- */
  function img(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const i = new Image(); i.decoding = 'async';
      if (new URL(src, location.href).origin !== location.origin) { i.crossOrigin = 'anonymous'; i.referrerPolicy = 'no-referrer'; }   // Commons gallery pictures: CORS keeps the canvas exportable
      i.onload = () => (i.decode ? i.decode() : Promise.resolve()).then(() => res(i), () => res(i));
      i.onerror = () => res(null);
      i.src = src;
    });
  }
  let landP = null;
  function land() {
    if (!landP) {
      const v = document.querySelector('.v-plan');
      const src = (v && v.dataset.src || 'data/nz/') + 'land.svg.html';
      landP = fetch(src).then(r => r.ok ? r.text() : '').then(t => [...t.matchAll(/ d="([^"]+)"/g)].map(m => new Path2D(m[1]))).catch(() => []);
    }
    return landP;
  }
  function fonts(m) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const sample = 'きょうのプラン2月14日' + (m.titleJa || '') + m.stops.map(s => s.nameJa || s.name).join('');
    return Promise.all([
      document.fonts.load('300 320px ' + SERIF, '0123456789'), document.fonts.load('600 52px ' + SERIF, sample),
      document.fonts.load('600 42px ' + SANS, sample), document.fonts.load('300 30px ' + SANS, sample),
      document.fonts.load('600 30px ' + LATIN, 'NZ 2027')
    ]).catch(() => {}).then(() => document.fonts.ready);
  }

  /* ---------- drawing helpers ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, s, w) {
    if (c.measureText(s).width <= w) return s;
    const a = [...s]; while (a.length > 1 && c.measureText(a.join('') + '…').width > w) a.pop();
    return a.join('') + '…';
  }
  function track(c, s, x, y, em) {        // letter-spacing, for Safari's canvas that lacks ctx.letterSpacing
    if ('letterSpacing' in c) { c.letterSpacing = em + 'px'; c.fillText(s, x, y); c.letterSpacing = '0px'; return c.measureText(s).width + em * s.length; }
    let cx = x; const al = c.textAlign; c.textAlign = 'left';
    for (const ch of s) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + em; }
    c.textAlign = al; return cx - x;
  }
  function glyph(c, cat, x, y, size, color) {
    c.save(); c.translate(x - size / 2, y - size / 2); c.scale(size / 24, size / 24);
    c.strokeStyle = color; c.lineWidth = 1.9; c.lineCap = 'round'; c.lineJoin = 'round';
    (GL[cat] || GL.sight).forEach(d => c.stroke(new Path2D(d)));
    c.restore();
  }
  function cover(c, im, x, y, w, h) {    // object-fit:cover, biased a touch above centre (horizons)
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s;
    c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * .45, sw, sh, x, y, w, h);
  }
  const photoOf = s => s && s.photo ? (typeof s.photo === 'string' ? {src: s.photo} : s.photo) : null;
  const nm = (m, s) => m.lang === 'en' ? (s.name || s.nameJa) : (s.nameJa || s.name);
  const tidy = s => String(s || '').replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim();   // the alt name is a second line in the app; on a card it is noise

  function tagsFor(m) {
    // The trip tag leads; then the day's own (the planner passes the places' igTags), else by category.
    const own = (m.tags || []).map(t => String(t).replace(/^#/, '')).filter(Boolean);
    if (own.length) return [...new Set([TAGS.base[0]].concat(own))].slice(0, 3);
    const out = TAGS.base.slice();
    for (const s of m.stops) { const t = TAGS[s.cat]; if (t && !out.includes(t)) out.push(t); }
    return out.slice(0, 3);
  }

  /* ---------- the card ---------- */
  async function render(m) {
    m = Object.assign({lang: document.documentElement.lang === 'en' ? 'en' : 'ja', stops: []}, m);
    const en = m.lang === 'en';
    const T = tokens(m.color), D = m.ink || deep(T.day);
    const heroStop = m.stops.find(photoOf);
    const hp = photoOf(heroStop);
    const [hero, paths] = await Promise.all([img(hp && (hp.src2x || hp.src)), m.stops.some(s => s.lat != null) ? land() : [], fonts(m)]);

    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.textBaseline = 'alphabetic';
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);

    const dt = new Date((m.date || '2027-02-11') + 'T12:00:00');
    const wd = WD[en ? 'en' : 'ja'][dt.getDay()];
    const M = 64, PW = W - 2 * M, PT = 120, PH = 960;    // photo card; IG's top bar sits over its first 130 px

    // Photo card, or the colour field a photo-less (all cafes) day gets.
    c.save(); rr(c, M, PT, PW, PH, 44); c.clip();
    if (hero) {
      cover(c, hero, M, PT, PW, PH);
      let g = c.createLinearGradient(0, PT + PH * .42, 0, PT + PH);
      g.addColorStop(0, 'rgba(14,16,34,0)'); g.addColorStop(.55, 'rgba(14,16,34,.28)'); g.addColorStop(1, 'rgba(14,16,34,.72)');
      c.fillStyle = g; c.fillRect(M, PT, PW, PH);
      g = c.createLinearGradient(0, PT, 0, PT + 340);
      g.addColorStop(0, 'rgba(14,16,34,.38)'); g.addColorStop(1, 'rgba(14,16,34,0)');
      c.fillStyle = g; c.fillRect(M, PT, PW, 340);
    } else {
      c.fillStyle = T.surface; c.fillRect(M, PT, PW, PH);
      c.globalAlpha = .14; c.fillStyle = T.day; c.fillRect(M, PT, PW, PH);
      // one oversized line glyph of the day's main kind of stop, as texture
      c.globalAlpha = .11; glyph(c, (m.stops[0] || {}).cat, M + PW - 230, PT + 500, 340, D); c.globalAlpha = 1;
    }
    c.restore();
    const onPhoto = hero ? '#ffffff' : D, onPhoto2 = hero ? 'rgba(255,255,255,.86)' : T.ink2;

    // Eyebrow, on the photo below IG's progress bar: NZ 2027 — DAY 04 ............ FEB
    c.font = '600 28px ' + LATIN; c.fillStyle = hero ? T.eyebrow : D; c.textAlign = 'left';
    const ex = M + 56, ey = PT + 170;
    const ew = track(c, 'NZ 2027', ex, ey, 6);
    c.fillRect(ex + ew + 18, ey - 10, 56, 2);
    track(c, 'DAY ' + String(m.dayNo || 1).padStart(2, '0'), ex + ew + 92, ey, 6);
    c.textAlign = 'right'; c.fillStyle = onPhoto2; c.font = '500 28px ' + SANS;
    c.fillText(L(m, 'plan'), W - M - 56, ey);

    // Title, the one serif moment: one line, or two at a break near the middle, never an ellipsis.
    const title = tidy(en ? (m.title || m.titleJa) : (m.titleJa || m.title)) || L(m, 'plan');
    const bx = M + 52, tw = PW - 104;
    c.font = '600 56px ' + SERIF;
    let lines = [title];
    if (c.measureText(title).width > tw) {
      c.font = '600 50px ' + SERIF;
      const ch = [...title], cut = [];
      ch.forEach((x, i) => { if (i > 1 && i < ch.length - 1 && (en ? x === ' ' : /[、。・ ]/.test(ch[i - 1]))) cut.push(i); });
      const mid = ch.length / 2, at = cut.length ? cut.sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid))[0] : Math.ceil(mid);
      lines = [ch.slice(0, at).join('').trim(), fit(c, ch.slice(at).join('').trim(), tw)];
    }
    const LH = lines.length > 1 ? 66 : 0, by = PT + PH - 64 - LH;
    c.textAlign = 'left'; c.fillStyle = onPhoto;
    lines.forEach((t, i) => c.fillText(t, bx, by - 8 + i * 66));
    // Numeral with month and weekday stacked beside it, like a calendar page.
    c.font = '300 250px ' + SERIF;
    const num = String(dt.getDate()), nw = c.measureText(num).width;
    c.save(); if (hero) { c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = 30; }
    c.fillText(num, bx - 6, by - 104);
    c.restore();
    c.font = '600 30px ' + LATIN; c.fillStyle = onPhoto2;
    track(c, MON[dt.getMonth()] + ' ' + dt.getFullYear(), bx + nw + 24, by - 238, 5);
    c.font = en ? '600 32px ' + LATIN : '600 40px ' + SERIF; c.fillStyle = onPhoto;
    track(c, en ? WD.en[dt.getDay()] : wd + '曜日', bx + nw + 24, by - 182, en ? 5 : 3);
    if (hero && hp.credit) {
      c.font = '400 19px ' + SANS; c.fillStyle = 'rgba(255,255,255,.6)'; c.textAlign = 'right';
      c.fillText(fit(c, hp.credit === 'Travel book' ? (en ? 'Photo: travel book' : '写真：旅のしおり') : (en ? 'Photo: ' : '写真：') + hp.credit, 560), W - M - 36, PT + PH - 26);
      c.textAlign = 'left';
    }

    // Stops: time | glyph in a ring of the day colour | name. Up to five, then 「ほか n か所」.
    const geo = m.stops.filter(s => s.lat != null && s.lon != null);
    const mapW = geo.length >= 2 ? 236 : 0;
    const rows = m.stops.slice(0, 5), more = m.stops.length - rows.length;
    let y = PT + PH + 104;
    const RH = 80, tx = M + 128, gx = M + 178, nx = M + 230, nwMax = W - M - nx - (mapW ? mapW + 36 : 20);
    // the hairline spine joining the glyphs
    if (rows.length > 1) { c.fillStyle = T.line; c.fillRect(gx - 1, y - 14, 2, RH * (rows.length - 1)); }
    rows.forEach((s, i) => {
      const cy = y - 14;
      c.font = '500 31px ' + LATIN; c.fillStyle = T.muted; c.textAlign = 'right';
      c.fillText(s.time || '', tx, y);
      c.textAlign = 'left';
      c.beginPath(); c.arc(gx, cy, 25, 0, Math.PI * 2); c.fillStyle = T.bg; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = T.day; c.stroke();
      glyph(c, s.cat, gx, cy, 26, D);
      c.font = '600 37px ' + SANS; c.fillStyle = T.ink;
      c.fillText(fit(c, tidy(nm(m, s)), nwMax), nx, y);
      y += RH;
    });
    if (more > 0) { c.font = '400 28px ' + SANS; c.fillStyle = T.muted; c.fillText(L(m, 'more').replace('{n}', more), nx, y - 26); y += 54; }

    // Mini route: the day's stops over the land, no labels, beside the list.
    if (mapW) {
      const mx = W - M - mapW, my = PT + PH + 58, mh = Math.min(RH * Math.max(rows.length, 3) + 6, 400);
      const pts = geo.map(s => prj(s.lat, s.lon));
      // where the day ends (the night's bed, or the airport): the drive home is part of the day
      const home = m.home && m.home.lat != null ? prj(m.home.lat, m.home.lon) : null, all = home ? pts.concat([home]) : pts;
      let x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0])), y0 = Math.min(...all.map(p => p[1])), y1 = Math.max(...all.map(p => p[1]));
      const span = Math.max(x1 - x0, (y1 - y0) * mapW / mh, 8) * 1.5;
      const cx = (x0 + x1) / 2, cyy = (y0 + y1) / 2, k = mapW / span;
      c.save(); rr(c, mx, my, mapW, mh, 30); c.clip();
      c.fillStyle = T.sea; c.globalAlpha = .5; c.fillRect(mx, my, mapW, mh); c.globalAlpha = 1;
      c.save(); c.translate(mx + mapW / 2, my + mh / 2); c.scale(k, k); c.translate(-cx, -cyy);
      c.fillStyle = T.surface; paths.forEach(p => c.fill(p));
      c.restore();
      const to = p => [mx + mapW / 2 + (p[0] - cx) * k, my + mh / 2 + (p[1] - cyy) * k];
      const sp = pts.map(to);
      const line = (q, dash) => { c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.setLineDash(dash); c.stroke(); };
      c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = T.day;
      // Road shapes when the planner has them (map units, the same projection); walk and ferry dotted, as in the book.
      // Legs between the day's stops and on to where it ends (the drive home is drawn too).
      const near = q => all.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.2);
      const legs = (m.legs || []).filter(l => l && l.pts && l.pts.length > 1 && near(l.pts[0]) && near(l.pts[l.pts.length - 1]));
      if (legs.length) legs.forEach(l => line(l.pts.map(to), l.kind === 'drive' ? [] : [2, 12]));
      else line(home ? sp.concat([to(home)]) : sp, []);
      c.setLineDash([]);
      if (home) { const q = to(home); c.fillStyle = T.day; c.fillRect(q[0] - 9, q[1] - 9, 18, 18); }
      sp.forEach((p, i) => { c.beginPath(); c.arc(p[0], p[1], i === 0 ? 11 : 8, 0, Math.PI * 2); c.fillStyle = i === 0 ? T.day : T.surface; c.fill(); c.lineWidth = 4; c.strokeStyle = T.day; c.stroke(); });
      c.restore();
    }

    // Stats and hashtags, kept clear of IG's reply bar (bottom 260 px).
    const hair = Math.max(y - RH + 44, PT + PH + 104 + RH * 4 + 44);
    y = hair + 64;
    c.textAlign = 'left';
    c.fillStyle = T.line; c.fillRect(M + 40, hair, W - 2 * M - 80, 2);
    if (m.stats) { c.font = '400 29px ' + SANS; c.fillStyle = T.ink2; c.fillText(fit(c, m.stats, W - 2 * M - 40), M + 40, y); y += 50; }
    c.font = '500 28px ' + SANS; c.fillStyle = T.acc;
    c.fillText(fit(c, tagsFor(m).map(t => '#' + t).join('  '), W - 2 * M - 40), M + 40, y);
    // Small mark, centred low.
    c.fillStyle = T.muted; c.globalAlpha = .7;
    const mk = 'AOTEAROA · NEW ZEALAND'; c.font = '600 22px ' + LATIN;
    const mw = c.measureText(mk).width + mk.length * 5;
    track(c, mk, (W - mw) / 2, H - 120, 5); c.globalAlpha = 1;

    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return {canvas: cv, blob};
  }

  /* ---------- the preview sheet ---------- */
  const CSS = `
.pl-story-scrim{position:fixed;inset:0;z-index:90;background:rgba(var(--scrim,14,16,34),.55);display:flex;align-items:flex-end;justify-content:center;-webkit-tap-highlight-color:transparent;}
.pl-story-sheet{width:min(100%,520px);max-height:100vh;max-height:100dvh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#1b1d33);border-radius:24px 24px 0 0;padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;flex-direction:column;align-items:center;gap:14px;font-family:-apple-system,"Hiragino Sans",system-ui,sans-serif;}
.pl-story-head{align-self:stretch;display:flex;align-items:center;justify-content:space-between;}
.pl-story-head h2{margin:0;font:600 17px/1.3 "Hiragino Mincho ProN",serif;font-feature-settings:"palt";}
.pl-story-x{min-width:44px;min-height:44px;border:0;background:none;color:var(--muted,#5e6382);font:600 15px system-ui;-webkit-touch-callout:none;cursor:pointer;}
.pl-story{aspect-ratio:9/16;width:min(70vw,320px);height:auto;border-radius:20px;box-shadow:0 10px 40px rgba(14,16,34,.22);background:var(--bg-2,#ebeaf1);-webkit-touch-callout:default;}
.pl-story-act{align-self:stretch;display:flex;gap:10px;}
.pl-story-act>*{flex:1;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:999px;font:700 15px system-ui;text-decoration:none;border:0;cursor:pointer;-webkit-touch-callout:none;}
.pl-story-share{background:var(--acc,#2f5d9e);color:#fff;}
.pl-story-dl{background:var(--surface-2,#f4f3f8);color:var(--ink,#1b1d33);box-shadow:inset 0 0 0 1px var(--line,rgba(27,29,51,.1));}
.pl-story-hint{margin:0;font:400 12.5px/1.6 system-ui;color:var(--muted,#5e6382);}
.pl-story-act[hidden],.pl-story-share[hidden]{display:none;}
@media (prefers-reduced-motion:no-preference){.pl-story-sheet{animation:pl-story-up .22s ease-out;}}
@keyframes pl-story-up{from{transform:translateY(24px);opacity:0;}}`;
  function style() {
    if (document.getElementById('pl-story-css')) return;
    const s = document.createElement('style'); s.id = 'pl-story-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function sheet(m) {
    style();
    const back = document.activeElement;
    const scrim = document.createElement('div'); scrim.className = 'pl-story-scrim';
    const id = 'pl-story-h-' + Date.now().toString(36);
    scrim.innerHTML = `<div class="pl-story-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="pl-story-head"><h2 id="${id}">${L(m, 'title')}</h2><button type="button" class="pl-story-x">${L(m, 'close')}</button></div>
      <img class="pl-story" alt="${L(m, 'making')}">
      <div class="pl-story-act" hidden><button type="button" class="pl-story-share" hidden>${L(m, 'share')}</button><a class="pl-story-dl" download>${L(m, 'save')}</a></div>
      <p class="pl-story-hint">${L(m, 'making')}</p></div>`;
    const inert = [...document.body.children].filter(e => e !== scrim && !e.inert);
    const close = () => { inert.forEach(e => { e.inert = false; }); scrim.remove(); document.removeEventListener('keydown', key); if (url) URL.revokeObjectURL(url); if (back && back.focus) back.focus(); };
    const key = e => { if (e.key === 'Escape') close(); };
    let url = null;
    scrim.addEventListener('click', e => { if (e.target === scrim || e.target.closest('.pl-story-x')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(scrim);
    inert.forEach(e => { e.inert = true; });
    scrim.querySelector('.pl-story-x').focus();
    return {
      el: scrim, close,
      ready(file) {
        url = URL.createObjectURL(file);
        const im = scrim.querySelector('.pl-story'); im.src = url; im.alt = L(m, 'plan');
        const a = scrim.querySelector('.pl-story-dl'); a.href = url; a.download = file.name;
        const sh = scrim.querySelector('.pl-story-share');
        if (canShare(file)) { sh.hidden = false; sh.onclick = () => navigator.share({files: [file]}).catch(() => {}); }
        scrim.querySelector('.pl-story-act').hidden = false;
        scrim.querySelector('.pl-story-hint').textContent = L(m, 'hint');
      },
      fail() { scrim.querySelector('.pl-story-hint').textContent = L(m, 'fail'); }
    };
  }
  const canShare = f => !!(navigator.share && navigator.canShare && navigator.canShare({files: [f]}));

  /* open(): share straight away while the tap's activation lasts; when the browser refuses (the
     draw took too long, or no file sharing), the sheet offers its own share button and a save link. */
  async function open(m) {
    let sh = null;
    const t = setTimeout(() => { sh = sheet(m); }, 350);    // only show "drawing…" if it is slow
    let file;
    try {
      const {blob} = await render(m);
      file = new File([blob], `nz2027-day${m.dayNo || 1}.png`, {type: 'image/png'});
    } catch (e) { clearTimeout(t); (sh || sheet(m)).fail(); return; }
    clearTimeout(t);
    if (!sh && canShare(file)) {
      try { await navigator.share({files: [file]}); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }  // cancelled by the user: done
    }
    (sh || (sh = sheet(m))).ready(file);
  }

  window.plstory = {open, render};
})();
