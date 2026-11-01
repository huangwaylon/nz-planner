// NZ Planner sync backend: the one script bound to the "NZ Planner" sheet (docs/ARCH.md phase 2).
// It copies the fitness app's contract: POST text/plain {key, action, ...}; doPost never throws;
// the key in the body is the person; append-only rows; one script lock around reads and writes;
// a `rev` that changes when someone edits the sheet by hand. No secrets in this file: the two
// keys live in Script Properties, set once by `init` and never returned again.

const TAB = 'events';
const COLS = ['at', 'person', 'id', 'type', 'data'];
const TYPES = ['day_set', 'tier_set', 'group_set', 'group_drop', 'note_set', 'booked_set',
               'imp_add', 'imp_drop', 'plan_new', 'plan_rename', 'plan_drop', 'pref'];
const MAX_BODY = 1000000, MAX_DATA = 20000, RATE = 120;   // bytes, chars, requests/min/key
const BUILD = '2ae8b2b2b81d';                                      // tools/gas_build.py stamps the hash here

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return out_({ok: false, error: 'too_large'});
    let b;
    try { b = JSON.parse(raw); } catch (x) { return out_({ok: false, error: 'bad_request'}); }
    if (b.action === 'health') return out_({ok: true, build: BUILD});
    if (b.action === 'init') return out_(init_());
    const who = auth_(b.key);
    if (!who) return out_({ok: false, error: 'unauthorized'});
    if (!rate_(who)) return out_({ok: false, error: 'busy', detail: 'rate'});
    switch (b.action) {
      case 'whoami': return out_({ok: true, me: who, build: BUILD});
      case 'event': return out_(locked_(() => event_(who, b)));
      case 'snapshot': return out_(locked_(() => snapshot_(b.since)));
      case 'gmlist': return out_(gmList_(b.url));
      case 'gmplace': return out_(gmPlace_(b.fids));
      default: return out_({ok: false, error: 'bad_request'});
    }
  } catch (x) {
    return out_({ok: false, error: 'unavailable', detail: String(x && x.message || x).slice(0, 200)});
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Keys are made here, once, the first time anyone asks. After that `init` refuses, so the URL
// alone is worth nothing; rotating a key is editing a Script Property by hand.
function init_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('KEY_A')) return {ok: false, error: 'unauthorized', detail: 'already initialised'};
  const k = () => Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const keys = {KEY_A: k(), KEY_B: k(), REV: String(Date.now())};
  P.setProperties(keys);
  sheet_();
  return {ok: true, keys: {a: keys.KEY_A, b: keys.KEY_B}};
}

function auth_(key) {
  if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key)) return null;
  const C = CacheService.getScriptCache();
  let ks = C.get('keys');
  if (!ks) {
    const P = PropertiesService.getScriptProperties();
    ks = JSON.stringify({a: P.getProperty('KEY_A') || '', b: P.getProperty('KEY_B') || ''});
    C.put('keys', ks, 300);
  }
  ks = JSON.parse(ks);
  return same_(key, ks.a) ? 'a' : same_(key, ks.b) ? 'b' : null;
}

function same_(x, y) {               // constant time over equal lengths
  if (!y || x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

function rate_(who) {
  const C = CacheService.getScriptCache(), k = 'r' + who + Math.floor(Date.now() / 60000);
  const n = Number(C.get(k) || 0) + 1;
  C.put(k, String(n), 120);
  return n <= RATE;
}

function locked_(f) {
  const L = LockService.getScriptLock();
  if (!L.tryLock(10000)) return {ok: false, error: 'busy'};
  try { return f(); } finally { L.releaseLock(); }
}

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);
    sh.getRange('A:E').setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Server time, ISO with ms, strictly increasing so `since` is a clean tail.
function stamp_() {
  const P = PropertiesService.getScriptProperties();
  let t = Date.now();
  const last = Number(P.getProperty('LAST_AT') || 0);
  if (t <= last) t = last + 1;
  P.setProperty('LAST_AT', String(t));
  return new Date(t).toISOString();
}

function event_(who, b) {
  if (typeof b.id !== 'string' || !/^[\w-]{6,64}$/.test(b.id)) return {ok: false, error: 'bad_request', detail: 'id'};
  if (TYPES.indexOf(b.type) < 0) return {ok: false, error: 'bad_request', detail: 'type'};
  const data = JSON.stringify(b.data === undefined ? null : b.data);
  if (data.length > MAX_DATA) return {ok: false, error: 'too_large'};
  const sh = sheet_();
  // A retry after a lost reply must not append twice: the client mints the id, so look for it in
  // the recent tail (retries come within minutes; 512 rows is days of two people planning).
  const n = sh.getLastRow();
  if (n > 1) {
    const from = Math.max(2, n - 511);
    const ids = sh.getRange(from, 3, n - from + 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) if (ids[i][0] === b.id) return {ok: true, duplicate: true};
  }
  const at = stamp_();
  sh.appendRow([at, who, b.id, b.type, data]);
  PropertiesService.getScriptProperties().setProperty('ROWS', String(sh.getLastRow()));
  return {ok: true, at: at};
}

// Rows with at > since, both people, read backwards in doubling chunks so a poll costs only the
// new rows. `rev` changes when the sheet was edited by hand, which tells clients to drop their
// cache and take everything again (never their unsent queue).
function snapshot_(since) {
  const sh = sheet_(), P = PropertiesService.getScriptProperties();
  const n = sh.getLastRow();
  if (String(n) !== (P.getProperty('ROWS') || String(n))) bump_();
  P.setProperty('ROWS', String(n));
  const rows = [];
  if (n > 1) {
    let end = n, size = 256, done = false;
    while (end >= 2 && !done) {
      const start = Math.max(2, end - size + 1);
      const v = sh.getRange(start, 1, end - start + 1, COLS.length).getValues();
      for (let i = v.length - 1; i >= 0; i--) {
        if (since && String(v[i][0]) <= since) { done = true; break; }
        rows.push(v[i].map(String));
      }
      end = start - 1;
      size *= 2;
    }
    rows.reverse();
  }
  return {ok: true, now: new Date().toISOString(), rev: P.getProperty('REV') || '', rows: rows};
}

function bump_() {
  PropertiesService.getScriptProperties().setProperty('REV', String(Date.now()));
}

// Hand edits in the sheet (script writes don't fire this) change `rev`.
function onEdit() { bump_(); }

// Run by hand from the editor after fixing rows by hand, if in doubt.
function resync() { bump_(); }
