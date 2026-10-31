/* igsaved.js: Instagram "saved" export -> planner candidates. Classic script, no import/export.
 *
 * Input is the official "Export your information" download (Meta account -> Your information and
 * permissions -> Export your information -> Saved, format JSON). Two layouts exist in the wild:
 *   2025+   top-level array; each entry {timestamp, fbid, label_values:[{label:'URL',href},
 *           {label:'Caption',value}, {title:'Owner',dict:[{dict:[URL,Name,Username]}]},
 *           {title:'Hashtags',dict:[{dict:[{label:'Name',value}]}]}]}; a collection entry has
 *           {label:'Name'} plus a {dict:[...]} section whose sub-dicts are saved items.
 *   <=2024  {saved_saved_media:[{title:<username>, string_map_data:{'Saved on':{href,timestamp}}}]}
 *           and {saved_saved_collections:[{title:'Collection', string_map_data:{Name:{value}}},
 *           {title:<username>?, string_map_data:{Name:{href,value}, 'Added Time':{timestamp}}}...]}.
 * Text in both is UTF-8 written as Latin-1 code points (mojibake); fixText() undoes it.
 * See research/instagram-saved.md for the evidence.
 *
 * Public:
 *   parseSavedPosts(json)        -> [{url, shortcode, kind, author, savedAt, collection:null, caption, hashtags}]
 *   parseSavedCollections(json)  -> same shape, one row per (collection, item)
 *   mergeSaved(posts, collRows)  -> one row per shortcode, collection = first, collections = all
 *   parseReelUrl(text)           -> {url, shortcode, kind} | null   (pasted share links)
 *   parseOgMeta(html)            -> {author, caption, date}        (a public reel page's og: tags)
 *   matchToPlaces(items, places) -> items + {status, placeId, candidates, via}
 *   igHandle(url), inFrame(lat, lon), unzipSaved(blob)
 */

var IG_URL_RE = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:([A-Za-z0-9_.]+)\/)?(p|reels?|tv)\/([A-Za-z0-9_-]+)/;

function fixText(s) {
  if (typeof s !== 'string' || !/[\u0080-\u00ff]/.test(s) || /[^\u0000-\u00ff]/.test(s)) return s || '';
  try {
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch (e) { return s; }
}

function parseReelUrl(text) {
  var m = IG_URL_RE.exec(String(text || ''));
  if (!m) return null;
  var kind = m[2] === 'p' ? 'p' : m[2] === 'tv' ? 'tv' : 'reel';
  return { url: 'https://www.instagram.com/' + kind + '/' + m[3] + '/', shortcode: m[3], kind: kind, pathUser: m[1] || null };
}

function igHandle(url) {
  var m = /instagram\.com\/([A-Za-z0-9_.]+)/i.exec(String(url || ''));
  return m && !/^(p|reels?|tv|explore|stories)$/i.test(m[1]) ? m[1].toLowerCase() : null;
}

function isoTime(ts) { return typeof ts === 'number' && ts > 0 ? new Date(ts * 1000).toISOString() : null; }

// label_values -> {URL, Caption, ..., Owner:[{Username,...}], Hashtags:[{Name}], _items:[[...label_values]]}
function lvFlat(list) {
  var o = { _items: [] };
  (list || []).forEach(function (it) {
    if (!it || typeof it !== 'object') return;
    if ('label' in it) o[it.label] = it.href || it.value || it.timestamp_value || null;
    else if (Array.isArray(it.dict)) {
      var subs = it.dict.map(function (d) { return d && d.dict || []; });
      o[it.title || '_'] = subs.map(lvFlat);
      subs.forEach(function (s) { o._items.push(s); });
    }
  });
  return o;
}

function rowFromLv(lv, ts, collection) {
  var u = parseReelUrl(lv.URL);
  if (!u) return null;
  var owner = (lv.Owner || [])[0] || {};
  return {
    url: u.url, shortcode: u.shortcode, kind: u.kind,
    author: (owner.Username || igHandle(owner.URL) || u.pathUser || '').toLowerCase() || null,
    savedAt: isoTime(ts), collection: collection || null,
    caption: fixText(lv.Caption || ''),
    hashtags: (lv.Hashtags || []).map(function (h) { return fixText(h.Name || '').replace(/^#/, '').toLowerCase(); }).filter(Boolean)
  };
}

function legacyRow(e, collection) {
  var smd = e && (e.string_map_data || {}), hit = null;
  Object.keys(smd).forEach(function (k) { if (!hit && smd[k] && parseReelUrl(smd[k].href)) hit = smd[k]; });
  if (!hit) return null;
  var u = parseReelUrl(hit.href);
  var t = smd['Added Time'] || smd['Saved on'] || hit;
  var who = e.title && e.title !== 'Collection' ? e.title : (hit.value || u.pathUser || '');
  return { url: u.url, shortcode: u.shortcode, kind: u.kind, author: who ? fixText(who).toLowerCase() : null,
           savedAt: isoTime(t.timestamp), collection: collection || null, caption: '', hashtags: [] };
}

function asJson(x) { return typeof x === 'string' ? JSON.parse(x) : x; }

function parseSavedPosts(json) {
  var d = asJson(json), out = [];
  if (Array.isArray(d)) {
    d.forEach(function (e) { var r = e && e.label_values && rowFromLv(lvFlat(e.label_values), e.timestamp, null); if (r) out.push(r); });
  } else if (d && Array.isArray(d.saved_saved_media)) {
    d.saved_saved_media.forEach(function (e) { var r = legacyRow(e, null); if (r) out.push(r); });
  }
  return out;
}

function parseSavedCollections(json) {
  var d = asJson(json), out = [];
  if (Array.isArray(d)) {
    d.forEach(function (e) {
      var lv = lvFlat(e && e.label_values), name = fixText(String(lv.Name || '')) || null;
      lv._items.forEach(function (sub) { var r = rowFromLv(lvFlat(sub), null, name); if (r) out.push(r); });
    });
  } else if (d && Array.isArray(d.saved_saved_collections)) {
    var cur = null;   // legacy: a header row names the collection, the rows after it are its items
    d.saved_saved_collections.forEach(function (e) {
      var smd = e && e.string_map_data || {};
      if (e.title === 'Collection' || (smd.Name && !smd.Name.href)) { cur = fixText((smd.Name || {}).value || '') || null; return; }
      var r = legacyRow(e, cur); if (r) out.push(r);
    });
  }
  return out;
}

function mergeSaved(posts, collRows) {
  var by = {}, order = [];
  function add(r) {
    var x = by[r.shortcode];
    if (!x) { x = by[r.shortcode] = Object.assign({}, r, { collections: [] }); order.push(r.shortcode); }
    else ['author', 'savedAt', 'caption'].forEach(function (k) { if (!x[k] && r[k]) x[k] = r[k]; });
    if (r.hashtags && r.hashtags.length && !(x.hashtags && x.hashtags.length)) x.hashtags = r.hashtags;
    if (r.collection && x.collections.indexOf(r.collection) < 0) x.collections.push(r.collection);
    x.collection = x.collections[0] || null;
  }
  (posts || []).forEach(add); (collRows || []).forEach(add);
  return order.map(function (k) { return by[k]; });
}

// og:description: '525 likes, 9 comments - newzealand on June 6, 2026: "caption". '
function parseOgMeta(html) {
  function meta(p) {
    var m = new RegExp('<meta[^>]+(?:property|name)="' + p + '"[^>]+content="([^"]*)"', 'i').exec(html || '');
    return m ? m[1].replace(/&quot;/g, '"').replace(/&#064;/g, '@').replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(+n); }).replace(/&amp;/g, '&') : null;
  }
  var desc = meta('og:description') || meta('description') || '', url = meta('og:url') || '';
  var m = /-\s+([A-Za-z0-9_.]+) on ([A-Z][a-z]+ \d{1,2}, \d{4}): "([\s\S]*)"\.?\s*$/.exec(desc);
  var u = parseReelUrl(url);
  return { author: (u && u.pathUser || m && m[1] || '').toLowerCase() || null, date: m ? m[2] : null, caption: m ? m[3] : null };
}

var IG_FRAME = { s: -40.45, n: -34.30, w: 172.40, e: 178.90 };
function inFrame(lat, lon) { return lat >= IG_FRAME.s && lat <= IG_FRAME.n && lon >= IG_FRAME.w && lon <= IG_FRAME.e; }

/* ---------- matching ---------- */

var IG_GENERIC = ' the and of at to in on a cafe coffee beach bay walk track loop trail falls lookout island park road rd st ' +
  'mt mount point hut campsite camp market new zealand auckland nz north south east west city reserve regional ' +
  'black sand car park coastal walkway specialty marine surf town holiday visitor centre center espresso bar brew ' +
  'summit hot stream river kitchen bakery roasters eatery best day trip ';
var IG_GENERIC_JA = /^(ビーチ|カフェ|ウォーク|トラック|ループ|ハット|キャンプ場|ルックアウト|オークランド|ニュージーランド|ワイヘキ島|タラナキ|ニュープリマス|ニューリン)$/;

function normText(s) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff#]+/g, ' ').trim();
}

// Every run of >=2 consecutive words in a name part, if it holds a non-generic word, as " a b ".
function nameKeys(p) {
  var keys = [];
  String(p.name || '').split(/[&()\/,|–—:-]|\bat\b/).forEach(function (part) {
    var w = normText(part).split(' ').filter(Boolean);
    // a one-word brand ("Giapo", "Dizengoff") counts only when the place's own hashtag starts with it
    if (w.length === 1 && w[0].length >= 5 && IG_GENERIC.indexOf(' ' + w[0] + ' ') < 0 &&
        String(p.igTag || '').toLowerCase().indexOf(w[0]) === 0) keys.push({ k: ' ' + w[0] + ' ', n: 2 });
    for (var i = 0; i < w.length; i++) for (var j = i + 2; j <= w.length; j++) {
      var run = w.slice(i, j);
      if (run.some(function (x) { return IG_GENERIC.indexOf(' ' + x + ' ') < 0 && x.length > 2; }))
        keys.push({ k: ' ' + run.join(' ') + ' ', n: run.length + (i === 0 && j === w.length ? 1 : 0) });   // a whole part outranks a fragment
    }
  });
  String(p.nameJa || '').split(/[・&()（）\s/、-]+/).forEach(function (seg) {
    if (seg.length >= 3 && !IG_GENERIC_JA.test(seg)) { var k = normText(seg); if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(k) && k.length >= 3) keys.push({ k: k, n: 2, ja: true }); }
  });
  return keys;
}

function captionScore(p, capN, tags) {
  var best = 0;
  if (p.igTag && tags.indexOf(String(p.igTag).toLowerCase()) >= 0) best = 1;
  (p._keys || (p._keys = nameKeys(p))).forEach(function (k) {
    var hit = k.ja ? capN.indexOf(k.k) >= 0 : (' ' + capN + ' ').indexOf(k.k) >= 0;
    if (hit && k.n > best) best = k.n;
  });
  return best;
}

function matchToPlaces(items, places) {
  var byHandle = {};
  (places || []).forEach(function (p) { var h = igHandle(p.ig); if (h) (byHandle[h] = byHandle[h] || []).push(p); });
  return (items || []).map(function (it) {
    var capN = normText(it.caption), tags = (it.hashtags || []).slice();
    (String(it.caption || '').match(/#[^\s#]+/g) || []).forEach(function (t) { tags.push(t.slice(1).toLowerCase()); });
    function rank(pool) {
      return pool.map(function (p) { return { p: p, s: captionScore(p, capN, tags) }; })
        .filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    }
    function top(r) { return r.length && (r.length === 1 || r[0].s > r[1].s) ? r[0].p.id : null; }
    var own = it.author && byHandle[it.author] || [], res;
    if (own.length === 1) res = { status: 'matched', placeId: own[0].id, candidates: [own[0].id], via: 'handle' };
    else if (own.length > 1) {
      var r = rank(own), t = top(r);
      res = t ? { status: 'matched', placeId: t, candidates: r.map(function (x) { return x.p.id; }), via: 'handle+caption' }
              : { status: 'ambiguous', placeId: null, candidates: (r.length ? r.map(function (x) { return x.p.id; }) : own.map(function (p) { return p.id; })), via: 'handle' };
    } else {
      var r2 = rank(places || []);
      res = r2.length ? { status: 'suggested', placeId: top(r2), candidates: r2.slice(0, 5).map(function (x) { return x.p.id; }), via: r2[0].s > 1 ? 'caption' : 'hashtag' }
                      : { status: 'unmatched', placeId: null, candidates: [], via: null };
    }
    return Object.assign({}, it, res);
  });
}

/* ---------- reading the export on the phone ---------- */

// Reads only the tail, the central directory and the wanted entries, so a large export ZIP is
// never loaded whole. Needs DecompressionStream('deflate-raw') (iOS Safari 16.4+). No ZIP64.
async function unzipSaved(blob, want) {
  want = want || /(^|\/)saved_(posts|collections)\.json$/;
  async function bytes(a, b) { return new Uint8Array(await blob.slice(a, b).arrayBuffer()); }
  var tail = await bytes(Math.max(0, blob.size - 65558), blob.size), dv = new DataView(tail.buffer), e = tail.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  var n = dv.getUint16(e + 10, true), cdSize = dv.getUint32(e + 12, true), cdOff = dv.getUint32(e + 16, true);
  if (cdOff === 0xffffffff) throw new Error('zip64');
  var cd = await bytes(cdOff, cdOff + cdSize), v = new DataView(cd.buffer), p = 0, out = {}, td = new TextDecoder();
  while (n--) {
    var meth = v.getUint16(p + 10, true), cs = v.getUint32(p + 20, true), fl = v.getUint16(p + 28, true),
        xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true),
        name = td.decode(cd.subarray(p + 46, p + 46 + fl));
    p += 46 + fl + xl + cl;
    if (!want.test(name)) continue;
    var lh = new DataView((await bytes(lo, lo + 30)).buffer), s = lo + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    var raw = blob.slice(s, s + cs);
    out[name] = meth === 0 ? await raw.text()
      : await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  return out;
}
