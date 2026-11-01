// node tools/gas.test.js — apps-script/Code.js against in-memory fakes of the Apps Script services:
// init once, auth by key, the rate limit, event validation and retry dedupe, snapshot tails by
// `since`, and `rev` changing after a hand edit. No network.
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = path.join(__dirname, '..', 'apps-script');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

function world() {
  const props = {}, cache = {}, rows = [];
  const sheet = {
    getRange(a, b, h, w) {
      if (typeof a === 'string') return {setNumberFormat() {}};
      return {
        setValues(v) { v.forEach((r, i) => { rows[a - 1 + i] = r.slice(); }); },
        getValues() { const out = []; for (let i = 0; i < h; i++) out.push((rows[a - 1 + i] || []).slice(b - 1, b - 1 + w)); return out; },
      };
    },
    getLastRow: () => rows.length, appendRow: r => rows.push(r.slice()), setFrozenRows() {},
  };
  let tab = null;
  const ctx = {
    console, JSON, Date, Math, String, Number, Object, Array, Error,
    PropertiesService: {getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); },
      setProperties: o => Object.keys(o).forEach(k => { props[k] = String(o[k]); }) })},
    CacheService: {getScriptCache: () => ({get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }})},
    LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
    SpreadsheetApp: {getActive: () => ({getSheetByName: () => tab, insertSheet: () => (tab = sheet)})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: s => ({setMimeType: () => JSON.parse(s)})},
    Utilities: {getUuid: () => require('crypto').randomUUID()},
    UrlFetchApp: {fetch() { throw new Error('no network in tests'); }},
  };
  vm.createContext(ctx);
  for (const f of ['gmlist.js', 'gm.js', 'Code.js']) vm.runInContext(fs.readFileSync(path.join(A, f), 'utf8'), ctx, {filename: f});
  const post = b => ctx.doPost({postData: {contents: typeof b === 'string' ? b : JSON.stringify(b)}});
  return {post, rows, props, ctx};
}

const w = world();
ok(w.post({action: 'health'}).ok, 'health needs no key');
ok(w.post('{nope').error === 'bad_request', 'bad JSON is bad_request, not a throw');
ok(w.post({action: 'whoami', key: 'x'}).error === 'unauthorized', 'no key, no entry');
const init = w.post({action: 'init'});
ok(init.ok && /^[0-9a-f]{64}$/.test(init.keys.a) && init.keys.a !== init.keys.b, 'init makes two 64-hex keys');
ok(w.post({action: 'init'}).error === 'unauthorized', 'init refuses a second time');
const A_ = init.keys.a, B_ = init.keys.b;
ok(w.post({action: 'whoami', key: A_}).me === 'a' && w.post({action: 'whoami', key: B_}).me === 'b', 'the key is the person');
ok(w.post({action: 'whoami', key: A_.slice(0, 63) + (A_[63] === '0' ? '1' : '0')}).error === 'unauthorized', 'a near-miss key fails');

const ev = (key, id, type, data) => w.post({action: 'event', key, id, type, data});
ok(ev(A_, 'e1abcdef', 'tier_set', {id: 'piha', tier: 'must'}).ok, 'event appends');
ok(ev(A_, 'e1abcdef', 'tier_set', {id: 'piha', tier: 'must'}).duplicate === true, 'a retried id is acked as a duplicate');
ok(w.rows.length === 2, 'a duplicate does not append (header + 1)');
ok(ev(A_, 'e2abcdef', 'hack', {}).error === 'bad_request', 'unknown type refused');
ok(ev(A_, 'x', 'tier_set', {}).error === 'bad_request', 'short id refused');
ok(ev(A_, 'e3abcdef', 'note_set', {t: 'x'.repeat(21000)}).error === 'too_large', 'data cap');
const r2 = ev(B_, 'e4abcdef', 'day_set', {plan: 'my', date: '2027-02-12', ids: ['piha']});
ok(r2.ok && r2.at > w.rows[1][0], 'server time strictly increases');

const s1 = w.post({action: 'snapshot', key: A_});
ok(s1.ok && s1.rows.length === 2 && s1.rows[0][1] === 'a' && s1.rows[1][1] === 'b', 'snapshot returns both people in order');
const s2 = w.post({action: 'snapshot', key: B_, since: s1.rows[0][0]});
ok(s2.rows.length === 1 && s2.rows[0][2] === 'e4abcdef', 'since returns only the tail');
const rev = s1.rev;
w.rows.splice(1, 1);                       // a hand delete in the sheet
ok(w.post({action: 'snapshot', key: A_}).rev !== rev, 'rev changes after a hand edit');

let busy = 0;
for (let i = 0; i < 125; i++) if (w.post({action: 'whoami', key: B_}).error === 'busy') busy++;
ok(busy > 0, 'rate limit kicks in past 120/min');
ok(w.post({action: 'gmlist', key: A_, url: 'https://evil.example/x'}).error === 'bad-url', 'gmlist is not an open proxy');

console.log(fails ? fails + ' of ' + n + ' failed' : n + ' gas checks passed');
process.exit(fails ? 1 : 0);
