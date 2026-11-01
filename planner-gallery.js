/* planner-gallery.js — gallery pictures (data/nz/gallery.json: {placeId:[{u,w,h,by,lic,page,alt,altJa}]}),
   loaded by planner.js's loadGallery() together with that file, on first need and never on the first
   screen. Pictures are linked, never stored: each one reserves its size, loads lazily and sends no
   referrer. Commons pictures come by width (960px- in u becomes 330px-/500px-, the widths Commons serves) and with CORS, so the
   service worker may keep them for offline (nzp-gallery); other hosts are shown as they are.
   A picture that fails to load is removed — or the figure it sits in, when that carries data-gw — so
   the next one shows; past the last, whatever the markup placed after them (the photo, the glyph). */
(function () {
'use strict';
if (typeof planner !== 'function' || planner.gallery) return;
planner.gallery = function (c) {
  const {DB, esc, ic, glyphOf, ja} = c;
  const isWM = u => /^https:\/\/upload\.wikimedia\.org\//.test(u);
  /* Commons only serves its standard thumb widths now: 400/480/640/800 return errors, so any width
     asked for snaps up to one it serves. */
  const WMW = [120, 250, 330, 500, 960, 1280];
  const gw = (u, w) => isWM(u) ? u.replace(/\/960px-/, '/' + (WMW.find(x => x >= w) || 1280) + 'px-') : u;
  const gal = p => p && DB.gallery && DB.gallery[p.id] || [];
  const gimg = (x, sizes, w) => `<img src="${esc(gw(x.u, w || 640))}"${isWM(x.u) ? ` srcset="${[120, 250, 330, 500].map(w => esc(gw(x.u, w)) + ' ' + w + 'w').join(', ')}, ${esc(x.u)} 960w" sizes="${sizes || '100vw'}" crossorigin="anonymous"` : ''} width="${x.w || 3}" height="${x.h || 2}" alt="${esc((ja() ? x.altJa : x.alt) || x.alt || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-gi>`;
  /* the small picture: the self-hosted thumb first (small, ours), then up to three gallery candidates
     (Commons by width; other hosts are full size, so they come last), then the glyph */
  /* big: the phone ① card's photo band, our photo by width and the gallery's at full width */
  const thumb = (p, ph, big) => { const g = gal(p);
    return `<span class="pl-glyph pl-thumb pl-g1${big ? ' pl-band' : ''}">${ph ? `<img src="${esc(big ? ph.src : ph.thumb || ph.src)}"${big && ph.src2x ? ` srcset="${esc(ph.src)} 480w, ${esc(ph.src2x)} 960w" sizes="100vw"` : ''} alt="" loading="lazy" decoding="async" width="${big ? 3 : 40}" height="${big ? 2 : 40}" data-gi>` : ''}${g.slice(0, 3).map(x => gimg(x, big ? '100vw' : '64px', big ? 500 : 250)).join('')}<span class="pl-gfb">${ic(glyphOf(p))}</span>${g.length > 1 ? `<i class="pl-gn">+${g.length - 1}</i>` : ''}</span>`; };
  if (!planner.gallery.on) { planner.gallery.on = 1;
    document.addEventListener('error', e => { const t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-gi')) (t.closest('[data-gw]') || t).remove(); }, true); }
  return {gal, gimg, gw, isWM, thumb};
};
})();
