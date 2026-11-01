/* Three caches. SHELL is the app, renamed on every deploy (bump it after any change to a shipped
   file). DATA holds data/nz/* under a name that changes with SHELL; it is fetched network-first
   with a 1.5 s fallback to the cache, so a data-only change reaches the next launch and offline
   still opens. MEDIA holds the photos under a fixed name: a changed photo gets a new filename.
   GALLERY keeps the gallery pictures someone has looked at, for offline: Commons only, because only
   a CORS response can be checked (an opaque one could be an error page, and costs ~7 MB of quota each),
   least recently used out first past GMAX. */
const SHELL = 'nzp-shell-v19';
/* The data cache is renamed with every SHELL bump, so a deploy never serves last build's plans.json. */
const DATA = 'nzp-data-v19';
const MEDIA = 'nzp-media';     // photos: a changed photo gets a new filename, so this name never changes
const GALLERY = 'nzp-gallery', GMAX = 300;
const APP = ['./', './index.html', './poc.css', './planner.css', './host.js', './planner.js', './import.js', './planner-import.js', './planner-import.css', './planner-more.js', './planner-more.css', './planner-collect.js', './planner-collect.css', './planner-cal.js', './planner-cal.css', './planner-gallery.js', './planner-gallery.css', './manifest.webmanifest', './icon-180.png'];
const FILES = ['./data/nz/places.json', './data/nz/plans.json', './data/nz/travel.json', './data/nz/land-lo.svg.html', './data/nz/land.svg.html', './data/nz/places-more.json', './data/nz/flags.json', './data/nz/groups.json'];
/* optional files: cached when present, a 404 never fails the install */
const OPTIONAL = ['./data/nz/routes.json', './data/nz/photos.json', './data/nz/gallery.json', './data/nz/gm-regions.json', './story.js'];

self.addEventListener('install', e => {
  // No skipWaiting: the page shows a refresh banner and this worker takes over when tapped.
  e.waitUntil(Promise.all([
    /* cache:'reload' skips the HTTP cache: Pages sends max-age=600, which could otherwise fill a
       new SHELL with the previous build. */
    caches.open(SHELL).then(c => c.addAll(APP.map(u => new Request(u, {cache: 'reload'})))),
    caches.open(DATA).then(c => Promise.all(FILES.map(u => c.add(new Request(u, {cache: 'reload'})))
      .concat(OPTIONAL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))))
  ]));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DATA && k !== MEDIA && k !== GALLERY).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const ok = r => r && r.ok && r.type === 'basic';   // our own complete 200s only
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'upload.wikimedia.org') { e.respondWith(gallery(req)); return; }
  if (url.origin !== location.origin) return;     // Google Maps, Instagram, other gallery hosts: straight to the network
  if (url.pathname.includes('/images/')) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (ok(r)) c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.pathname.includes('/data/')) {
    /* Network first with a short wait, then the cache: a data-only deploy reaches the very next
       launch (a revalidation is a 304 when nothing changed), and offline still works. */
    e.respondWith(caches.open(DATA).then(c => {
      const net = fetch(req, {cache: 'no-cache'}).then(r => { if (ok(r)) c.put(req, r.clone()); return r; });
      const late = new Promise(res => setTimeout(res, 1500)).then(() => c.match(req));
      return Promise.race([net.catch(() => c.match(req)), late.then(hit => hit || net)])
        .then(r => r || net).catch(() => c.match(req).then(hit => hit || Response.error()));
    }));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: req.mode === 'navigate'}).then(r => r || fetch(req).then(resp => {
    if (ok(resp)) { const copy = resp.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
    return resp;
  }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
/* cache-first; a hit moves to the back of the line, a new picture is kept only if it is a complete
   CORS 200, and the oldest go once the cache passes GMAX */
function gallery(req) {
  return caches.open(GALLERY).then(c => c.match(req.url).then(hit => {
    if (hit) { const cp = hit.clone(); c.delete(req.url).then(() => c.put(req.url, cp)); return hit; }
    return fetch(req).then(r => {
      if (r.ok && r.type === 'cors') c.put(req.url, r.clone()).then(() => c.keys()).then(ks => Promise.all(ks.slice(0, Math.max(0, ks.length - GMAX)).map(k => c.delete(k))));
      return r;
    });
  }));
}
