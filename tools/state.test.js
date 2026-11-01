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
  ok(J(r.my.notes) === J({}) && J(r.trip.notes) === J({piha: 'bring towels'}), 'v1 -> v2: My plan\'s notes move up to the trip, blanks dropped');
  ok(r.migrated && r.v === 1 && J(r.trip.tier) === J({}) && J(r.trip.groups) === J([]), 'v1 -> v2: tiers start from the seed (nothing stored), groups empty');
  ok(J(r.my.stayDay) === J({[D14]: {'pouakai-tarns': 60}}), 'stayDay keeps numbers only: ' + J(r.my.stayDay));
  ok(r.my.name.length === 40, 'a name is capped at 40');
  ok(J(r.booked) === J({'waitomo-glowworm-caves': true}), 'booked keeps true only');
  ok(J(r.imports.map(m => m.id)) === J(['gm-1', 'gm-2']), 'imports: coordinates both or neither, id and name required');
  ok(r.versions.length === 1 && r.versions[0].id === 'v-a' && r.versions[0].kind === 'auto', 'versions: only v- ids with days objects survive');
  ok(r.broken, 'a dropped version flags broken so the raw string is kept'); }
/* a v1 with nothing wrong is not broken */
{ const r = ST.read(J({v: 1, active: 'classic', my: null, versions: [], imports: [], booked: {}}), env); ok(r.loaded && !r.broken && r.my === null, 'a clean v1 is not broken'); }

/* ---------- v2 ---------- */
const v2 = {v: 2, active: 'my', trip: {tier: {piha: 'must', karekare: 'skip', x: 'nope', y: ''}, notes: {piha: 'towels', z: ' '},
    groups: [{id: 'g-a', name: 'West', ids: ['piha', 'karekare', 'piha']}, {id: 'g-b', name: 'Dup', ids: ['piha', 'kitekite-falls']}, {id: 'g-a', ids: []}, {name: 'no id'}]},
  my: {id: 'my', days: {[D12]: ['piha']}}, versions: [], imports: [], booked: {}};
{ const r = ST.read(J(v2), env);
  ok(r.loaded && r.v === 2 && !r.migrated && !r.broken, 'v2 loads as is');
  ok(J(r.trip.tier) === J({piha: 'must', karekare: 'skip', y: ''}), 'tiers: must want maybe skip, or "" for back to the inbox: ' + J(r.trip.tier));
  ok(J(r.trip.groups.map(g => [g.id, g.ids])) === J([['g-a', ['piha', 'karekare']], ['g-b', ['kitekite-falls']]]), 'groups: unique ids, a place in one group only: ' + J(r.trip.groups));
  ok(J(r.trip.notes) === J({piha: 'towels'}), 'trip notes keep text only'); }
/* migration: notes from My plan first, then the newest version that has them */
{ const r = ST.read(J({v: 1, my: {days: {}, notes: {a: 'mine'}}, versions: [{id: 'v-1', at: 1, days: {}, notes: {a: 'old', b: 'old b'}}, {id: 'v-2', at: 9, days: {}, notes: {b: 'new b', c: 'c'}}]}), env);
  ok(J(r.trip.notes) === J({a: 'mine', b: 'new b', c: 'c'}), 'notes: My plan, then the newest version: ' + J(r.trip.notes)); }
/* the old-app guard: a stale v1 app moved our v2 to :broken and wrote an empty v1 over it */
{ const old = J({v: 1, active: 'classic', my: null, versions: [{id: 'v-old', days: {}}], imports: [], booked: {x: true}});
  const r = ST.read(old, env, J(Object.assign({}, v2, {versions: [{id: 'v-keep', days: {}, name: 'Keep'}], imports: [{id: 'gm-9', name: 'Nine', lat: -36.9, lon: 174.5}], booked: {y: true}})));
  ok(r.merged, 'a v2 in :broken under a v1 is merged back');
  ok(r.trip.tier.piha === 'must' && r.trip.groups.length === 2 && r.trip.notes.piha === 'towels', 'the trip comes back');
  ok(r.my && J(r.my.days[D12]) === J(['piha']), 'My plan comes back when the old app had none');
  ok(J(r.versions.map(v => v.id).sort()) === J(['v-keep', 'v-old']), 'versions from both survive');
  ok(r.imports.length === 1 && r.booked.x && r.booked.y, 'imports and bookings from both survive'); }
{ const r = ST.read(J(v2), env, J(Object.assign({}, v2, {trip: {tier: {karekare: 'want'}}})));
  ok(!r.merged && r.trip.tier.karekare === 'skip', 'a v2 save is never overwritten from :broken'); }
/* the old app edited My plan meanwhile: its days win, ours is kept as an autosave */
{ const r = ST.read(J({v: 1, my: {id: 'my', days: {[D14]: ['three-sisters-elephant-rock']}}, versions: []}), env, J(v2));
  ok(J(r.my.days[D14]) === J(['three-sisters-elephant-rock']) && r.versions.some(v => v.kind === 'auto' && J(v.days[D12]) === J(['piha'])), 'both My plans survive'); }

/* notes: a preset's own note is never hers (QA W1 P1-1) */
const PRE = plans.plans.find(P => P.id === 'classic').notes, preK = 'pouakai-tarns', preV = PRE[preK], hutPiha = plans.plans.find(P => P.id === 'hut').notes.piha;
{ const r = ST.read(J({v: 1, my: {id: 'my', from: 'classic', days: {}, notes: {[preK]: preV, piha: '水着を忘れずに'}}, versions: [{id: 'v-1', at: 5, days: {}, notes: {mokau: PRE.mokau}}]}), env);
  ok(J(r.trip.notes) === J({piha: '水着を忘れずに'}), 'migration lifts only her own notes: ' + J(r.trip.notes));
  ok(r.my.notes[preK] === preV && r.my.notes.piha == null, 'the preset note stays with My plan, hers moved up'); }
/* the old-app guard: the old app forked classic (its notes copied into My plan); her v2 notes win */
{ const old = J({v: 1, active: 'my', my: {id: 'my', from: 'classic', days: {[D12]: ['piha']}, notes: {piha: hutPiha, 'waitomo-glowworm-caves': 'preset text'}}, versions: []});
  const broken = J(Object.assign({}, v2, {trip: {tier: {}, groups: [], notes: {piha: '水着を忘れずに', 'waitomo-glowworm-caves': '予約は10時'}}}));
  const r = ST.read(old, env, broken);
  ok(r.trip.notes.piha === '水着を忘れずに' && r.trip.notes['waitomo-glowworm-caves'] === '予約は10時', 'through the guard her notes survive: ' + J(r.trip.notes)); }
/* a v2 save that already holds a preset note in the trip (lifted by an earlier build) is cleaned on read */
{ const r = ST.read(J(Object.assign({}, v2, {trip: {tier: {}, groups: [], notes: {[preK]: preV, piha: 'towels'}}})), env);
  ok(J(r.trip.notes) === J({piha: 'towels'}), 'preset notes leave the trip on read: ' + J(r.trip.notes)); }

console.log(fails ? `${fails} of ${n} state checks failed` : `${n} state checks passed`);
process.exit(fails ? 1 : 0);
