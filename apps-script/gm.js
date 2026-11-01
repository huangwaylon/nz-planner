// Google Maps list import for the planner (WORKFLOW.md, research/gmaps-lists.md). Not an open proxy:
// the caller's URL is fetched only when it is a maps.app.goo.gl short link, without following
// redirects; everything else fetched is a www.google.com URL built here from a validated list id
// or fid. Responses are capped. The parser is gmlist.js, a verbatim copy of tools/gmlist.js.

const GM_MAX_BYTES = 2000000;   // per page: a 500-place getlist is ~250 KB; refuse anything far beyond
const GM_MAX_ITEMS = 4000;      // whole list, across pages
const GM_MAX_PAGES = 10;        // 500 a page; a 3,345-place list is 7
const GM_MAX_FIDS = 100;        // per gmplace call; ~16 KB each
const GM_HOST = 'https://www.google.com/maps/';

function gmFetch_(url, follow) {
  const r = UrlFetchApp.fetch(url, {followRedirects: !!follow, muteHttpExceptions: true});
  const bytes = r.getContent();
  if (bytes.length > GM_MAX_BYTES) throw new Error('too-large');
  const h = r.getHeaders();
  return {code: r.getResponseCode(), loc: h['Location'] || h['location'] || '',
          text: Utilities.newBlob(bytes).getDataAsString('UTF-8')};
}

// maps.app.goo.gl/<code> → its Location (one hop; EU consent pages carry it in ?continue=).
function gmResolve_(url) {
  if (/^https:\/\/www\.google\.com\/maps([/?@]|$)/.test(url)) return url;   // parsed, never fetched
  if (!/^https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9_-]{6,40}(\?[\w=&%.-]*)?$/.test(url)) throw new Error('bad-url');
  let loc = gmFetch_(url, false).loc;
  const c = /^https:\/\/consent\.google\.[a-z.]+\/.*[?&]continue=([^&]+)/.exec(loc);
  if (c) loc = decodeURIComponent(c[1]);
  if (!/^https:\/\/(www|maps)\.google\.com([/?]|$)/.test(loc)) throw new Error('not-found');
  return loc;
}

function gmList_(url) {
  try {
    const loc = gmResolve_(String(url || '').trim());
    const id = gmlist.listIdFromUrl(loc);
    if (!id) {                                    // a single shared place, not a list
      const p = gmlist.parseMapsUrl(loc);
      if (!p.fid && p.lat == null) return {ok: false, error: 'not-a-list'};
      return {ok: true, place: p};
    }
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(id)) return {ok: false, error: 'bad-url'};
    // Page n+1 is the same pb with the previous response's d[1] as !5B<token> (gmlist.nextPagePb);
    // the last page's d[1] is empty. Pages are concatenated, deduped by fid as a guard.
    const GET = GM_HOST + 'preview/entitylist/getlist?authuser=0&hl=en&gl=nz&pb=';
    let pb = gmlist.listPb(id), meta = null, items = [], pages = 0;
    const seen = {};
    while (pb && pages < GM_MAX_PAGES && items.length < GM_MAX_ITEMS) {
      const r = gmFetch_(GET + pb, true);
      if (r.code !== 200) { if (!meta) return {ok: false, error: 'http-' + r.code}; break; }
      const m = gmlist.parseListMeta(r.text);
      if (!m.ok) { if (!meta) return {ok: false, error: m.error}; break; }   // private, deleted or reshaped
      if (!meta) meta = m;
      pages++;
      gmlist.parseListPayload(r.text).forEach(it => {
        const k = it.fid || it.name + '@' + it.lat + ',' + it.lon;
        if (!seen[k]) { seen[k] = 1; items.push(it); }
      });
      pb = gmlist.nextPagePb(id, m.token);
    }
    items = items.slice(0, GM_MAX_ITEMS);
    const list = {id: meta.id, title: meta.title, description: meta.description, count: meta.count,
                  returned: items.length, pages: pages, truncated: !!pb};   // only when a cap stopped the loop
    return {ok: true, list: list, items: items};
  } catch (e) {
    return {ok: false, error: String(e.message || e)};
  }
}

// Takeout CSV rows carry only a fid: resolve name, lat/lon, address and country, in parallel.
function gmPlace_(fids) {
  try {
    if (!Array.isArray(fids)) return {ok: false, error: 'bad-fids'};
    const ok = fids.filter(f => /^0x[0-9a-f]{1,16}:0x[0-9a-f]{1,16}$/.test(f)).slice(0, GM_MAX_FIDS);
    const rs = UrlFetchApp.fetchAll(ok.map(f => ({muteHttpExceptions: true,
      url: GM_HOST + 'preview/place?authuser=0&hl=en&gl=nz&pb=!1m1!1s' + encodeURIComponent(f)})));
    const places = rs.map((r, i) => {
      const b = r.getContent();
      const p = r.getResponseCode() === 200 && b.length <= GM_MAX_BYTES
        ? gmlist.parsePlacePayload(Utilities.newBlob(b).getDataAsString('UTF-8')) : null;
      return p ? Object.assign(p, {fid: ok[i]}) : {fid: ok[i], error: 'unresolved'};
    });
    return {ok: true, places: places, skipped: fids.length - ok.length};
  } catch (e) {
    return {ok: false, error: String(e.message || e)};
  }
}
