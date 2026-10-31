/* planner-gallery.js — gallery pictures (data/nz/gallery.json: {placeId:[{u,w,h,by,lic,page,alt,altJa}]}),
   loaded by planner.js's loadGallery() together with that file, on first need and never on the first
   screen. Pictures are linked, never stored: each one reserves its size, loads lazily and sends no
   referrer. Commons pictures come by width (960px- in u becomes 320px-/640px-) and with CORS, so the
   service worker may keep them for offline (nzp-gallery); other hosts are shown as they are.
   A picture that fails to load is removed — or the figure it sits in, when that carries data-gw — so
   the next one shows; past the last, whatever the markup placed after them (the photo, the glyph). */
(function () {
'use strict';
if (typeof planner !== 'function' || planner.gallery) return;
planner.gallery = function (c) {
  const {DB, esc, ic, glyphOf, ja} = c;
  const isWM = u => /^https:\/\/upload\.wikimedia\.org\//.test(u);
  const gw = (u, w) => isWM(u) ? u.replace(/\/960px-/, '/' + w + 'px-') : u;
  const gal = p => p && DB.gallery && DB.gallery[p.id] || [];
  const gimg = (x, sizes, w) => `<img src="${esc(gw(x.u, w || 640))}"${isWM(x.u) ? ` srcset="${esc(gw(x.u, 320))} 320w, ${esc(gw(x.u, 640))} 640w, ${esc(x.u)} 960w" sizes="${sizes || '100vw'}" crossorigin="anonymous"` : ''} width="${x.w || 3}" height="${x.h || 2}" alt="${esc((ja() ? x.altJa : x.alt) || x.alt || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-gi>`;
  /* the small picture: up to three candidates, then the self-hosted thumb, then the glyph */
  const thumb = (p, ph) => { const g = gal(p);
    return `<span class="pl-glyph pl-thumb pl-g1">${g.slice(0, 3).map(x => gimg(x, '88px', 320)).join('')}${ph ? `<img src="${esc(ph.thumb || ph.src)}" alt="" loading="lazy" decoding="async" width="40" height="40" data-gi>` : ''}<span class="pl-gfb">${ic(glyphOf(p))}</span>${g.length > 1 ? `<i class="pl-gn">+${g.length - 1}</i>` : ''}</span>`; };
  if (!planner.gallery.on) { planner.gallery.on = 1;
    document.addEventListener('error', e => { const t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-gi')) (t.closest('[data-gw]') || t).remove(); }, true); }
  return {gal, gimg, gw, isWM, thumb};
};
})();
