/* Simulation parity test: node tools/sim.test.js (no dependencies beyond python3).
   The app's day simulation (planner.js makeSim) must agree with tools/check_plans.py, the
   reference, on every displayed time, the driving total and the kinds of problem, for every day of
   every preset plus the edge cases that broke trust before:
     (a) a reorder on the hut morning: hut -> Three Sisters is walk down + drive (192 min), and
         Three Sisters -> tarns is drive + walk up (237 min); only the drive counts as driving
     (b) a late start that misses the tarns' sunrise (mustSun): a blocking 'sun' problem
     (c) stayDay on the tarns changes that day's visit only
     (d) a place reached after midnight past its closing time is closed
     (e) a closing time at or before the opening (truth/dare 16:00-00:00) is the next day: open at 21:00
     (f) a night's stay carries over: an end anchor at the hut on Feb 13 starts Feb 14 at the hut */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..'), D = path.join(ROOT, 'data', 'nz');
const ctx = {console, Math, JSON, Date, Set, Map, Object, Array, String, Number, isFinite,
  matchMedia: () => ({matches: false}), document: {documentElement: {lang: 'ja'}}, LS: {get: () => null, set() {}},
  requestAnimationFrame: f => setTimeout(f, 0), setTimeout, CSS: {escape: s => s}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8') + '\n;this.planner=planner;', ctx);
const J = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const places = J('places.json'), plans = J('plans.json'), travel = J('travel.json');
/* plans.json ships no versions; the curated eight are the fixture check_plans reads too */
plans.plans = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', 'presets.json'), 'utf8')).plans;
const have = new Set(places.map(p => p.id)), list = places.concat((plans.basePlaces || []).filter(p => !have.has(p.id)));
const DB = {places: new Map(list.map(p => [p.id, p])), list, days: plans.days, bases: new Set(plans.bases || []), ferries: plans.ferries || [],
  walks: plans.walks || [], noRoad: plans.noRoad || {},
  tides: Object.fromEntries(Object.entries(plans.tides || {}).filter(([k]) => k[0] !== '_')), travel, tIdx: Object.fromEntries(travel.ids.map((id, i) => [id, i]))};
const sim = ctx.planner.sim(DB);

/* the same hm() as check_plans.py: '+' for the next day */
const pad = n => String(n).padStart(2, '0');
const hm = m => { m = Math.round(m); return (m >= 1440 ? '+' : '') + pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); };
const KIND = {closed: 'closed', closedAt: 'closed', ferryMiss: 'ferry', ferryBack: 'ferry', ferryDay: 'ferry', over: 'late', tide: 'tide',
  dark: 'dark', dawn: 'dark', sunMiss: 'sun', golden: 'golden', tight: 'tight', hoursUnknown: 'hours?', tideCheck: 'tide?'};
function app(P) {
  return DB.days.map(d => { const sc = sim.schedule(d, null, P);
    const kinds = [];
    sc.rows.forEach(r => { r.warns.forEach(w => kinds.push(KIND[w.k] || w.k)); r.infos.forEach(x => { if (KIND[x.k] && ['golden', 'tight', 'hours?', 'tide?'].includes(KIND[x.k])) kinds.push(KIND[x.k]); }); });
    if (sc.long) kinds.push('long');
    return {date: d.date, end: hm(sc.end), driving: Math.floor(sc.drive), kinds: kinds.sort(),
      rows: sc.rows.slice(1).map(r => [hm(r.kind === 'end' ? r.arr : r.begin), r.kind === 'end' ? '' : hm(r.dep), r.id, Math.round(r.leg.min)])}; });
}
function ref(planList) {
  const py = "import json,sys\nsys.path.insert(0,sys.argv[1])\nimport check_plans as C\ns=C.Sim()\n" +
    "print(json.dumps([[s.day(p,d) for d in s.plans['days']] for p in json.load(sys.stdin)]))";
  const out = JSON.parse(execFileSync('python3', ['-c', py, path.join(ROOT, 'tools')], {input: JSON.stringify(planList)}).toString());
  return out.map(days => days.map(d => ({date: d.date, end: d.end, driving: d.driving, kinds: d.warn.map(w => w[0]).sort(),
    rows: d.rows.map(r => [r[0], r[1], r[2], r[4]])})));
}

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const same = (a, b, label) => {
  ok(JSON.stringify(a.rows) === JSON.stringify(b.rows), `${label} rows\n  app ${JSON.stringify(a.rows)}\n  ref ${JSON.stringify(b.rows)}`);
  ok(a.end === b.end, `${label} end app ${a.end} ref ${b.end}`);
  ok(Math.abs(a.driving - b.driving) <= 1, `${label} driving app ${a.driving} ref ${b.driving}`);
  ok(JSON.stringify(a.kinds) === JSON.stringify(b.kinds), `${label} problems app ${a.kinds} ref ${b.kinds}`);
};
const clone = o => JSON.parse(JSON.stringify(o));
const byId = id => clone(plans.plans.find(p => p.id === id));

/* the edge cases */
const hutReorder = byId('hut'), F14 = '2027-02-14', F13 = '2027-02-13';
{ const l = hutReorder.days[F14].filter(x => x !== 'three-sisters-elephant-rock'); l.unshift('three-sisters-elephant-rock'); hutReorder.days[F14] = l; hutReorder.id = 'hut-reorder'; }
const lateStart = byId('hut'); lateStart.id = 'hut-late'; lateStart.start = Object.assign({}, lateStart.start, {[F14]: '08:30'});
lateStart.anchors = clone(lateStart.anchors || {}); if (lateStart.anchors[F14] && lateStart.anchors[F14].start) delete lateStart.anchors[F14].start.time;
const stayDay = byId('hut'); stayDay.id = 'hut-stayday'; stayDay.stayDay = {[F14]: {'pouakai-tarns': 60}};
const midnight = byId('classic'); midnight.id = 'classic-midnight';
{ const l = midnight.days[F14], k = l.indexOf('three-sisters-elephant-rock'); l.splice(k + 1, 0, 'small-mercies'); }
const lateBar = byId('classic'); lateBar.id = 'classic-truthdare'; lateBar.days['2027-02-12'] = lateBar.days['2027-02-12'].concat(['truth-dare-bar']);
const hutNight = byId('classic'); hutNight.id = 'classic-hutnight'; hutNight.anchors = Object.assign(clone(hutNight.anchors || {}), {[F13]: {end: {id: 'pouakai-hut'}}});
hutNight.days[F14] = hutNight.days[F14].filter(x => x !== 'mangorei-trailhead'); hutNight.start = Object.assign({}, hutNight.start, {[F14]: '06:20'});
const extra = [hutReorder, lateStart, stayDay, midnight, lateBar, hutNight];

const all = plans.plans.concat(extra), R = ref(all);
all.forEach((P, k) => { const A = app(P); A.forEach((d, i) => same(d, R[k][i], `${P.id} ${d.date}`)); });

/* and what each case is about, so a shared mistake in both cannot pass */
const day = (P, date) => app(P).find(d => d.date === date);
{ const d = day(hutReorder, F14); ok(d.rows[0][3] === 192 && d.rows[1][3] === 237, `(a) hut reorder legs ${d.rows[0][3]}/${d.rows[1][3]}, want 192/237`);
  const sc = sim.schedule(DB.days.find(x => x.date === F14), null, hutReorder), l1 = sc.rows[1].leg;
  ok(l1.combo && l1.walk === 120 && Math.round(l1.drove) === 72, `(a) hut -> Three Sisters is 120 walk + 72 drive (walk ${l1.walk}, drive ${l1.drove})`); }
{ const d = day(lateStart, F14); ok(d.kinds.includes('sun'), `(b) a late start must miss the tarns' sunrise: ${d.kinds}`); }
{ const a = day(stayDay, F14), b = day(byId('hut'), F13), c = day(stayDay, F13);
  const t = a.rows.find(r => r[2] === 'pouakai-tarns');
  ok(JSON.stringify(b) === JSON.stringify(c), '(c) stayDay on Feb 14 must leave Feb 13 alone');
  ok(t && (parseInt(t[1].slice(-5)) * 60 + +t[1].slice(-2)) - (parseInt(t[0].slice(-5)) * 60 + +t[0].slice(-2)) === 60, `(c) tarns stay 60 on Feb 14: ${t}`); }
{ const d = day(midnight, F14), r = d.rows.find(x => x[2] === 'deco-titirangi');
  ok(r && r[0][0] === '+' && d.kinds.includes('closed'), `(d) Deco after midnight must be closed: ${r} ${d.kinds}`); }

{ const sc = sim.schedule(DB.days.find(x => x.date === '2027-02-12'), null, lateBar), r = sc.rows.find(x => x.id === 'truth-dare-bar');
  ok(r && !r.warns.some(w => w.k === 'closedAt'), `(e) truth/dare 16:00-00:00 open at ${r && hm(r.begin)}: ${r && JSON.stringify(r.warns)}`); }
{ const d = day(hutNight, F14), an = sim.anchorsOf(DB.days.find(x => x.date === F14), hutNight);
  ok(an.start.id === 'pouakai-hut' && d.rows[0][2] === 'pouakai-tarns' && d.rows[0][0] <= '06:50', `(f) Feb 14 starts at the hut, tarns by sunrise: ${an.start.id} ${d.rows[0]}`); }
console.log(fails ? `${fails} of ${checks} checks failed` : `${checks} checks passed (${all.length} plans x ${DB.days.length} days vs check_plans.py)`);
process.exit(fails ? 1 : 0);
