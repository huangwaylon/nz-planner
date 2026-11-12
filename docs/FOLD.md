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
- Plain classic scripts: no `import`/`export`, no build, no CDN. Modern syntax that iOS 16 Safari
  runs is fine.
- One dependency, vendored: **MapLibre GL 6.16** in `vendor/maplibre/` (its ES module, worker and
  CSS, served from our own origin). `planner-map.js` (a classic script, global `plmap`) loads it with
  `import()` on the map's first draw; nothing else imports anything. Folding in copies
  `planner-map.js` and `vendor/maplibre/` into the book too.

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
- A MapLibre GL map (`planner-map.js`) over OpenFreeMap's vector tiles (OpenStreetMap data, the
  OpenMapTiles schema), no API key. The style is our own, after `../fitness` travel/map/basemap.ts,
  coloured from the theme tokens (read once and resolved, since a GL style cannot read custom
  properties). Labels follow the page language (`name:ja`, else `name`; English `name:en`, else
  `name:latin`); Japanese is drawn from the system font, Latin from OpenFreeMap's glyphs.
- Panning is held to the North Island frame (lat −40.45…−34.30, lon 172.40…178.90, with a margin).
  There is no SVG coastline anywhere: the tiles are the only basemap.
- The day's stops and anchors are HTML markers; candidates and other days' places are GL circle
  layers (candidates clustered by MapLibre); the legs are line layers over the roads, under the
  labels. Pins are not focusable; the list is the keyboard path.
- The book's own `v-map` is still SVG. At fold time it either moves to `planner-map.js` too or the
  two maps differ; a post-fold decision.

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
The planner is one module plus the files it loads on demand (table below). All are classic
scripts except the vendored MapLibre, an ES module `planner-map.js` loads by `import()`. They add
no new globals beyond `planner` (with `planner.sim`, `planner.more`, `planner.swapRank`),
`plimport` (with `plimport.ui`), `plstory` and `plmap`.

| File | Loaded | Role |
|---|---|---|
| `planner.js` | with the book | `planner(g)`, the day simulation (`planner.sim`) |
| `planner.css` | with the book | every rule under `.v-plan` / `pl-`; layout by `@container plan` (`.v-plan{container:plan/inline-size}`), never by the window |
| `planner-collect.js` + `planner-collect.css` | ① opens (or the last stage was ①) | `planner.collect(ctx)`: tiers, groups, the bulk bar; ≤7.5 KB gz |
| `planner-desk.js` + `planner-desk.css` | the planner itself is ≥1024 wide, after paint (never a phone; not in sw.js APP) | `planner.desk(ctx)`: palette, 6-day board, drag controller, hover; ≤16 KB gz |
| `planner-cal.js` + `planner-cal.css` | ③ opens | `planner.cal.render` / `renderVersions(el, model, opts)`: the month calendar and the versions grid, model from planner.sim (tools/cal_fixture.py is the field reference) |
| `planner-gallery.js` + `planner-gallery.css` | with `data/nz/gallery.json`, from `loadGallery()`: the deferred `loadLazy()`, a place sheet, a story | `planner.gallery(ctx)` → `{gal, gimg, gw, isWM, thumb}` (core exposes `c.gal(p)` and `c.gx()`): picture markup, the small picture, the drop-on-error listener |
| `planner-more.js` + `planner-more.css` + `data/nz/groups.json` | the first touch (prefetched), or any sheet | `planner.more(ctx)`: candidates, place, plans, move, order, swap, compare, version name, share and paste |
| `import.js` + `planner-import.js` + `planner-import.css` | the 取り込む sheet | parsers (`plimport.gm/ig`), the sheet (`plimport.ui`) and its styles |
| `story.js` | 「ストーリー画像」 | `plstory.open(model, g)`; the model carries `guide` and `slug` |
| `planner-map.js` + `vendor/maplibre/*` | the map's first draw (`import()`; vendor not pre-cached by sw.js) | `plmap.create(el, opts)` → the engine; `plmap.snapshot(opts)` for story.js; tiles from `tiles.openfreemap.org` |
| `data/nz/*.json` | boot, and idle (`places-more.json`: vibe, kw, ig, igTag; `flags.json`: flag labels and levels) | see §5 |
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

## The book's 720 px clamp
The book caps `.views` at 720 px. Folding the planner adds `.guide:has(.t-plan:checked) .views{max-width:none}` to the book's CSS, so the planner's container queries (`@container plan`, on `.v-plan`) see the real width and the wide layouts (≥1024 palette | day | map, ≥1440 the 6日 board, ③'s calendar beside the versions grid) can open.


## Gallery

`data/nz/gallery.json` (`{placeId:[{u,w,h,by,lic,page,alt,altJa}]}`) links pictures; nothing is stored in the repo. It and its chunk load on first need, never on the first screen (`tools/budget.test.js` checks the boot path). Every picture is `loading="lazy" decoding="async" referrerpolicy="no-referrer"` with its width and height; Commons (`upload.wikimedia.org`) comes as a 320/640/960 `srcset` by swapping `960px-` in `u`, with `crossorigin="anonymous"`. A picture that errors is removed (its `[data-gw]` figure, if any) and the next shows; past the last, the markup's fallback: the photos.json photo, then the colour/sig card or glyph.

- Place sheet: a scroll-snap strip with dots and `by · lic` linked to `page` on each picture; a tap shows the picture whole at its own ratio, a second tap crops it back.
- ① cards: at ≥1024 a three-picture mosaic over the plate (planner-desk); on phone the first picture and 「+n」.
- ② (desk): one thumb per palette place and board stop.
- Story: a stop without its own photo may use its first Commons picture (the canvas needs CORS).
- Offline: sw.js keeps viewed Commons pictures in `nzp-gallery`, CORS 200s only (never opaque), LRU, 300 entries. Other hosts are network-only.

## The core

`planner.js` is one function, `planner(g)`, like the book's `packing(g)` and `map(g)`: it returns
early when the guide has no `.v-plan`, and everything it touches is scoped by the guide's slug. It
assumes only what the book provides: `LS.get` / `LS.set` (strings), `<html lang>` plus the document
`langchange` event, `span.u` for distances (and LS `units`), and the `#i-*` sprite. Runtime strings
live in `PT` (each lazy chunk adds its own).

- **Data** (`data-src`, default `data/<slug>/`): `places.json` and `plans.json` first; `travel.json`,
  `routes.json`, `photos.json`, `places-more.json` and `gallery.json` after first paint. Times match
  `tools/check_plans.py` exactly.
- **Storage:** LS `plan:<slug>` `{v:2, active, trip:{tier, groups, notes}, my, versions, imports,
  booked}` (a v1 save is backed up to `plan:<slug>:v1` and migrated; see `planner.state`), and
  `plan-ui:<slug>` `{v:1, day, map, stage, cf, board, pin, hideInstall, hideIntro, routes, rorder}`.

## Core notes

Longer explanations moved out of `planner.js` (its bytes count against the phone's first screen). The
code carries `/* note N … */` where each applies.

1. Flag labels and levels live in data/nz/flags.json ({flag:{ja,en,level}}), loaded right after first paint; safety flags come first, in that file's order; 'hidden' ones are said elsewhere (hours, the booking toggle) or are authoring notes. tools/check_plans.py --gate fails on any unlabelled flag.
2. drove: the minutes that count as driving (matrix or ≈), never walks or sailings. A leg into or out of a no-road place (plans.json noRoad: id -> road end) with no walk of its own is walk to its road end + the leg between road ends + walk from the other road end, as check_plans.leg().
3. the sun at the place itself; best may be "sunrise,sunset" (judged by the end of the day the visit falls on: before noon = sunrise). mustSun places exist for it, so missing it is a ⚠; for the rest best is a preference and missing it a golden-hour hint. Before dawn is fine on the approach to a sunrise stop later that day.
4. The day with ids added, simulated before anything is shown: one place goes to its cheapest open slot; a grouping (c) goes in as one block, placed by its best (sunset: the last stop ends at sunset; sunrise: the first starts at it) or its startAt, and an empty morning leaves at startAt. A block that breaks less always wins over one that is closer to its hour.
5. plans — Two kinds, one shape {id,days,stay,start,notes,anchors?}: saved versions (frozen snapshots, ids "v-…", kind 'auto' for the automatic ones) and マイプラン, the working copy, which always exists (empty on first run). There are no premade plans: plans.json ships `plans: []`, and the old curated ones are tools/fixtures/presets.json for the tests and tools/check_plans.py. An edit changes the active plan in place: マイプラン itself, or a version replaced by its changed clone, so undo restores the original.
6. zoom and pan — MapLibre owns the camera: gestures, the +/− buttons (zoomBy) and fits (fitBounds/easeTo) all move it, and pins, labels and strokes stay at screen size by themselves. The planner writes nothing per frame; work that must not run under a moving map waits for moveend.
7. reorder: drag the handle (pointer events, iOS has no HTML5 DnD), or tap it for the 上へ/下へ/位置 sheet, which is also the VoiceOver and glove path. Transforms only while moving, layout measured once, one recompute per frame at most, and nothing re — renders under the finger. ----------
8. the trip, shared by every version: tiers (must|want|maybe|skip; '' = back to the inbox, no key = not sorted yet, which for her saved places reads as want), groups (one outing each, a place in at most one) and notes about places
9. An old cached app reads a v2 save as broken, keeps it in plan:<slug>:broken and writes v1 over it. The new app takes back what that cost: the trip, My plan if the old app had none, every version, import and booking.
10. Low tides by area (NZDT), copied from tools/check_plans.py; plans.json `tides` overrides it, so the table should move there to stop the two drifting.
11. the day simulation: tools/check_plans.py, line for line. Pure: no DOM, no storage. DB = {places:Map, days, ferries, walks, tides, travel:{ids,min}, tIdx}; P is a plan record.
12. a night's stay carries over (as tools/check_plans.py): with no start of its own, a day starts where the day before ended at an anchored place (a hut, a camp, another bed)
13. Minutes from a to b leaving at t: a walk from plans.json `walks` (either way; `down` the other way), an island crossing through its ferry, or a drive. kind 'drive' only for matrix minutes.
14. and the members one by one, each into the cheapest free gap: a day with room between fixed stops takes a grouping there rather than at its start
15. saved state, pure: what storage gave us, validated. Anything malformed is dropped and flagged broken, so the caller keeps the raw string. node: tools/state.test.js
16. v1 -> v2: her notes move up to the trip, from My plan first, then the newest version that has them; a note a preset wrote stays where it is
17. a preset's day title holds only while the day still matches that preset's day (60 % of the stops); otherwise the day is named by its first two stops, so two different days never read the same
18. v2: {v:2, active, trip:{tier, groups, notes}, my, versions, imports, booked}. The v1 string it replaced was copied to plan:<slug>:v1 before the first v2 write (loadState).
19. Saves wait for an idle moment (1 s at most) and coalesce; pagehide and a hidden tab flush them. Imports live in plan:<slug>:imp, written only when they change, so a tier tap does not re-serialise every imported place.
20. Trip edits (tiers, groups, notes) share the one undo stack and never fork a preset into My plan. S.trip is replaced, never mutated, so a history entry can keep the old one.
21. ⚠ confirm (docs/DESIGN.md rule 5): an edit that breaks something lands armed on the item it concerns — 「⚠ {reason}」 [確定][やめる] — Enter confirms, Esc reverts; no timers, no second tap
22. Validate what storage gave us. Anything malformed falls back to the seed, and the raw string is kept under plan:<slug>:broken so nothing is lost silently.
23. Imported candidates join the place list as records of their own, unless one was matched to a place we already have, which then carries it as a link. Rebuilt only when imports change.
24. keyed on the version and the array itself: loadState() swaps in the saved imports after the first build, and a reload once lost every imported place that way
25. tiers (the trip's, shared by every version): must want maybe skip; no tier = the inbox, except her own saved places, which start as want (「保存済みから」). Nothing else is guessed.
26. stages: ① collect ② plan ③ review. A stepper, not a wizard: every stage is always reachable; each shows one live count.
27. 「日の出には…出発」 is worked out, not quoted: sunrise at the place less the way there from the day's start and 10 minutes, so arriving by then really is before sunrise
28. The note editor keeps its draft across any re-render: S.noteOpen + S.drafts. A stop is a list row (photo, time, name, one line of signal, the handle); its tools (stay, 入れ替え, 別の日へ, then 外す) sit in an action row shown when the stop is selected (a tap) or hovered.
29. an empty day: its frame (photo, fixed label, sleep), three of her own places nearest the day's start with ＋, and one primary, 候補から追加 (docs/DESIGN.md "First run")
30. A change that moves times but not places (stay ±, start time, a note, a booking) patches the day in place: no list rebuild, no map work. Falls back to a full render if the rows differ.
31. Candidate pins (perf rules 4-6): built only while shown (browsing, placing, ①) and removed when hidden, never kept under display:none; above 300 they are clustered on a grid over the current view, rebuilt once per settle; a tap on a cluster zooms into it. Planned places are left out.
32. road geometry: routes.json first, then the OSRM demo server, one leg at a time when idle and online, cached LRU (200) in plan-ui
33. busyUI() reads the map's own moving state (engine.moving()) beside a drag or gesture; route fetches and redraws wait on it, so anything that marks the map busy must clear on moveend and on every cancel, or routes wait forever
34. Patch, don't rebuild (perf rule 2): an edit marks the regions it touched; the next frame renders only those. render() (everything) is for stage, language and plan switches.
35. sheets: the background is inert, the dialog is named by its heading, Tab stays inside, and closing makes it inert at once so a second tap cannot act twice
36. URL state (docs/DESIGN.md interaction rule 5): #collect, #plan/13, #review, #place=<id>. The stage and day replace the entry; a sheet and the full map push one, so Back closes them. A hash that is not ours (a share link, #pair=) is left alone.
37. Candidates: header once per open, the list on every filter change (so the search keeps focus), and adding patches one row instead of rebuilding them all.
38. A tap on the dimmer over a day button switches the day (keeping the sheet when it is the candidates list); anywhere else it closes.
39. import: the sheet's code and strings live in planner-import.js, loaded with the parsers (import.js) and the region table only when the sheet first opens.
40. read layout before the DOM changes, and write storage after the frame: no forced reflow, no 200-route JSON on the tap's critical path
41. After first paint, idle: the drive matrix, road shapes, photos and the evidence. A failed fetch retries when the phone comes back online or to the foreground.
42. places-more.json: the vibe lines, evidence and sources, off the critical path. The vibe joins its place record (and the search index) when it arrives.
43. Boot in two tasks so neither runs long: the day list first, the map's pins next. A render error from bad saved state drops to an empty マイプラン rather than bricking the app.
44. Listeners attach in the third boot task (wire), so a tap on a slow phone can land on a rendered but deaf page. Hold the first such tap and replay it once wired.
45. the matrix, road shapes and photos index wait for her first touch or for a quiet moment after load, so the first screen downloads only what it draws

## Collect notes

Explanations moved out of `planner-collect.js` (its bytes count against the phone's first screen); the code carries `/* note cN */`.

- c1: the phone card leads with a photo band: our photo by width, then the gallery's, then the glyph
- c2: one card: the place, where it already is, and the four tier buttons (44 px each, the word always shown)
- c3: the gallery arrived: swap each card's picture in, a few dozen per frame, not one long re-render
- c4: for planner-desk's keys (J K 1 2 3 0 ⌫ X ⌘A G Enter): the selection, the focused card, the moves
