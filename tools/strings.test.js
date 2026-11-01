// node tools/strings.test.js — every string planner.js reads at boot (data-pt, pt('…')) is in its own
// PT table. A key that lives only in planner-more.js's PTM shows as its raw name until that lazy
// chunk loads: the toolbar's VoiceOver label read "saveVer" on the first deploy.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8');
const used = new Set([...s.matchAll(/data-pt="([A-Za-z0-9_]+)"/g), ...s.matchAll(/\bpt\('([A-Za-z0-9_]+)'/g)].map(m => m[1]));
const body = (s.match(/const PT=\{([\s\S]*?)\n\};/) || [])[1] || '';
const have = new Set([...body.matchAll(/(?:^|[,{\s])([A-Za-z0-9_]+):\{ja:/g)].map(x => x[1]));
const missing = [...used].filter(k => !have.has(k));
if (!have.size) { console.log('FAIL could not read PT'); process.exit(1); }
if (missing.length) { console.log('FAIL not in planner.js PT: ' + missing.join(' ')); process.exit(1); }
/* a chunk's table never redefines a core key: the desk's 「ほか {n}件・絞る」 once replaced the core's
   「詳しく」 and every leg disclosure read it (W2 P2-6) */
const keysOf = f => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); return new Set([...t.matchAll(/(?:^|[,{\s])([A-Za-z0-9_]+):\{ja:'/g)].map(x => x[1])); };
/* except the desk's own wording for the same slot (the intro and the empty day say 'drag' at ≥1024) */
const ALLOW = new Set(['planner-desk.js:intro', 'planner-desk.js:emptyDay']);
const clash = ['planner-more.js', 'planner-collect.js', 'planner-desk.js'].flatMap(f => [...keysOf(f)].filter(k => have.has(k)).map(k => f + ':' + k)).filter(k => !ALLOW.has(k));
if (clash.length) { console.log('FAIL a chunk redefines a core string: ' + clash.join(' ')); process.exit(1); }
console.log(used.size + ' boot strings, all defined');
