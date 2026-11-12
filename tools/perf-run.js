/* Runs tools/perf.html in headless Chrome at 4x CPU and exits non-zero unless it reports PERF PASS.
     node tools/perf-run.js              every case (CHROME=/path/to/chrome to pick the binary)
     node tools/perf-run.js --record     also print a new tools/perf-baseline.json (and write it with --write)
     node tools/perf-run.js --case=day --n=3
     node tools/perf-run.js --softgl       the map stubbed, as CI's software-GL Chrome runs it
   The tools/e2e-run.js pattern: no dependencies, Node's own fetch and WebSocket (Node 22+) talk to
   Chrome's DevTools port, python3's http.server serves the repo on its own port. The one addition is
   Emulation.setCPUThrottlingRate {rate:4} before navigating, so the gate measures what a phone
   feels. The app runs in a same-origin iframe, which shares the page's renderer and its throttle. */
'use strict';
const {spawn} = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = 8813;
if (typeof WebSocket !== 'function') { console.error('perf-run needs Node 22+ (global WebSocket)'); process.exit(2); }
const arg = k => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a == null ? null : a.includes('=') ? a.split('=')[1] : ''; };
const qs = new URLSearchParams();
if (arg('record') != null) qs.set('record', '1');
if (arg('case')) qs.set('case', arg('case'));
if (arg('n')) qs.set('n', arg('n'));
if (arg('softgl') != null) qs.set('softgl', '1');   /* as on CI: the map is a stub (tools/perf.html "software GL") */
const find = () => [process.env.CHROME, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
  .find(c => c.includes('/') ? fs.existsSync(c) : require('child_process').spawnSync('which', [c]).status === 0);
const wait = ms => new Promise(r => setTimeout(r, ms));
const kids = []; let prof = null;
/* Chrome keeps writing its profile for a moment after the kill: remove it once Chrome has exited */
const bye = code => { kids.forEach(k => { try { k.kill(); } catch (e) {} });
  setTimeout(() => { if (prof) try { fs.rmSync(prof, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch (e) {} process.exit(code); }, 800); };
process.on('SIGINT', () => bye(130)); process.on('SIGTERM', () => bye(143));

(async () => {
  const bin = find(); if (!bin) { console.error('no Chrome found; set CHROME'); bye(2); }
  kids.push(spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'}));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/tools/perf.html`)).ok) break; } catch (e) {} await wait(100); }
  prof = fs.mkdtempSync(path.join(os.tmpdir(), 'nzp-perf-'));
  const ch = spawn(bin, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + prof,
    '--window-size=1920,1200', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
  kids.push(ch);
  const port = await new Promise((res, rej) => { let buf = ''; const t = setTimeout(() => rej(new Error('Chrome did not start')), 20000);
    ch.stderr.on('data', d => { buf += d; const m = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(buf); if (m) { clearTimeout(t); res(m[1]); } }); });
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params) => new Promise(r => { const k = ++id; pending.set(k, r); ws.send(JSON.stringify({id: k, method, params})); });
  await send('Emulation.setCPUThrottlingRate', {rate: 4});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/tools/perf.html?${qs}${process.env.CI ? '&ci=1' : ''}`});
  const t0 = Date.now(); let out = '', shown = 0;
  while (Date.now() - t0 < 600000) {
    await wait(1000);
    const r = await send('Runtime.evaluate', {expression: "(document.getElementById('out')||{}).textContent||''", returnByValue: true});
    out = r.result && r.result.result && r.result.result.value || '';
    const ls = out.split('\n').filter(l => l && l !== 'PERF RUNNING');   /* stream finished lines, so a slow CI log shows progress */
    for (; shown < ls.length; shown++) if (!/^PERF (PASS|FAIL)/.test(ls[shown])) console.log(ls[shown]);
    if (/PERF (PASS|FAIL)/.test(out)) break;
  }
  const end = (out.match(/PERF (PASS|FAIL).*/) || ['PERF FAIL (timed out)'])[0];
  console.log(end);
  const b = /^BASELINE (.*)$/m.exec(out);
  if (b && arg('write') != null) { fs.writeFileSync(path.join(__dirname, 'perf-baseline.json'), JSON.stringify(JSON.parse(b[1]), null, 1) + '\n'); console.log('wrote tools/perf-baseline.json'); }
  bye(/PERF PASS/.test(end) ? 0 : 1);
})().catch(e => { console.error(e); bye(1); });
