// node tools/igsaved.test.js — runs igsaved.js (a classic script) on the sanitized fixtures.
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'igsaved.js'), 'utf8'), { filename: 'igsaved.js' });

const postsJson = fs.readFileSync(path.join(ROOT, 'tools/fixtures/ig_saved_posts.json'), 'utf8');
const collJson = fs.readFileSync(path.join(ROOT, 'tools/fixtures/ig_saved_collections.json'), 'utf8');
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nz/places.json'), 'utf8'));
// Instagram handles and tags ship in places-more.json; merge them back the way the app does.
const more = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nz/places-more.json'), 'utf8'));
places.forEach(p => { const m = more[p.id] || {}; ['kw', 'ig', 'igTag'].forEach(k => { if (m[k] && !p[k]) p[k] = m[k]; }); });
let n = 0;
function t(name, fn) { return Promise.resolve().then(fn).then(() => { n++; console.log('ok  ' + name); }, e => { console.error('FAIL ' + name + '\n' + e.stack); process.exitCode = 1; }); }

(async () => {
  await t('parseSavedPosts: 2025+ label_values layout', () => {
    const p = parseSavedPosts(postsJson);
    assert.strictEqual(p.length, 7);
    assert.deepStrictEqual(Object.keys(p[0]).slice(0, 6), ['url', 'shortcode', 'kind', 'author', 'savedAt', 'collection']);
    assert.strictEqual(p[0].url, 'https://www.instagram.com/reel/SANITZD0001/');
    assert.strictEqual(p[0].author, 'dizengoffponsonby');
    assert.strictEqual(p[0].savedAt, '2026-09-21T14:13:21.000Z');
    assert.strictEqual(p[5].kind, 'p');
    assert.deepStrictEqual(p[3].hashtags, ['auckland', 'karekare']);
  });

  await t('fixText undoes the export mojibake (Japanese caption)', () => {
    const p = parseSavedPosts(postsJson);
    assert.ok(/^オークランドのカフェ巡り/.test(p[4].caption), p[4].caption);
    assert.strictEqual(fixText('plain ascii'), 'plain ascii');
    assert.strictEqual(fixText('already ✨ fine'), 'already ✨ fine');
  });

  await t('parseSavedCollections: names and members', () => {
    const c = parseSavedCollections(collJson);
    assert.strictEqual(c.length, 6);
    assert.deepStrictEqual([...new Set(c.map(r => r.collection))], ['NZ カフェ', 'NZ outdoors']);
    assert.strictEqual(c[0].shortcode, 'SANITZD0001');
    assert.strictEqual(c[0].author, 'dizengoffponsonby');
  });

  await t('legacy (<=2024) string_map_data layout', () => {
    const legacyPosts = { saved_saved_media: [
      { title: 'dizengoffponsonby', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/LEGACY0001/', timestamp: 1700000000 } } }] };
    const legacyColl = { saved_saved_collections: [
      { title: 'Collection', string_map_data: { Name: { value: 'Cafes' }, 'Creation Time': { timestamp: 1690000000 } } },
      { string_map_data: { Name: { href: 'https://www.instagram.com/p/LEGACY0002/', value: 'example_food_blog' }, 'Added Time': { timestamp: 1700000100 } } }] };
    const p = parseSavedPosts(legacyPosts), c = parseSavedCollections(legacyColl);
    assert.strictEqual(p[0].author, 'dizengoffponsonby');
    assert.strictEqual(p[0].savedAt, '2023-11-14T22:13:20.000Z');
    assert.deepStrictEqual([c[0].shortcode, c[0].author, c[0].collection], ['LEGACY0002', 'example_food_blog', 'Cafes']);
  });

  await t('mergeSaved: one row per shortcode, all collections kept', () => {
    const m = mergeSaved(parseSavedPosts(postsJson), parseSavedCollections(collJson));
    assert.strictEqual(m.length, 7);
    assert.strictEqual(m[0].collection, 'NZ カフェ');
    assert.strictEqual(m.find(r => r.shortcode === 'SANITZD0003').collection, null);
  });

  await t('parseReelUrl: iPhone share links', () => {
    assert.deepStrictEqual(parseReelUrl('https://www.instagram.com/reel/DZQr1zFTy_8/?igsh=MTB4ZmZ4'),
      { url: 'https://www.instagram.com/reel/DZQr1zFTy_8/', shortcode: 'DZQr1zFTy_8', kind: 'reel', pathUser: null });
    assert.strictEqual(parseReelUrl('see instagram.com/newzealand/reel/C42Q8qPyXzd/').pathUser, 'newzealand'); // pasted without a scheme
    assert.strictEqual(parseReelUrl('https://instagram.com/newzealand/reel/C42Q8qPyXzd/').pathUser, 'newzealand');
    assert.strictEqual(parseReelUrl('https://www.instagram.com/reels/C42Q8qPyXzd/').kind, 'reel');
    assert.strictEqual(parseReelUrl('https://example.com/'), null);
  });

  await t('parseOgMeta: public reel og: tags (shape seen 2026-10-31)', () => {
    const html = '<meta property="og:url" content="https://www.instagram.com/newzealand/reel/C42Q8qPyXzd/" />' +
      '<meta property="og:description" content="2,000 likes, 18 comments - newzealand on March 23, 2024: &quot;SAVE ✨Walk to the Mercer Bay Loop lookout&quot;. " />';
    assert.deepStrictEqual(parseOgMeta(html), { author: 'newzealand', date: 'March 23, 2024', caption: 'SAVE ✨Walk to the Mercer Bay Loop lookout' });
  });

  await t('matchToPlaces on data/nz/places.json', () => {
    const m = matchToPlaces(mergeSaved(parseSavedPosts(postsJson), parseSavedCollections(collJson)), places);
    const by = Object.fromEntries(m.map(r => [r.shortcode, r]));
    // unique handle -> matched
    assert.deepStrictEqual([by.SANITZD0001.status, by.SANITZD0001.placeId, by.SANITZD0001.via], ['matched', 'dizengoff-ponsonby', 'handle']);
    // shared handle (@docgovtnz runs many places' accounts), caption names one -> matched
    const doc = places.filter(p => /instagram\.com\/docgovtnz\b/.test(p.ig || '')).map(p => p.id);
    assert.ok(doc.length > 1 && doc.includes('cathedral-cove') && doc.includes('pinnacles-hut'), 'docgovtnz is a shared account in the data');
    assert.deepStrictEqual([by.SANITZD0002.status, by.SANITZD0002.placeId, by.SANITZD0002.via], ['matched', 'cathedral-cove', 'handle+caption']);
    // shared handle, caption names none -> ambiguous, candidates = exactly that account's places
    assert.strictEqual(by.SANITZD0003.status, 'ambiguous');
    assert.deepStrictEqual(by.SANITZD0003.candidates.slice().sort(), doc.slice().sort());
    // unknown creator, caption names a place -> suggested (needs a tap to confirm)
    assert.deepStrictEqual([by.SANITZD0004.status, by.SANITZD0004.placeId, by.SANITZD0004.via], ['suggested', 'mercer-bay-loop', 'caption']);
    assert.ok(by.SANITZD0004.candidates.includes('karekare')); // via #karekare
    // unknown creator, hashtag only; #piha is the igTag of two places -> suggested, no single pick
    assert.deepStrictEqual([by.SANITZD0005.status, by.SANITZD0005.placeId, by.SANITZD0005.via], ['suggested', null, 'hashtag']);
    assert.deepStrictEqual(by.SANITZD0005.candidates.sort(), ['piha', 'piha-domain-camp']);
    // nothing to go on -> unmatched tray
    assert.deepStrictEqual([by.SANITZD0006.status, by.SANITZD0007.status], ['unmatched', 'unmatched']);
  });

  await t('shared-account rule: one handle on several places, the caption decides', () => {
    const P = [
      { id: 'a-cove', name: 'Alpha Cove', ig: 'https://www.instagram.com/shared_acct/' },
      { id: 'b-hut', name: 'Bravo Hut', ig: 'https://www.instagram.com/shared_acct/' },
      { id: 'c-cafe', name: 'Charlie Cafe', ig: 'https://www.instagram.com/charlie_only/' }];
    const post = (author, caption) => ({ shortcode: author + caption.length, author, caption, hashtags: [] });
    const [one, two, none, other] = matchToPlaces([post('charlie_only', 'brunch'), post('shared_acct', 'Morning at Alpha Cove'),
      post('shared_acct', 'Hut life'), post('stranger', 'Morning at Alpha Cove')], P);
    assert.deepStrictEqual([one.status, one.placeId, one.via], ['matched', 'c-cafe', 'handle']);
    assert.deepStrictEqual([two.status, two.placeId, two.via], ['matched', 'a-cove', 'handle+caption']);
    assert.deepStrictEqual([none.status, none.placeId, none.candidates.sort()], ['ambiguous', null, ['a-cove', 'b-hut']]);
    assert.deepStrictEqual([other.status, other.placeId, other.via], ['suggested', 'a-cove', 'caption']);   // unknown creator: needs a tap
  });

  await t('inFrame rejects out-of-frame geocodes (Mount Sealy -43.76, 170.05)', () => {
    assert.strictEqual(inFrame(-43.76493, 170.04544), false);
    assert.strictEqual(inFrame(-36.97411, 174.46908), true);
  });

  await t('unzipSaved reads only the saved JSON out of an export ZIP', async () => {
    const files = [
      ['your_instagram_activity/saved/saved_posts.json', Buffer.from(postsJson), 8],
      ['your_instagram_activity/saved/saved_collections.json', Buffer.from(collJson), 0],
      ['personal_information/personal_information/personal_information.json', Buffer.from('{"secret":1}'), 8]];
    const loc = [], cen = []; let off = 0;
    for (const [name, data, meth] of files) {
      const body = meth ? zlib.deflateRawSync(data) : data, nm = Buffer.from(name);
      const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(meth, 8);
      h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
      const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(meth, 10);
      c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
      loc.push(h, nm, body); cen.push(c, nm); off += 30 + nm.length + body.length;
    }
    const cd = Buffer.concat(cen), eo = Buffer.alloc(22);
    eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(files.length, 8); eo.writeUInt16LE(files.length, 10);
    eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(off, 16);
    const out = await unzipSaved(new Blob([Buffer.concat([...loc, cd, eo])]));
    assert.deepStrictEqual(Object.keys(out).sort(), ['your_instagram_activity/saved/saved_collections.json', 'your_instagram_activity/saved/saved_posts.json']);
    assert.strictEqual(parseSavedPosts(out['your_instagram_activity/saved/saved_posts.json']).length, 7);
  });

  console.log(n + ' passed');
})();
