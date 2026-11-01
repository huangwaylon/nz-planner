/* node tools/style.test.js — the type and colour system (docs/WORKFLOW.md "Type and colour system").
   Every planner*.css rule uses the tokens only:
   - font sizes are var(--pl-fs-s|m|l|xl|d), families var(--pl-font), weights 400 or 600
     (in `font:` shorthands too; `font:inherit` is a reset and allowed);
   - no colour literal (#hex, rgb()/hsl() with figures, a named colour) outside the token block,
     the first `.v-plan,.pl-layer{…}` rule of planner.css;
   - day hues (--dN) and the retired --pl-dN-ink are never a text colour.
   With --count it prints the distinct sizes and colour literals instead (for the audit). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(ROOT).filter(f => /^planner.*\.css$/.test(f)).sort();
const COUNT = process.argv.includes('--count');
const NAMED = /\b(white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|brown|navy|teal|maroon|olive|lime|aqua|fuchsia)\b/i;
const LIT = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/i;
let fails = 0, n = 0;
const sizes = new Set(), colours = new Set();
const bad = (f, m) => { fails++; console.log('FAIL ' + f + ': ' + m); };
for (const f of files) {
  let css = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /* the token block: definitions live here and nowhere else */
  if (f === 'planner.css') { const i = css.indexOf('.v-plan,.pl-layer{'), j = css.indexOf('}', i); if (i >= 0) css = css.slice(0, i) + css.slice(j + 1); }
  for (const m of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const prop = m[1].toLowerCase(), v = m[2].trim(); n++;
    if (prop.startsWith('--')) { if (LIT.test(v) || NAMED.test(v)) { colours.add(v.match(LIT) ? v.match(LIT)[0] : v.match(NAMED)[0]); if (!COUNT) bad(f, `colour literal in a custom property outside the token block: ${prop}:${v}`); } continue; }
    if (prop === 'font-size') { sizes.add(v); if (!/^var\(--pl-fs-(s|m|l|xl|d)\)$/.test(v)) bad(f, `font-size ${v}`); }
    else if (prop === 'font-family') { if (!/^(var\(--pl-font\)|inherit)$/.test(v)) bad(f, `font-family ${v}`); }
    else if (prop === 'font-weight') { if (!/^(400|600|inherit)$/.test(v)) bad(f, `font-weight ${v}`); }
    else if (prop === 'font') {
      if (/^inherit$/.test(v)) continue;
      const sz = v.match(/(var\(--[\w-]+\)|[\d.]+(?:px|rem|em|%))(?:\/[^\s]+)?\s+(.+)$/);
      if (!sz) { bad(f, `font shorthand not understood: ${v}`); continue; }
      sizes.add(sz[1]);
      if (!/^var\(--pl-fs-(s|m|l|xl|d)\)$/.test(sz[1])) bad(f, `font size ${sz[1]} in "${v}"`);
      if (sz[2].trim() !== 'var(--pl-font)') bad(f, `font family ${sz[2]} in "${v}"`);
      const w = v.slice(0, sz.index).trim().split(/\s+/).filter(x => /^\d+$/.test(x));
      if (w.some(x => x !== '400' && x !== '600')) bad(f, `font weight ${w} in "${v}"`);
    }
    if (LIT.test(v) || (NAMED.test(v) && !/url\(|content/.test(prop))) { colours.add((v.match(LIT) || v.match(NAMED))[0]); if (!COUNT) bad(f, `colour literal: ${prop}:${v}`); }
    if (prop === 'color' && /var\(--(d\d|pl-d\d-ink)\)/.test(v)) bad(f, `a day hue as text: ${prop}:${v}`);
    if (/var\(--pl-d\d-ink\)/.test(v)) bad(f, `retired --pl-dN-ink: ${prop}:${v}`);
  }
}
if (COUNT) { console.log('distinct font sizes ' + sizes.size + ': ' + [...sizes].join(' ')); console.log('distinct colour literals ' + colours.size + ': ' + [...colours].join(' ')); process.exit(0); }
console.log(fails ? `${fails} style problems in ${files.length} files` : `style ok: ${files.length} files, ${n} declarations`);
process.exit(fails ? 1 : 0);
