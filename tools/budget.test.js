/* node tools/budget.test.js — the byte budget (docs/WORKFLOW.md "Budget"), gzip -9 of the shipped files.
   - a phone's first screen on ② (the day view): the page, the shell, its CSS, places, plans and the light coastline
   - a phone's first screen on ① (collect): the same without the coastline, plus the collect chunk
   - each lazy chunk under its own cap, loaded only by its trigger
   - sw.js never pre-caches the desktop chunk (the phone must not download it), and dist.sh ships
     every chunk the shell can ask for */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const has = f => fs.existsSync(path.join(ROOT, f));
const gz = f => has(f) ? zlib.gzipSync(fs.readFileSync(path.join(ROOT, f)), {level: 9}).length : 0;
const KB = 1000, sum = fs_ => fs_.reduce((t, f) => t + gz(f), 0);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const SHELL = ['index.html', 'host.js', 'planner.js', 'planner.css', 'poc.css', 'data/nz/places.json', 'data/nz/plans.json'];
const plan2 = sum(SHELL.concat(['data/nz/land-lo.svg.html']));
ok(plan2 <= 100 * KB, `phone ② first screen ${plan2} B gz (≤ 100 000)`);
const collect = ['planner-collect.js', 'planner-collect.css'];
const plan1 = sum(SHELL.concat(collect));
ok(plan1 <= 100 * KB, `phone ① first screen ${plan1} B gz (≤ 100 000; coastline deferred)`);

const CAPS = [[['planner-collect.js', 'planner-collect.css'], 7.5], [['planner-desk.js', 'planner-desk.css'], 6.5], [['planner-cal.js', 'planner-cal.css'], 6]];
const shellSrc = fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8');
/* a chunk counts once the shell can load it; one still being built beside it is reported only */
CAPS.forEach(([fs_, cap]) => { const n = sum(fs_); if (!fs_.some(has)) { console.log(`--   ${fs_[0]} not built yet`); return; }
  const live = shellSrc.includes("'" + fs_[0] + "'");
  if (live) ok(n <= cap * KB, `${fs_.join(' + ')} ${n} B gz (≤ ${cap * KB})`);
  else console.log(`--   ${fs_.join(' + ')} ${n} B gz (cap ${cap * KB}; not loaded by the shell yet)`); });

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), app = (sw.match(/const APP = \[([^\]]*)\]/) || [])[1] || '';
ok(app && !/planner-desk/.test(app), 'sw.js APP does not pre-cache the desktop chunk');
const dist = fs.readFileSync(path.join(ROOT, 'tools', 'dist.sh'), 'utf8');
const shell = fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8');
const chunks = [...new Set([...shell.matchAll(/'((?:planner-[a-z]+|import|story)\.(?:js|css))'/g)].map(m => m[1]))];
chunks.forEach(f => { ok(has(f), `${f} exists`); ok(new RegExp('\\b' + f.replace('.', '\\.') + '\\b').test(dist), `dist.sh ships ${f}`); });
['data/nz/groups.json', 'data/nz/flags.json'].forEach(f => ok(has(f) && /data\/nz\/\*\.json/.test(dist), `dist.sh ships ${f}`));

console.log(fails ? `${fails} budget checks failed` : 'budget ok');
process.exit(fails ? 1 : 0);
