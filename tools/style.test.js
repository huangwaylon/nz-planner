/* node tools/style.test.js — the design system (docs/DESIGN.md "Tokens", "Class contract"; docs/WORKFLOW.md
   "Type and colour system"). Every planner*.css rule uses the tokens defined once on `.v-plan,.pl-layer`
   (the first such rule in planner.css, "the token block"), and nothing else:
   - type: font-size var(--pl-fs-*), line-height var(--pl-lh-*), family var(--pl-font), weights 400 / 600;
   - colour: no literal; only the WORKFLOW palette (--ink --muted --line --bg --surface --acc --pl-warn,
     the tint, and the map and day-marker tokens); day hues never as text; the retired tokens nowhere;
   - spacing (padding, margin, gap, inset, top/right/bottom/left): tokens, 0, auto, %, env(), 1px — no other
     px literal, and no negative margin except the optical icon offset calc((var(--pl-i-*) - var(--pl-h-*))/2);
   - radius var(--pl-r-*), 50% or 0; box-shadow none | var(--pl-e-1) | var(--pl-e-2) (the two elevations);
   - sizes: icons (.ic, .pl-ico) are 16 / 20 / 24 through var(--pl-i-*); any other px width or height sits
     on the 4 px grid (1–3 px hairlines and bars aside);
   - motion: durations var(--pl-t-*), transitions name only transform / opacity / translate / scale /
     visibility, will-change only on the drag classes, and a prefers-reduced-motion block exists.
   It also reports the CSS rules for classes no *.js or index.html emits (dead rules), and the contract
   classes with no rule. Contract gaps fail; dead rules fail once DEAD_FAILS is true (set when the JS
   migration to the class contract is done; `--strict` forces it).
   With --count it prints the distinct values per property instead (for the audit's before/after table). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(ROOT).filter(f => /^planner.*\.css$/.test(f)).sort();
const COUNT = process.argv.includes('--count');
const DEAD_FAILS = false || process.argv.includes('--strict');

const NAMED = /\b(white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|brown|navy|teal|maroon|olive|lime|aqua|fuchsia)\b/i;
const LIT = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/i;
/* the colour vocabulary: WORKFLOW's list, the tint, the day hue (--c / --day / --dN, markers only) and the map's own */
const COLOURS = new Set(['ink', 'muted', 'line', 'bg', 'surface', 'acc', 'pl-warn', 'pl-tint', 'c', 'day', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6',
  'map-sea', 'pl-land', 'pl-coast', 'pl-scrim', 'pl-hair', 'pl-e-1', 'pl-e-2', 'pl-focus']);
const RETIRED = /var\(--(acc2[\w-]*|eyebrow|pl-good[\w-]*|pl-warn-soft|acc-soft|acc-ring|line-2|line-strong|ci|pl-ink-a|pl-shadow|pl-on-photo|pl-d\d-ink|faint|ink-2)\b/;
const COLOUR_PROPS = /^(color|background(-color)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|caret-color|accent-color|text-decoration(-color)?|column-rule)$/;
const SPACE_PROPS = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-padding|scroll-margin)(-[a-z-]+)?$/;
const SIZE_PROPS = /^(width|height|min-width|min-height|max-width|max-height|flex-basis|inline-size|block-size)$/;
const TRANSITIONABLE = /^(transform|opacity|translate|scale|rotate|visibility|none|all 0s)$/;
const DRAG_SEL = /pl-(drag|lift|dgh|swip|sorting|grab)|is-(drag|lift|sort)/;

let fails = 0, warns = 0, n = 0;
const vals = {};
const keep = (k, v) => (vals[k] = vals[k] || new Set()).add(v);
const bad = (f, sel, m) => { fails++; console.log(`FAIL ${f}: ${m}   [${sel.trim().slice(0, 70)}]`); };
const warn = m => { warns++; console.log('warn ' + m); };
const parts = v => v.split(/\s+(?![^(]*\))/).filter(Boolean);
const pxIn = v => [...v.replace(/var\([^)]*\)/g, '').matchAll(/(-?[\d.]+)px/g)].map(m => +m[1]);
let reducedMotion = false;

/* the rules of one file, flattened through @container / @media / @supports, with their at-rule context */
function rules(css) {
  const out = []; let i = 0;
  (function walk(ctx, end) {
    let buf = '';
    while (i < end) {
      const ch = css[i];
      if (ch === '{') {
        const head = buf.trim(); buf = ''; i++;
        let depth = 1, j = i; while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
        if (head.startsWith('@')) { walk(ctx.concat(head), j - 1); i = j; }
        else { out.push({sel: head, body: css.slice(i, j - 1), ctx}); i = j; }
      } else { buf += ch; i++; }
    }
  })([], css.length);
  return out;
}

const cssClasses = new Map();   /* class -> [file] */
for (const f of files) {
  const css = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/prefers-reduced-motion\s*:\s*reduce/.test(css)) reducedMotion = true;
  let tokenBlockSeen = false;
  for (const r of rules(css)) {
    for (const m of r.sel.matchAll(/\.(pl-[\w-]+)/g)) { const a = cssClasses.get(m[1]) || []; if (!a.includes(f)) a.push(f); cssClasses.set(m[1], a); }
    const isTokens = f === 'planner.css' && !tokenBlockSeen && r.sel.replace(/\s/g, '') === '.v-plan,.pl-layer' && /--pl-s-1\s*:/.test(r.body);
    if (isTokens) { tokenBlockSeen = true; continue; }
    const reduced = r.ctx.some(c => /prefers-reduced-motion/.test(c));
    for (const m of r.body.matchAll(/([a-z-]+)\s*:\s*([^;]+)/gi)) {
      const prop = m[1].toLowerCase(), v = m[2].replace(/!important/, '').trim(); n++;
      const B = msg => bad(f, r.sel, msg);
      if (prop.startsWith('--')) {
        if (LIT.test(v) || NAMED.test(v)) B(`colour literal in a custom property outside the token block: ${prop}:${v}`);
        if (RETIRED.test(v)) B(`retired token: ${prop}:${v}`);
        continue;
      }
      if (RETIRED.test(v)) B(`retired token: ${prop}:${v}`);
      /* type */
      if (prop === 'font-size') { keep('font-size', v); if (!/^var\(--pl-fs-(s|m|l|xl|d)\)$/.test(v)) B(`font-size ${v}`); }
      else if (prop === 'line-height') { keep('line-height', v); if (!/^(var\(--pl-lh-[a-z]+\)|inherit|0)$/.test(v)) B(`line-height ${v}`); }
      else if (prop === 'font-family') { if (!/^(var\(--pl-font\)|inherit)$/.test(v)) B(`font-family ${v}`); }
      else if (prop === 'font-weight') { if (!/^(400|600|inherit)$/.test(v)) B(`font-weight ${v}`); }
      else if (prop === 'font') {
        if (/^inherit$/.test(v)) continue;
        const sz = v.match(/(var\(--[\w-]+\)|[\d.]+(?:px|rem|em|%))(?:\/(\S+))?\s+(.+)$/);
        if (!sz) { B(`font shorthand not understood: ${v}`); continue; }
        keep('font-size', sz[1]); if (sz[2]) keep('line-height', sz[2]);
        if (!/^var\(--pl-fs-(s|m|l|xl|d)\)$/.test(sz[1])) B(`font size ${sz[1]} in "${v}"`);
        if (sz[2] && !/^var\(--pl-lh-[a-z]+\)$/.test(sz[2])) B(`line height ${sz[2]} in "${v}"`);
        if (sz[3].trim() !== 'var(--pl-font)') B(`font family ${sz[3]} in "${v}"`);
        const w = v.slice(0, sz.index).trim().split(/\s+/).filter(x => /^\d+$/.test(x));
        if (w.some(x => x !== '400' && x !== '600')) B(`font weight ${w} in "${v}"`);
      }
      else if (prop === 'letter-spacing') { if (!/^(0|normal|-\.01em|-\.02em)$/.test(v)) B(`letter-spacing ${v} (0, -.01em or -.02em)`); }
      /* colour */
      if (LIT.test(v) || (NAMED.test(v) && !/url\(|content|grid-template|transition|will-change/.test(prop))) B(`colour literal: ${prop}:${v}`);
      if (COLOUR_PROPS.test(prop) || prop === 'box-shadow') {
        for (const c of v.matchAll(/var\(--([\w-]+)/g)) if (!COLOURS.has(c[1]) && !/^(pl-(s|r|e|i|h|t|lh|fs|bar|gut|m)-?|[a-z])$|^pl-(s|r|e|i|h|t|lh|fs|m)-/.test(c[1])) B(`colour token --${c[1]} is not in the palette: ${prop}:${v}`);
        if (COLOUR_PROPS.test(prop)) keep(prop === 'color' ? 'color' : 'fill', v);
      }
      if (prop === 'color' && /var\(--(d\d|c|day)\)/.test(v)) B(`a day hue as text: ${prop}:${v}`);
      /* spacing */
      if (SPACE_PROPS.test(prop)) {
        parts(v).forEach(x => keep(prop.replace(/-.*/, ''), x));
        const px = pxIn(v).filter(x => x !== 0 && Math.abs(x) !== 1);
        if (px.length) B(`off-scale ${prop}:${v} (use --pl-s-*)`);
        if (/^margin/.test(prop) && /(^|\s|\()-(?:[\d.]|var)/.test(v) && !/^calc\(\(var\(--pl-i-[sml]\) - var\(--pl-h-[sml]\)\)\s*\/\s*2\)$/.test(v.replace(/^0\s+/, '').trim()))
          B(`negative margin ${prop}:${v} (only the optical icon offset is allowed)`);
      }
      /* radius */
      if (prop === 'border-radius' || /^border-[a-z-]+-radius$/.test(prop)) {
        parts(v).forEach(x => keep('border-radius', x));
        if (!parts(v.replace(/\//g, ' ')).every(x => /^(var\(--pl-r-(1|2|3|pill)\)|50%|0)$/.test(x))) B(`radius ${v} (use --pl-r-*)`);
      }
      /* elevation */
      if (prop === 'box-shadow') { keep('box-shadow', v); if (!/^(none|var\(--pl-e-[12]\))$/.test(v)) B(`box-shadow ${v} (only none, var(--pl-e-1), var(--pl-e-2); rings are outline)`); }
      /* sizes */
      if (SIZE_PROPS.test(prop)) {
        const icon = /\.(ic|pl-ico(--\d+)?)\b(?![\w-])/.test(r.sel.split(',').map(s => s.trim().split(/\s+/).pop()).join(' '));
        if (icon && /^(width|height)$/.test(prop)) { keep('icon', v); if (!/^(var\(--pl-i-[sml]\)|16px|20px|24px|auto|100%)$/.test(v)) B(`icon size ${v} (16 / 20 / 24 via --pl-i-*)`); }
        else if (pxIn(v).some(x => x > 3 && x % 4)) B(`size off the 4 px grid: ${prop}:${v}`);
      }
      /* motion */
      if (/^(transition|animation)(-duration)?$/.test(prop)) {
        const d = v.match(/(^|[\s,])[\d.]+m?s\b/g); if (d && !(reduced && /^0m?s$/.test(d[0].trim()))) B(`duration literal ${prop}:${v} (use --pl-t-*)`);
        (v.match(/var\(--pl-t-\d\)/g) || []).forEach(x => keep('duration', x));
      }
      if (prop === 'transition' || prop === 'transition-property') {
        v.split(/,(?![^(]*\))/).map(s => s.trim().split(/\s+/)[0]).forEach(p => { if (!TRANSITIONABLE.test(p) && !/^var\(--pl-t/.test(p)) B(`transition on ${p} (transform and opacity only)`); });
      }
      if (prop === 'will-change' && !DRAG_SEL.test(r.sel)) B(`will-change outside a drag class: ${v}`);
    }
  }
  if (f === 'planner.css' && !tokenBlockSeen) bad(f, '', 'no token block (.v-plan,.pl-layer{…--pl-s-1…}) found');
}
if (!reducedMotion) bad('*', '', 'no prefers-reduced-motion block');

if (COUNT) { for (const k of Object.keys(vals).sort()) console.log(`${k.padEnd(14)} ${String(vals[k].size).padStart(3)}  ${[...vals[k]].join(' | ').slice(0, 400)}`); process.exit(0); }

/* ---- the class contract: dead rules and gaps ---- */
const emitters = fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && f !== 'sw.js').concat(['index.html']);
const src = emitters.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const used = new Set(src.match(/\bpl-[\w-]*[a-z0-9]/gi));
/* classes the JS builds from a prefix ('pl-btn--'+v, `pl-ico--${n}`): a variant counts as emitted when its
   suffix appears as a quoted word anywhere in the JS (BTN('primary', …), ic(n,'24')) */
const prefixes = new Set([...src.matchAll(/\b(pl-[a-z]+(?:--|__))(?=['"`]?\s*(?:\+|\$\{|'|"))/g)].map(m => m[1]));
const quoted = new Set([...src.matchAll(/['"`]([\w-]+)['"`]/g)].map(m => m[1]));
const emitted = c => used.has(c) || [...prefixes].some(p => c.startsWith(p) && quoted.has(c.slice(p.length)));
/* classes the CSS styles that no script writes: state the browser adds is not a class, so this is exact */
const dead = [...cssClasses].filter(([c]) => !emitted(c));
for (const [c, fs_] of dead) { if (DEAD_FAILS) { fails++; console.log(`FAIL dead rule: .${c} (${fs_.join(', ')}) — no *.js or index.html emits it`); } else warn(`dead rule: .${c} (${fs_.join(', ')})`); }
const CONTRACT = ['pl-btn', 'pl-btn--primary', 'pl-btn--secondary', 'pl-btn--ghost', 'pl-btn--icon', 'pl-btn--s', 'pl-btn--l',
  'pl-chip', 'pl-chip--filter', 'pl-chip--choice', 'pl-seg', 'pl-field', 'pl-field__clear',
  'pl-row', 'pl-row__media', 'pl-row__body', 'pl-row__title', 'pl-row__meta', 'pl-row__trail',
  'pl-card', 'pl-card__media', 'pl-card__body', 'pl-card__title', 'pl-card__signal', 'pl-tier',
  'pl-sheet', 'pl-sheet__head', 'pl-sheet__title', 'pl-sheet__close', 'pl-sheet__body', 'pl-sheet__foot',
  'pl-toast', 'pl-toast__text', 'pl-badge', 'pl-badge--warn', 'pl-stat', 'pl-dayhead', 'pl-marker',
  'pl-empty', 'pl-empty__media', 'pl-empty__text', 'pl-actionbar', 'pl-ico', 'pl-ico--16', 'pl-ico--20', 'pl-ico--24'];
for (const c of CONTRACT) if (!cssClasses.has(c)) bad('contract', '', `.${c} has no rule`);
/* the other direction: a contract-style class (block__part or block--mod) the JS writes with no rule */
const unstyled = [...used].filter(c => /__|--/.test(c) && /^pl-[a-z]+(__|--)[a-z0-9]+$/.test(c) && !cssClasses.has(c) && !/^pl-(d\d|fs|lh|s|r|e|i|h|t)-/.test(c));
if (unstyled.length) warn(`JS classes with no rule: ${unstyled.map(c => '.' + c).join(' ')}`);

console.log(fails ? `${fails} style problems in ${files.length} files` : `style ok: ${files.length} files, ${n} declarations` + (warns ? `, ${warns} warnings (${dead.length} dead rules)` : ''));
process.exit(fails ? 1 : 0);
