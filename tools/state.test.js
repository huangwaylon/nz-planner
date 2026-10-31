/* node tools/state.test.js — the saved-state reader (planner.state), pure, against fixtures.
   What storage gives back is validated, never trusted: bad entries are dropped and the state is
   flagged broken (the caller then keeps the raw string in plan:<slug>:broken), good ones survive. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = {console, Math, JSON, Date, Set, Map, Object, Array, String, Number, isFinite,
  matchMedia: () => ({matches: false}), document: {documentElement: {lang: 'ja'}}, LS: {get: () => null, set() {}},
  requestAnimationFrame: f => setTimeout(f, 0), setTimeout, CSS: {escape: s => s}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8') + '\n;this.planner=planner;', ctx);
const ST = ctx.planner.state;
const plans = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nz', 'plans.json'), 'utf8'));
const env = {days: plans.days, presets: plans.plans};
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const J = o => JSON.stringify(o);
const D12 = '2027-02-12', D14 = '2027-02-14';

/* nothing saved: an empty state, not broken */
{ const r = ST.read(null, env); ok(!r.broken && !r.loaded && r.my === null && r.versions.length === 0, 'no save -> empty, not broken'); }
/* garbage and unknown versions: broken, nothing loaded */
{ const r = ST.read('{not json', env); ok(r.broken && !r.loaded, 'unparsable -> broken'); }
{ const r = ST.read(J({v: 9, my: {days: {}}}), env); ok(r.broken && !r.loaded, 'an unknown v -> broken, nothing read'); }
/* a good v1 save */
const good = {v: 1, active: 'my', booked: {'waitomo-glowworm-caves': true, bad: 'yes'},
  imports: [{id: 'gm-1', name: 'A', lat: -36.9, lon: 174.5}, {id: 'gm-2', name: 'B'}, {id: 'gm-3', name: 'C', lat: 'x', lon: 1}, {name: 'no id'}],
  my: {id: 'my', from: 'classic', days: {[D12]: ['piha', 'piha', 'kitekite-falls', 7]}, stay: {piha: 30, x: -5, y: 'z'}, start: {[D12]: '08:15', [D14]: '25:00'},
    notes: {piha: 'bring towels', empty: '  '}, stayDay: {[D14]: {'pouakai-tarns': 60, bad: 'x'}, junk: 5}, name: 'x'.repeat(60)},
  versions: [{id: 'v-a', name: 'One', days: {}, kind: 'auto'}, {id: 'nope', days: {}}, {id: 'v-b', days: []}]};
{ const r = ST.read(J(good), env);
  ok(r.loaded && r.active === 'my', 'v1 loads, active kept');
  ok(J(r.my.days[D12]) === J(['piha', 'kitekite-falls']), 'a day is deduped and non-strings dropped: ' + J(r.my.days[D12]));
  ok(env.days.every(d => Array.isArray(r.my.days[d.date])), 'every trip day exists');
  ok(J(r.my.stay) === J({piha: 30}), 'stay keeps minutes only');
  ok(J(r.my.start) === J({[D12]: '08:15'}), 'start keeps valid HH:MM only');
  ok(J(r.my.notes) === J({piha: 'bring towels'}), 'blank notes dropped');
  ok(J(r.my.stayDay) === J({[D14]: {'pouakai-tarns': 60}}), 'stayDay keeps numbers only: ' + J(r.my.stayDay));
  ok(r.my.name.length === 40, 'a name is capped at 40');
  ok(J(r.booked) === J({'waitomo-glowworm-caves': true}), 'booked keeps true only');
  ok(J(r.imports.map(m => m.id)) === J(['gm-1', 'gm-2']), 'imports: coordinates both or neither, id and name required');
  ok(r.versions.length === 1 && r.versions[0].id === 'v-a' && r.versions[0].kind === 'auto', 'versions: only v- ids with days objects survive');
  ok(r.broken, 'a dropped version flags broken so the raw string is kept'); }
/* a v1 with nothing wrong is not broken */
{ const r = ST.read(J({v: 1, active: 'classic', my: null, versions: [], imports: [], booked: {}}), env); ok(r.loaded && !r.broken && r.my === null, 'a clean v1 is not broken'); }

console.log(fails ? `${fails} of ${n} state checks failed` : `${n} state checks passed`);
process.exit(fails ? 1 : 0);
