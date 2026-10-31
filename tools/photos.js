// Runs inside Chrome on http://127.0.0.1:8791/tools/fetch.html (Commons answers Chrome, not curl,
// from this machine). Two passes, both POSTing to tools/serve.py:
//   await photoCands()          -> research/fetched/photo-cands.json   (up to 10 candidates per place)
//   await photoGet(picks)       -> research/fetched/img/<id>.jpg (960px thumb) + photo-meta.json
// photoSheet(ids) draws a contact sheet in the page for picking by eye. picks = {id: "File:…"}.
// Licences: CC BY, CC BY-SA, CC0 and public domain only. NC, ND and fair use never pass ok().
(function () {
  // Search terms per place. A second element narrows a geosearch radius (m) around the pin;
  // geosearch is what keeps a pick true to the place rather than a namesake.
  const Q = {
    'harbour-bridge-climb-bungy': ['Auckland Harbour Bridge', 0, 'Auckland Harbour Bridge sunset'],
    'rangitoto-kayak': ['Rangitoto Island sunset', 0, 'Okahu Bay', 'Rangitoto from Mission Bay'],
    'sky-tower-skywalk': ['Sky Tower Auckland', 400],
    'takapuna-fossil-forest': ['Takapuna fossil forest', 0, 'Takapuna Beach Rangitoto', 'Milford Beach Auckland'],
    'maungauika': ['North Head Devonport', 600],
    'britomart': ['Britomart Auckland', 0, 'Britomart Precinct', 'Takutai Square'],
    'commercial-bay': ['Commercial Bay tower Auckland', 0, 'PwC Tower Auckland', 'Queen Street Auckland'],
    'karangahape-road': ['Karangahape Road', 500],
    'mt-eden-village': ['Mount Eden Road shops', 0, 'Mount Eden Village Auckland', 'Mt Eden village'],
    'ponsonby-central': ['Ponsonby Road', 0, 'Ponsonby Central'],
    'silo-park-wynyard': ['Wynyard Quarter Auckland', 500],
    'maungakiekie': ['One Tree Hill Auckland', 700],
    'maungarei': ['Mount Wellington Maungarei', 700],
    'maungawhau-mt-eden': ['Mount Eden crater Auckland', 500],
    'cathedral-cove-kayak': ['Cathedral Cove Hahei', 1500],
    'driving-creek': ['Driving Creek Railway', 800],
    'hot-water-beach': ['Hot Water Beach Coromandel', 1000],
    'new-chums': ['New Chums Beach', 1200],
    'pinnacles-hut': ['Pinnacles Hut Kauaeranga', 1500],
    'cathedral-cove': ['Cathedral Cove', 800],
    'karangahake-windows-walk': ['Karangahake Gorge', 1500],
    'pinnacles': ['Pinnacles Coromandel Kauaeranga', 1500],
    'road-309': ['Waiau Falls Coromandel', 3000],
    'shakespeare-cliff': ['Cooks Beach', 0, 'Purangi Coromandel', 'Shakespeare Point Coromandel', 'Lonely Bay'],
    'tapapakanga': ['Tapapakanga Regional Park', 1500],
    'duder': ['Duder Regional Park', 1500],
    'kawakawa-bay': ['Kawakawa Bay Auckland', 2000],
    'motutapu-home-bay': ['Motutapu Island', 2500],
    'rangitoto': ['Rangitoto Island', 3000],
    'rangitoto-summit': ['Rangitoto summit crater', 1500],
    'tiritiri-matangi': ['Tiritiri Matangi', 2000],
    'puhoi-kayak': ['Puhoi River', 3000],
    'pakiri': ['Pakiri Beach', 3000],
    'tawharanui': ['Tawharanui Regional Park', 2500],
    'te-arai': ['Te Arai Point', 0, 'Te Arai Beach dunes', 'Mangawhai Te Arai'],
    'wenderholm': ['Wenderholm Regional Park', 1500],
    'tawharanui-camp': ['Tawharanui Anchor Bay', 2500],
    'shakespear': ['Shakespear Regional Park', 2000],
    'tamahunga': ['Tamahunga', 2500],
    'goat-island': ['Goat Island Marine Reserve Leigh', 1500],
    'devonport-mt-victoria': ['Mount Victoria Devonport', 600],
    'hunua-falls': ['Hunua Falls', 800],
    'manukau-heads': ['Manukau Heads lighthouse', 1500],
    'back-beach': ['Sugar Loaf Islands New Plymouth', 2000, 'Back Beach New Plymouth', 'Paritutu Back Beach'],
    'three-sisters-elephant-rock': ['Three Sisters Taranaki', 0, 'Elephant Rock Taranaki', 'Three Sisters rock formation New Zealand', 'Tongaporutu Three Sisters'],
    'belt-road-holiday-park': ['Ngamotu Beach', 0, 'New Plymouth Port Taranaki', 'Belt Road New Plymouth'],
    'mangorei-roadend-camp': ['Mount Taranaki from Mangorei', 0, 'Mangorei Road Taranaki', 'Mount Taranaki north face', 'Taranaki Mangorei Track'],
    'oakura-beach-holiday-park': ['Oakura Beach', 0, 'Ōākura Taranaki beach'],
    'pouakai-hut': ['Pouakai Hut', 1500],
    'dawson-falls': ['Dawson Falls Taranaki', 1500],
    'np-coastal-walkway': ['New Plymouth Coastal Walkway', 2500],
    'pouakai-crossing': ['Pouakai Crossing Taranaki', 4000],
    'pouakai-tarns': ['Pouakai tarn Taranaki', 2000],
    'whitecliffs-walkway': ['Whitecliffs Walkway Taranaki', 3000],
    'wilkies-pools': ['Wilkies Pools', 1500],
    'forgotten-world-highway': ['Whangamomona', 0],
    'len-lye-centre': ['Len Lye Centre', 300],
    'len-lye-centre-facade': ['Govett-Brewster Art Gallery Len Lye Centre facade', 300],
    'pukekura-park': ['Pukekura Park', 800],
    'te-rewa-rewa-bridge': ['Te Rewa Rewa Bridge', 800],
    'wind-wand-coastal-walkway': ['Wind Wand New Plymouth', 600],
    'ngamotu-beach': ['Ngamotu Beach', 0, 'Ngāmotu Beach New Plymouth', 'Sugar Loaf Islands from Ngamotu'],
    'mokau': ['Mokau Taranaki', 2000],
    'oakura': ['Oakura Taranaki', 1500],
    'lake-mangamahoe': ['Lake Mangamahoe', 1500],
    'paritutu-rock': ['Paritutu', 800],
    'stratford-plateau': ['Stratford Plateau Mount Taranaki', 2000],
    'redwoods-treewalk': ['Redwoods Rotorua Whakarewarewa Forest', 1500],
    'skyline-rotorua-luge': ['Skyline Rotorua', 1000],
    'craters-of-the-moon': ['Craters of the Moon Taupo', 1200],
    'tongariro-alpine-crossing': ['Tongariro Alpine Crossing Emerald Lakes', 0],
    'orakei-korako': ['Orakei Korako', 1200],
    'wai-o-tapu': ['Wai-O-Tapu Champagne Pool', 2500],
    'polynesian-spa': ['Polynesian Spa', 0, 'Lake Rotorua Government Gardens hot pools', 'Rachel Spring Rotorua'],
    'spa-park-hot-stream': ['Otumuheke', 0, 'Spa Park Taupo', 'Spa Thermal Park Taupo hot stream'],
    'huka-falls': ['Huka Falls', 800],
    'waiheke-te-ara-hura': ['Oneroa Waiheke', 2000],
    'onetangi': ['Onetangi Beach Waiheke', 1500],
    'ruakuri-cave': ['Ruakuri Cave', 1000],
    'spellbound-glowworms': ['Mangawhitikau', 0, 'Spellbound Waitomo', 'Arachnocampa luminosa glowworms cave'],
    'waitomo-glowworm-caves': ['Waitomo Caves', 1000],
    'kawhia-hot-water-beach': ['Kawhia Ocean Beach', 3000],
    'ngarunui-beach': ['Ngarunui Beach Raglan', 1500],
    'blue-spring-te-waihou': ['Blue Spring Putaruru', 0, 'Te Waihou Walkway', 'Waihou River Blue Spring'],
    'bridal-veil-falls-raglan': ['Bridal Veil Falls Waireinga', 800],
    'mangapohue-natural-bridge': ['Mangapohue', 0, 'Mangapohue Natural Bridge Scenic Reserve', 'natural bridge Waitomo Marokopa Road'],
    'marokopa-falls': ['Marokopa Falls', 800],
    'mt-karioi': ['Karioi', 3000, 'Mount Karioi'],
    'piripiri-cave': ['Piripiri Caves Scenic Reserve', 0, 'Piripiri Cave Te Anga'],
    'ruakuri-bush-walk': ['Ruakuri Scenic Reserve', 0, 'Ruakuri natural tunnel', 'Ruakuri Bush Walk Waitomo'],
    'wairere-falls': ['Wairere Falls Kaimai', 0, 'Wairere Falls Okauia', 'Wairere Falls Matamata'],
    'hamilton-gardens': ['Hamilton Gardens', 800],
    'hobbiton': ['Hobbiton', 1000],
    'tirau-corrugated-dog': ['Tirau', 800, 'Tirau dog', 'Tirau sheep'],
    'blue-lake-tikitapu': ['Lake Tikitapu', 0, 'Blue Lake Rotorua', 'Tikitapu'],
    'kerosene-creek': ['Kerosene Creek', 2000],
    'raglan': ['Raglan New Zealand', 1500],
    'raglan-town': ['Raglan wharf', 1500],
    'manu-bay': ['Manu Bay Raglan', 1000],
    'bethells-beach': ['Bethells Beach Te Henga', 2000],
    'karekare': ['Karekare', 1500],
    'piha': ['Lion Rock Piha', 1200],
    'whatipu': ['Whatipu', 2000],
    'piha-domain-camp': ['Piha beach', 1200],
    'tunnel-point-camp': ['Whatipu', 3000, 'Pararaha'],
    'cascade-kauri': ['Cascade Kauri Waitakere', 1500],
    'fairy-falls': ['Fairy Falls Waitakere', 1000],
    'kitekite-falls': ['Kitekite Falls', 800],
    'kuataika': ['Anawhata', 2000],
    'mercer-bay-loop': ['Mercer Bay', 1500, 'Karekare cliffs', 'Te Ahua Point'],
    'omanawanui': ['Omanawanui Whatipu', 1500],
    'te-henga-walkway': ['Te Henga Walkway', 0, 'Bethells Beach Ihumoana', 'Erangi Point', 'Te Henga cliffs'],
    'zion-hill-loop': ['Pararaha', 3000, 'Karekare Zion Hill'],
    'lake-wainamu': ['Lake Wainamu', 1200],
    'arataki': ['Arataki Visitor Centre', 600],
    'muriwai-gannets': ['Muriwai gannet colony', 1000]
  };
  const API = 'https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=960&';
  const strip = s => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const ok = m => {
    const l = (m.LicenseShortName && m.LicenseShortName.value || '').toLowerCase();
    if (/nc|nd|fair/.test(l.replace(/cc0/, ''))) return false;
    return /^cc by(-sa)? \d|^cc0|public domain|^pd/.test(l);
  };
  const year = m => { const y = strip(m.DateTimeOriginal && m.DateTimeOriginal.value || m.DateTime && m.DateTime.value).match(/(19|20)\d\d/); return y ? +y[0] : 0; };
  const rec = (p, src, place) => {
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii) return null;
    const m = ii.extmetadata || {};
    if (!/jpeg/.test(ii.mime || '') || !ok(m)) return null;
    if (ii.width < 1000 || ii.width < ii.height * 1.05) return null;      // landscape-ish, big enough
    if (/\b(map|logo|diagram|sign|plan|chart|panorama|stitch)\b/i.test(p.title)) return null;
    const lat = m.GPSLatitude && +m.GPSLatitude.value, lon = m.GPSLongitude && +m.GPSLongitude.value;
    const dist = lat ? Math.round(Math.hypot((lat - place.lat) * 111, (lon - place.lon) * 111 * Math.cos(place.lat * Math.PI / 180)) * 10) / 10 : null;
    return {
      title: p.title, src, w: ii.width, h: ii.height, year: year(m), dist,
      lic: strip(m.LicenseShortName && m.LicenseShortName.value), licUrl: strip(m.LicenseUrl && m.LicenseUrl.value),
      author: strip(m.Artist && m.Artist.value).slice(0, 80), desc: strip(m.ImageDescription && m.ImageDescription.value).slice(0, 140),
      q: /Quality|Featured|Valued/i.test(strip(m.Assessments && m.Assessments.value)) || /Quality images|Featured pictures/i.test(strip(m.Categories && m.Categories.value)),
      page: ii.descriptionurl, thumb: ii.thumburl
    };
  };
  const get = u => fetch(API + u).then(r => r.json()).catch(() => ({}));
  async function cands(place) {
    const [term, rad, ...more] = Q[place.id];
    const out = new Map();
    const add = (j, src) => Object.values((j.query && j.query.pages) || {}).forEach(p => { const r = rec(p, src, place); if (r && !out.has(r.title)) out.set(r.title, r); });
    add(await get('generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=' + encodeURIComponent(term + ' filetype:bitmap')), 's');
    for (const t of more) add(await get('generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=' + encodeURIComponent(t + ' filetype:bitmap')), 's');
    if (rad) add(await get(`generator=geosearch&ggsnamespace=6&ggslimit=40&ggsradius=${Math.min(rad, 10000)}&ggscoord=${place.lat}|${place.lon}`), 'g');
    const words = term.toLowerCase().split(/[^a-z0-9ōāīūē-]+/).filter(w => w.length > 3);
    const rel = r => { const t = (r.title + ' ' + r.desc).toLowerCase(); return words.length ? words.filter(w => t.includes(w)).length / words.length : 0; };
    for (const [k, r] of out) if (r.src === 'g' && !rel(r) && !r.q) out.delete(k);   // nearby but about something else
    const score = r => 3 * rel(r) + (r.q ? 3 : 0) + (r.year >= 2015 ? 2 : r.year >= 2010 ? 1 : 0) + (r.src === 'g' || (r.dist != null && r.dist < 3) ? 1 : 0) + Math.min(r.w / 3000, 1);
    return [...out.values()].sort((a, b) => score(b) - score(a)).slice(0, 10);
  }
  window.photoCands = async function (only) {
    const ps = await fetch('/data/nz/places.json', {cache: 'no-store'}).then(r => r.json());
    const res = only && window.CANDS ? window.CANDS : {};
    for (const p of ps) {
      if (!Q[p.id] || (only && !only.includes(p.id))) continue;
      window.status = 'cands ' + p.id;
      res[p.id] = await cands(p);
    }
    window.CANDS = res;
    await fetch('/save/photo-cands.json', {method: 'POST', body: JSON.stringify(res)});
    window.status = 'done ' + Object.keys(res).length;
    return Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.length]));
  };
  // Contact sheet: one row per place, its candidates numbered from 0.
  window.photoSheet = function (ids) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;font:11px system-ui;background:#111;color:#eee';
    for (const id of ids) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:3px;align-items:flex-start;margin:0 0 3px';
      row.innerHTML = `<b style="width:90px;flex:none;word-break:break-all">${id}</b>` + (window.CANDS[id] || []).slice(0, 8).map((c, i) =>
        `<figure style="margin:0;width:150px;position:relative"><img src="${c.thumb.replace('/960px-', '/330px-')}" style="width:150px;height:100px;object-fit:cover;display:block"><figcaption style="position:absolute;top:0;left:0;background:#000a;padding:1px 3px">${i} ${c.year}${c.q ? '★' : ''}${c.dist != null ? ' ' + c.dist + 'km' : ''}</figcaption></figure>`).join('');
      document.body.appendChild(row);
    }
    return Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  };
  // Downloads the 960px thumbnail of each pick and records its credit.
  window.photoGet = async function (picks) {
    const meta = await fetch('/research/fetched/photos-meta.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    for (const [id, title] of Object.entries(picks)) {
      window.status = 'get ' + id;
      const j = await get('titles=' + encodeURIComponent(title));
      const p = Object.values(j.query.pages)[0], ii = p.imageinfo[0], m = ii.extmetadata;
      if (!ok(m)) { meta[id] = {error: 'licence ' + strip(m.LicenseShortName && m.LicenseShortName.value)}; continue; }
      const blob = await fetch(ii.thumburl).then(r => r.blob());
      await fetch('/save-img/' + id + '.jpg', {method: 'POST', body: blob});
      meta[id] = {
        title: p.title, author: strip(m.Artist && m.Artist.value), licence: strip(m.LicenseShortName.value),
        licenceUrl: strip(m.LicenseUrl && m.LicenseUrl.value) || (/public domain|cc0/i.test(m.LicenseShortName.value) ? 'https://creativecommons.org/publicdomain/zero/1.0/' : ''),
        page: ii.descriptionurl, w: ii.width, h: ii.height, bytes: blob.size
      };
      await new Promise(r => setTimeout(r, 300));
    }
    await fetch('/save/photos-meta.json', {method: 'POST', body: JSON.stringify(meta, null, 1)});
    window.status = 'got ' + Object.keys(picks).length;
    return Object.keys(meta).length;
  };
})();
