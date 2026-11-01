/* Runs tools/e2e.html in headless Chrome and exits non-zero unless it reports E2E PASS.
     node tools/e2e-run.js            (CHROME=/path/to/chrome to pick the binary)
   No dependencies: Node's own fetch and WebSocket (Node 22+) talk to Chrome's DevTools port, and
   python3's http.server serves the repo, as in local testing. Real time, not virtual time, because
   the planner renders and animates on requestAnimationFrame. */
'use strict';
const {spawn} = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = 8799;
if (typeof WebSocket !== 'function') { console.error('e2e-run needs Node 22+ (global WebSocket)'); process.exit(2); }
const find = () => [process.env.CHROME, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
  .find(c => c.includes('/') ? fs.existsSync(c) : require('child_process').spawnSync('which', [c]).status === 0);
const wait = ms => new Promise(r => setTimeout(r, ms));
const kids = [];
const bye = code => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(code); };

(async () => {
  const bin = find(); if (!bin) { console.error('no Chrome found; set CHROME'); bye(2); }
  kids.push(spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {cwd: ROOT, stdio: 'ignore'}));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/tools/e2e.html`)).ok) break; } catch (e) {} await wait(100); }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'nzp-e2e-'));
  const ch = spawn(bin, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + prof,
    '--window-size=1200,1000', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
  kids.push(ch);
  const port = await new Promise((res, rej) => { let buf = ''; const t = setTimeout(() => rej(new Error('Chrome did not start')), 20000);
    ch.stderr.on('data', d => { buf += d; const m = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(buf); if (m) { clearTimeout(t); res(m[1]); } }); });
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params) => new Promise(r => { const k = ++id; pending.set(k, r); ws.send(JSON.stringify({id: k, method, params})); });
  /* E2E_CPU=4 node tools/e2e-run.js slows the CPU to shake out timing races before CI finds them */
  if (+process.env.E2E_CPU > 1) await send('Emulation.setCPUThrottlingRate', {rate: +process.env.E2E_CPU});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/tools/e2e.html`});
  const t0 = Date.now(); let out = '';
  while (Date.now() - t0 < 150000) {
    await wait(500);
    const r = await send('Runtime.evaluate', {expression: "(document.getElementById('out')||{}).textContent||''", returnByValue: true});
    out = r.result && r.result.result && r.result.result.value || '';
    if (/E2E (PASS|FAIL)/.test(out)) break;
  }
  console.log(out || 'E2E: no output');
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch (e) {}
  bye(/E2E PASS/.test(out) ? 0 : 1);
})().catch(e => { console.error(e); bye(1); });
