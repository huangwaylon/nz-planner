/* node tools/sync.test.js — planner-sync.js against a fake Apps Script (apps-script/Code.js semantics:
   key → person, client-minted ids deduped, rows with strictly increasing `at`, snapshot {since} tails,
   a `rev` that changes on a hand edit). Never touches the live endpoint.
   Each phone is its own vm context (its own LS, location, clock of timers), sharing one server.
   Checks: pairing, queue replay after a kill and with backoff, dedupe of a retried event, since tails,
   a rev reset (rebuild, queue kept), conflict keep-both, and that the key is never written outside
   LS plan-sync:<slug> (no console, no DOM, no other LS key). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const plans = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nz', 'plans.json'), 'utf8'));
plans.plans = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', 'presets.json'), 'utf8')).plans;   /* a day order to sync: the old curated plans, as a fixture */
const CORE = fs.readFileSync(path.join(ROOT, 'planner.js'), 'utf8'), SYNC = fs.readFileSync(path.join(ROOT, 'planner-sync.js'), 'utf8');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const KA = 'a'.repeat(64), KB = 'b'.repeat(64);

/* ---------- the fake server ---------- */
const server = { rows: [], rev: 'r1', last: 0, down: false, calls: [],
  handle(b) {
    this.calls.push(b.action);
    const who = b.key === KA ? 'a' : b.key === KB ? 'b' : null;
    if (!who) return {ok: false, error: 'unauthorized'};
    if (b.action === 'whoami') return {ok: true, me: who};
    if (b.action === 'event') {
      if (!/^[\w-]{6,64}$/.test(b.id || '')) return {ok: false, error: 'bad_request'};
      if (this.rows.some(r => r[2] === b.id)) return {ok: true, duplicate: true};
      let t = Date.now(); if (t <= this.last) t = this.last + 1; this.last = t;
      const at = new Date(t).toISOString();
      this.rows.push([at, who, b.id, b.type, JSON.stringify(b.data === undefined ? null : b.data)]);
      return {ok: true, at};
    }
    if (b.action === 'snapshot') return {ok: true, rev: this.rev, rows: this.rows.filter(r => !b.since || r[0] > b.since)};
    if (b.action === 'gmlist') return {ok: true, list: {title: 'x'}, items: []};
    return {ok: false, error: 'bad_request'};
  }
};

/* ---------- a phone ---------- */
function phone(name) {
  const store = {}, logs = [], timers = [];
  const LS = {get: k => store[k] == null ? null : store[k], set: (k, v) => { store[k] = String(v); return true; }};
  const ctx = {console: {log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' '))},
    Math, JSON, Date, Set, Map, Object, Array, String, Number, Promise, isFinite, LS, setTimeout: (f, ms) => { timers.push(f); return timers.length; }, clearTimeout: () => {},
    navigator: {onLine: true}, location: {hash: '', pathname: '/', search: ''}, history: {replaceState() {}},
    document: {documentElement: {lang: 'ja'}, addEventListener() {}}, addEventListener() {}, matchMedia: () => ({matches: false}),
    requestAnimationFrame: f => f(), CSS: {escape: s => s},
    fetch: (u, o) => server.down ? Promise.reject(new Error('offline')) : Promise.resolve({json: () => Promise.resolve(u === 'cfg' ? {syncUrl: 'https://sync'} : server.handle(JSON.parse(o.body)))})};
  vm.createContext(ctx);
  vm.runInContext(CORE + '\n;this.planner=planner;', ctx);
  vm.runInContext(SYNC, ctx);
  const toasts = [], S = {trip: {tier: {}, groups: [], notes: {}}, my: null, versions: [], imports: [], booked: {}, day: 0, planId: 'my'};
  const DB = {days: plans.days, presets: plans.plans};
  const dot = {dataset: {}, set innerHTML(v) { this.html = v; }, setAttribute() {}, hidden: false};
  const c = {S, DB, slug: 'nz', SRC: '', pt: (k, o) => k + (o ? JSON.stringify(o) : ''), esc: s => String(s), toast: m => toasts.push(m), E: {main: null},
    view: {querySelector: () => ({prepend() {}})}, addStrings() {}, save() { if (mod) mod.saved(); }, render() {}, rebuild() {}, plan: () => S.my || DB.presets[0]};
  ctx.document.createElement = () => dot;
  /* the config fetch goes to 'cfg' */
  const origFetch = ctx.fetch; ctx.fetch = (u, o) => origFetch(/config\.json$/.test(u) ? 'cfg' : u, o);
  let mod = ctx.planner.sync(c);
  return {ctx, S, LS, store, logs, toasts, timers, get mod() { return mod; },
    restart() { mod = ctx.planner.sync(c); },   /* the app killed and reopened: same LS */
    edit(f) { f(S); c.save(); }};
}
const settle = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); };
const fire = async p => { const t = p.timers.splice(0); t.forEach(f => f()); await settle(); };
const D12 = '2027-02-12';
const myFrom = () => ({id: 'my', days: JSON.parse(JSON.stringify(plans.plans[0].days)), stay: {}, start: {}, notes: {}});

(async () => {
  const A = phone('A'), B = phone('B');
  ok(await A.mod.pairText('https://x/#pair=' + KA) && A.mod.state().me === 'a', 'A pairs with its key and is person a');
  ok(await B.mod.pairText(KB) && B.mod.state().me === 'b', 'B pairs and is person b');
  ok(!(await A.mod.pairText('f'.repeat(64))) && A.mod.state().me === 'a', 'a wrong key does not unpair');
  await settle();

  /* tier: queued, sent, deduped on retry */
  A.edit(S => { S.trip = {tier: {piha: 'must'}, groups: [], notes: {}}; });
  await settle();
  ok(server.rows.length === 1 && server.rows[0][3] === 'tier_set' && A.mod.state().queue === 0, 'a tier edit goes out as one tier_set and leaves the queue');
  { const r = server.handle({key: KA, action: 'event', id: server.rows[0][2], type: 'tier_set', data: {}}); ok(r.duplicate && server.rows.length === 1, 'a retried id is acked as a duplicate, not appended'); }

  /* offline: the queue survives a kill and replays in order with backoff */
  server.down = true;
  A.edit(S => { S.my = myFrom(); S.my.days[D12] = ['piha', 'karekare']; });
  A.edit(S => { S.trip = Object.assign({}, S.trip, {tier: {piha: 'must', karekare: 'want'}}); });
  await settle();
  const q1 = JSON.parse(A.store['plan-sync-q:nz'] || '[]');
  ok(q1.length >= 3 && A.mod.state().online === false, 'offline: the edits wait in LS plan-sync-q (' + q1.map(e => e.type).join(',') + ')');
  A.restart(); await settle();
  ok(JSON.parse(A.store['plan-sync-q:nz']).length === q1.length, 'the queue survives the app being killed');
  server.down = false; await fire(A); await fire(A);
  const types = server.rows.slice(1).map(r => r[3]);
  ok(A.mod.state().queue === 0 && JSON.stringify(types) === JSON.stringify(q1.map(e => e.type)), 'back online it replays in order: ' + types.join(','));

  /* B tails since: gets A's rows, the day and the tiers */
  await B.mod.pull(true); await settle();
  ok(B.S.my && JSON.stringify(B.S.my.days[D12]) === JSON.stringify(['piha', 'karekare']) && B.S.trip.tier.karekare === 'want', 'B reads A\'s day and tiers from the log');
  const since = B.mod.state().since; server.calls.length = 0;
  A.edit(S => { S.booked = {piha: true}; }); await settle();
  await B.mod.pull(true); await settle();
  ok(B.S.booked.piha === true && B.mod.state().since > since, 'a later pull tails from since and gets only the new rows');

  /* conflict: both change Feb 12 from the same base; A's goes first; B keeps both */
  A.edit(S => { S.my = Object.assign({}, S.my, {days: Object.assign({}, S.my.days, {[D12]: ['piha']})}); }); await settle();
  server.down = true;
  B.edit(S => { S.my = Object.assign({}, S.my, {days: Object.assign({}, S.my.days, {[D12]: ['karekare', 'piha', 'kitekite-falls']})}); }); await settle();
  server.down = false;
  const nv = B.S.versions.length;
  await B.mod.pull(true); await settle();
  ok(JSON.stringify(B.S.my.days[D12]) === JSON.stringify(['karekare', 'piha', 'kitekite-falls']) && B.S.versions.length === nv + 1 && JSON.stringify(B.S.versions[0].days[D12]) === JSON.stringify(['piha']),
    'B, with its own edit unsent, keeps its order and keeps A\'s as a version');
  ok(B.toasts.some(t => /^both/.test(t)), 'and says so: 「…両方残しています」');
  await fire(B); await fire(B);
  const na = A.S.versions.length;
  await A.mod.pull(true); await settle();
  ok(JSON.stringify(A.S.my.days[D12]) === JSON.stringify(['karekare', 'piha', 'kitekite-falls']) && A.S.versions.length >= na + 1 && A.toasts.some(t => /^both/.test(t)),
    'A gets B\'s newer order and keeps its own as a version, also saying so');

  /* rev: a hand edit of the sheet → everything is refetched and rebuilt, the queue kept */
  server.down = true; A.edit(S => { S.trip = Object.assign({}, S.trip, {notes: {piha: 'towels'}}); }); await settle();
  const qn = A.mod.state().queue; server.down = false;
  server.rev = 'r2'; server.rows = server.rows.filter(r => r[3] !== 'booked_set');   /* the hand edit removed a row */
  server.calls.length = 0; const n0 = server.rows.length;
  await A.mod.pull(true); await settle(); await fire(A);
  const resent = server.rows.slice(n0).map(r => r[3]);
  ok(server.calls.filter(x => x === 'snapshot').length >= 2 && !resent.some(x => /plan_new|day_set/.test(x)) && resent.filter(x => x === 'note_set').length === 1,
    'a new rev refetches from the start and sends nothing twice: ' + resent.join(','));
  ok(JSON.parse(A.store['plan-sync-q:nz'] || '[]').length <= qn && A.S.trip.notes.piha === 'towels', 'the unsent queue is kept across the rev reset');

  /* the key: only in LS plan-sync:nz and in the request body */
  for (const P of [A, B]) {
    const key = P === A ? KA : KB;
    ok(!P.logs.some(l => l.includes(key)), 'no console line holds the key');
    ok(Object.keys(P.store).filter(k => P.store[k].includes(key)).every(k => k === 'plan-sync:nz'), 'no LS key but plan-sync:nz holds the key');
    ok(!P.toasts.some(t => t.includes(key)), 'no toast holds the key');
  }
  /* static gate: the key variable K never reaches text (no template, concatenation, console or DOM),
     and is written only into the request body and LS plan-sync:<slug> */
  { const lines = SYNC.split('\n').filter(l => /\bK\b/.test(l));
    ok(!lines.some(l => /\$\{K\}|\+\s*K\b|\bK\s*\+|String\(K\)|console\.\w+\([^)]*\bK\b|innerHTML[^;]*\$\{[^}]*\bK\b[^?]/.test(l)), 'K is never turned into text');
    ok(lines.filter(l => /key:K/.test(l)).every(l => /body:JSON\.stringify|wr\(KS,/.test(l)), 'K is written only into the POST body and LS KS'); }

  console.log(fails ? `${fails} of ${n} sync checks failed` : `${n} sync checks passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL threw ' + (e && e.stack || e)); process.exit(1); });
