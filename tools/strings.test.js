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
console.log(used.size + ' boot strings, all defined');
