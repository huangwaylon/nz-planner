# FOLD.md: built to be folded into travel-plans

nz-planner is a proof of concept. Its end state is **one more tab in a book** of
`../travel-plans/index.html` (the NZ book first; any book later). Every rule below exists so that
folding it in means copying files and adding a few lines, with no rewrite. Read `../travel-plans/CLAUDE.md`;
its conventions win over anything here.

## 1. Shape: a module, not an app
- All behaviour is one function, **`planner(g)`**. It takes a `.guide` element and returns early
  when `g.querySelector('.v-plan')` is absent, like `packing(g)` and `map(g)`. Folding in means
  adding one call to the book's GUIDES loop: `today(g); campFilter(g); packing(g); map(g); planner(g);`.
- Everything is scoped by `g.dataset.guide` (the slug: `nz`). Nothing is a document-level singleton
  except what the book already makes global (language, units).
- The POC's `index.html` mimics the book's shell, so the module runs unchanged in both:
  `<html data-place="nz" class="js-tabs" lang="ja">` → `<article class="guide t-nz" data-guide="nz">`
  → `<div class="views"><section class="view v-plan">…</section></div>`. A tab radio
  `t-plan` (`name="tab-nz"`) can be added at fold time.
- Plain classic scripts: no `import`/`export`, no build, no dependencies, no CDN. Modern syntax that
  iOS 16 Safari runs is fine.

## 2. What it may assume from the host
Only what the book already provides. The POC ships **`host.js`**, a shim with *identical* names
and signatures, and it is dropped at fold time:
- `LS.get(key)` / `LS.set(key, value)`: the try/catch localStorage wrapper. Never touch
  `localStorage` directly.
- The current language is `document.documentElement.lang` (`ja`|`en`). The module listens for
  `document` `langchange` and re-labels itself.
- Static markup is translated by the book's sweep: markup in one language, the other in `data-en` /
  `data-ja`. Runtime strings live in a planner-local table `PT = {key:{ja,en}}`, read through
  `pt(key)`, because the book's `T()` is private to its scripts. At fold time `PT` merges into the
  book's table.
- Distances use `<span class="u" data-metric="11.5 km" data-imperial="7 mi">11.5 km</span>`. The
  book's units module swaps them; `host.js` has a minimal stand-in.
- Icons are `<svg class="ic"><use href="#i-name"/></svg>`, with each id from the book's sprite. A
  needed icon the book lacks goes in the POC's sprite with the book's stroke style, and gets copied over.

## 3. Styling
- **Theme tokens only.** Read `--bg --bg-2 --surface --surface-2 --surface-3 --line --line-2
  --line-strong --ink --ink-2 --muted --faint --acc --acc-d --acc-soft --acc-ring --acc2 --acc2-soft
  --map-sea --d1…--d6 --shell`. No hex colour inside planner rules.
- Planner-only tokens are `--pl-*`, each with a default on `.v-plan`, so a theme that omits one
  still renders.
- Day colour = `--d<n>`, the same rule as the book's map, so a day is the same colour in both tabs.
- **Every selector is scoped** under `.v-plan` (or the `pl-` class prefix for overlays and sheets
  appended to `body`). No global resets, no bare element selectors, and no reuse of a book class name
  with a different meaning.
- POC-only chrome (a plan switcher header, demo theme) lives in `poc.css`, which does not fold.
- Book rules apply: hit areas ≥44×44 (a `::before` pad where visuals are smaller),
  `-webkit-touch-callout:none` on tappables, `100dvh` with `100vh` first, prefers-reduced-motion.

## 4. The map
- Same projection, frame (lat −40.45…−34.30, lon 172.40…178.90, 692×824) and land paths as
  `.map/nz.py`. The basemap comes out of the book's generator. `tools/basemap.py` extracts the
  same `<g class="land">`, so the planner pin at a given lat/lon lands on the book's pixel.
- Same mechanics: the `viewBox` holds the zoom, `--z` holds stroke and pin size, writes are
  coalesced per frame, the screen is measured once per gesture, and `getScreenCTM()` turns screen
  points into map units. Pins are not focusable; the list is the keyboard path.
- The planner draws its own `<svg class="map">` inside `.v-plan` for now. Merging it with the
  book's `v-map` is a post-fold decision.

## 5. Data and storage
- Per-book data lives under `data/<slug>/`: `places.json`, `plans.json`, `travel.json`. The book
  folds them in as files cached in its `SHELL` (or `media`, if large and stable).
- Places are bilingual in-record (`name`/`nameJa`, `vibe`/`vibeJa`), like the packing model.
- localStorage keys go through `LS`, namespaced by book: `plan:<slug>` (the edited plans, history,
  snapshots), `plan-ui:<slug>`. No other keys. Versioned `{v:1,…}`, and a saved model wins over the
  seed, exactly as with `packingData:<slug>`.
- Ids come from a module-local `uid()` (the book's pattern), with the slug inside DOM ids.
- No private data: place ids, minutes and HH:MM times only. The base is the suburb of New Lynn.

## 6. Offline
- The POC has its own `sw.js`, a copy of the book's (versioned `SHELL`, refresh banner). At fold
  time the planner's files join the book's `SHELL` list and this worker is deleted.
- The drive-time matrix loads lazily after first render. Until it arrives, distances are
  haversine estimates marked `≈`.

## 7. Sync (phase 2)
- Sync is the Sheet plus Apps Script contract in `ARCH.md`. It is a separate `plansync` object the
  module calls through two functions (`push(day)`, `pull()`), so the book can adopt it, or ship
  without it, with no change to `planner(g)`.

## Fold checklist (for later)
The planner is one module plus four files it loads on demand. All are classic scripts that add
no new globals beyond `planner` (with `planner.sim`, `planner.more`, `planner.swapRank`),
`plimport` (with `plimport.ui`) and `plstory`.

| File | Loaded | Role |
|---|---|---|
| `planner.js` | with the book | `planner(g)`, the day simulation (`planner.sim`) |
| `planner.css` | with the book | every rule under `.v-plan` / `pl-`; layout by `@container plan` (`.v-plan{container:plan/inline-size}`), never by the window |
| `planner-collect.js` + `planner-collect.css` | ① opens (or the last stage was ①) | `planner.collect(ctx)`: tiers, groups, the bulk bar; ≤7.5 KB gz |
| `planner-desk.js` + `planner-desk.css` | the planner itself is ≥1024 wide, after paint (never a phone; not in sw.js APP) | `planner.desk(ctx)`: palette, 6-day board, drag controller, hover; ≤6.5 KB gz |
| `planner-more.js` + `planner-more.css` + `data/nz/groups.json` | the first touch (prefetched), or any sheet | `planner.more(ctx)`: candidates, place, plans, move, order, swap, compare, version name, share and paste |
| `import.js` + `planner-import.js` + `planner-import.css` | the 取り込む sheet | parsers (`plimport.gm/ig`), the sheet (`plimport.ui`) and its styles |
| `story.js` | 「ストーリー画像」 | `plstory.open(model, g)`; the model carries `guide` and `slug` |
| `data/nz/*.json`, `land-lo.svg.html` → `land.svg.html` | boot (light coast) and idle (full coast, `places-more.json`: vibe, kw, ig, igTag; `flags.json`: flag labels and levels) | see §5 |
| `images/nz/*` | on view | photos and `-t` thumbnails |

1. Copy `planner.js` into the book's GUIDES script (or keep it as a file) and add `planner(g)` to the loop.
2. Add `planner.css` to the book's `<style>`.
3. Add the `t-plan` radio (`class="t-plan"`, `name="tab-nz"`), its label and icon, the `.v-plan`
   section, and one `:has()` selector.
4. Merge `PT` into the book's strings; merge the sprite icons the POC adds (`i-maximize`,
   `i-minimize`, `i-chevron-left`, `i-download`, and the planner-only block in `index.html`).
5. `--pl-bottom` defaults to `var(--tabh,0px)`, so toasts and the list end clear the book's tab
   bar with no edit. A host without a tab bar sets `--tabh:0px` (the POC does, in `poc.css`).
6. Share links: in the book's bootstrap, map `#plan-<slug>=` to `place=<slug>` before first paint.
   `importHash()` then checks the guide's `t-plan` radio (`switchToMe()`), so the link opens on
   the plan tab, not the shelf.
7. Offline: add the five scripts and `data/nz/*` to the book's `SHELL`; add `images/nz/*` to the
   book's `PHOTOS` / `media` cache (about 200 files, 11 MB) so a deploy does not re-send them.
   The data must be fetched network-first or renamed with `SHELL` (as the POC's `sw.js` does).
8. Bump `SHELL`; delete `host.js`, `poc.css` and the POC `sw.js`.
