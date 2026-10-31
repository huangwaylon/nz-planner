/* planner-cal.js test: node tools/cal.test.js (no dependencies).
   Runs the classic script in a vm with a fake element that only stores innerHTML and listeners,
   then reads the rendered HTML string back: the calendar maths, the weekday labels on trip
   cells, the versions grid's 「＝同じ」 dimming, and that each callback gets the right date. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cal-model.json'), 'utf8'));

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };

const docL = {};
const document = {documentElement: {lang: 'ja'}, addEventListener: (t, f) => { docL[t] = f; }};
const ctx = {document, planner: function () {}, Set, Date, Object, String, Math};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'planner-cal.js'), 'utf8'), ctx);
const cal = ctx.planner.cal;

function fakeEl() {
  const L = {};
  return {innerHTML: '', isConnected: true, classes: [], classList: {add(c) { this.owner.classes.push(c); }},
    addEventListener(t, f) { L[t] = f; }, L};
}
/* every element with data-act in the HTML, as {tag, attrs} with the dataset the browser would give */
function buttons(html) {
  return [...html.matchAll(/<button([^>]*)>/g)].map(m => {
    const a = {}; for (const x of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2];
    const dataset = {}; for (const k in a) if (k.startsWith('data-')) dataset[k.slice(5)] = a[k];
    return {a, dataset, at: m.index};
  });
}
/* a click on b: e.target.closest(sel) finds b itself when it has the attribute */
const click = (el, b) => !b ? ok(false, 'clicked a cell that is not there') : el.L.click({target: {closest: s => s === '[data-act]' && b.dataset.act ? {dataset: b.dataset} : null}});

/* 1. the calendar maths: Feb 2027 starts on a Monday, weeks run Sunday to Saturday */
const W = cal.weeks('2027-02-11');
ok(new Date('2027-02-01T00:00Z').getUTCDay() === 1, 'Feb 1 2027 is a Monday');
ok(W[0][0] === '2027-01-31' && W[0][1] === '2027-02-01', `the first week starts Sun Jan 31, then Mon Feb 1: ${W[0].slice(0, 2)}`);
ok(W.length === 5 && W.every(w => w.length === 7), `5 weeks of 7: ${W.map(w => w.length)}`);
ok(W.every(w => new Date(w[0] + 'T00:00Z').getUTCDay() === 0), 'every week starts on a Sunday');
ok(W[4][0] === '2027-02-28' && W[4][6] === '2027-03-06', `the last week is Feb 28 to Mar 6: ${W[4][0]}..${W[4][6]}`);
ok(cal.weeks('2026-11-05')[0][0] === '2026-11-01', 'a month that starts on a Sunday has no leading days');

/* 2. the month view */
const el = fakeEl(); el.classList.owner = el;
const got = [];
const opts = {onDay: d => got.push(['day', d]), onDropStop: (d, p) => got.push(['drop', d, p]),
  onUseVersion: id => got.push(['use', id]), onTakeDay: (id, d) => got.push(['take', id, d])};
cal.render(el, model, opts);
const H = el.innerHTML, mo = H.slice(H.indexOf('<table class="pl-cal-mo"'));
ok(el.classes.includes('pl-cal'), 'render() marks the element .pl-cal (its container)');
const heads = [...mo.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map(m => m[1]).join('');
ok(heads === '日月火水木金土', `Sunday-first columns: ${heads}`);
ok(/<th scope="col" class="pl-cal-we">日<\/th>/.test(mo) && /<th scope="col" class="pl-cal-we">土<\/th>/.test(mo) &&
   !/class="pl-cal-we">月/.test(mo), 'weekend headers are bold (.pl-cal-we), weekdays are not');
const want = {'2027-02-11': '木', '2027-02-12': '金', '2027-02-13': '土', '2027-02-14': '日', '2027-02-15': '月', '2027-02-16': '火'};
const mb = buttons(mo).filter(b => b.dataset.act === 'day');
ok(mb.length === 6, `six trip cells in the grid: ${mb.length}`);
for (const b of mb) {
  const tail = mo.slice(b.at, mo.indexOf('</button>', b.at));
  const w = (tail.match(/<b class="pl-cal-n">(\d+)<\/b><span[^>]*>([^<]+)</) || []).slice(1).join(' ');
  ok(w === +b.dataset.date.slice(8) + ' ' + want[b.dataset.date], `${b.dataset.date} reads "${w}", want "${+b.dataset.date.slice(8)} ${want[b.dataset.date]}"`);
  ok(b.dataset.drop === 'day', `${b.dataset.date} is a drop target (data-drop="day")`);
}
{ const sat = mb.find(b => b.dataset.date === '2027-02-13');
  ok(sat.a['aria-label'] === '2月13日 土曜日, 4か所, 注意1', `VoiceOver label: ${sat.a['aria-label']}`);
  // Feb 11 is in the second row (row 1), the Thursday column (4); Feb 14 is row 2, column 0
  ok(sat.dataset.r === '1' && sat.dataset.c === '6', `Feb 13 sits at row 1, column 6: ${sat.dataset.r},${sat.dataset.c}`);
  ok(mb.find(b => b.dataset.date === '2027-02-14').dataset.c === '0', 'Feb 14 is a Sunday, column 0'); }
const folds = [...mo.matchAll(/<tr class="pl-cal-fold"><td colspan="7">([^<]*)/g)].map(m => m[1]);
ok(folds.length === 2 && folds[0].startsWith('2月1–6日') && folds[1].startsWith('2月21–28日'), `trip-free weeks fold to one line each: ${folds}`);
ok(folds[0].includes('6 土 ワイタンギ・デー'), `the first fold names Waitangi Day: ${folds[0]}`);
ok(/<td class="pl-cal-q"><span>8<\/span><small>ワイタンギ・デー振替休日<\/small>/.test(mo), 'Mon Feb 8 is a quiet cell with the observed holiday');
ok(/<span class="pl-cal-we">20<\/span><small>ランタン祭り/.test(mo), 'Sat Feb 20: bold numeral, Lantern Festival');
ok(!/style="[^"]*--d\d[^"]*"[^>]*class="pl-cal-q/.test(mo), 'quiet days carry no day colour');
ok(/<ol class="pl-cal-ls" data-g>/.test(H) && buttons(H.slice(0, H.indexOf('</ol>'))).length === 6, 'the phone list holds the six trip days');
ok(/~19:28<\/i> <i><span class="pl-cal-lim">\/ 返車 20:30/.test(H), 'Feb 16 shows its end against the 20:30 car return');

/* 3. callbacks */
got.length = 0;
click(el, mb.find(b => b.dataset.date === '2027-02-14'));
ok(JSON.stringify(got) === '[["day","2027-02-14"]]', `a trip cell opens ② on its day: ${JSON.stringify(got)}`);
got.length = 0;
el.L['pl-drop']({target: {closest: s => s === '[data-drop]' ? {dataset: {date: '2027-02-15'}} : null}, detail: {id: 'piha'}});
ok(JSON.stringify(got) === '[["drop","2027-02-15",{"id":"piha"}]]', `a drop calls onDropStop(date, payload): ${JSON.stringify(got)}`);

/* 4. the versions grid */
const ve = fakeEl(); ve.classList.owner = ve;
cal.renderVersions(ve, model, opts);
const V = ve.innerHTML, vb = buttons(V);
const cell = (v, d) => vb.find(b => b.dataset.v === v && b.dataset.date === d);
const hut = model.versions.find(v => v.id === 'hut'), classic = model.versions.find(v => v.id === 'classic');
const sameDays = model.days.map(d => d.date).filter(d => hut.days[d].stops.join('|') === classic.days[d].stops.join('|'));
ok(sameDays.join() === '2027-02-11,2027-02-12,2027-02-15', `the fixture's hut matches classic on 11, 12, 15: ${sameDays}`);
ok((V.match(/<td class="pl-cal-same">＝同じ<\/td>/g) || []).length === sameDays.length, 'one 「＝同じ」 per equal cell, and no more');
sameDays.forEach(d => ok(!cell('hut', d), `hut ${d} is dimmed, not a button`));
ok(cell('hut', '2027-02-13') && cell('hut', '2027-02-13').dataset.act === 'take', 'a different cell (hut, Feb 13) offers この日だけ取り込む');
ok(cell('classic', '2027-02-11').dataset.act === 'day', 'the active version is never dimmed; its cells open ②');
ok(V.indexOf('タラナキ王道') < V.indexOf('ポウアカイ小屋泊') && /タラナキ王道<small>使用中/.test(V), 'the active version leads and is marked 使用中');
ok(/運転 17:02 · <b class="pl-cal-w">⚠︎2<\/b> · 絶対 8\/9/.test(V), 'the totals row: drive, ⚠ and 絶対 coverage');
ok(!vb.some(b => b.dataset.act === 'use' && b.dataset.v === 'classic') && vb.filter(b => b.dataset.act === 'use').length === 2, 'この案にする on each version but the active one');
{ // with no active version pinned, nothing dims
  const m2 = Object.assign({}, model, {versions: model.versions.map(v => Object.assign({}, v, {active: false}))});
  const e2 = fakeEl(); e2.classList.owner = e2; cal.renderVersions(e2, m2, {});
  ok(!/pl-cal-same/.test(e2.innerHTML), 'no active version: no cell dims'); }
got.length = 0;
click(ve, cell('cafes', '2027-02-14'));
click(ve, cell('classic', '2027-02-16'));
click(ve, vb.find(b => b.dataset.act === 'use' && b.dataset.v === 'cafes'));
ok(JSON.stringify(got) === '[["take","cafes","2027-02-14"],["day","2027-02-16"],["use","cafes"]]', `version callbacks: ${JSON.stringify(got)}`);

/* 5. language: langchange re-renders every mounted element */
document.documentElement.lang = 'en'; docL.langchange();
ok(/February 2027/.test(el.innerHTML) && /<th scope="col" class="pl-cal-we">Sun<\/th>/.test(el.innerHTML), 'langchange re-renders the month in English');
ok(buttons(el.innerHTML).find(b => b.dataset.date === '2027-02-13').a['aria-label'] === 'Saturday 13 February, 4 stops, 1 warning', 'English VoiceOver label');
ok(/Take this day/.test(ve.innerHTML) && /= same/.test(ve.innerHTML), 'and the versions grid');

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
