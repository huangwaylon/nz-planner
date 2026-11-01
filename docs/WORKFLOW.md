# WORKFLOW.md: collect, plan, review (design decision)

Lead's decision after three proposals (designer, PM, architect; their full papers are kept locally
in research/). This is the spec the increments are built and tested against.

## Principles (owner, binding on every screen)
1. **Visual first, text on demand.** Images, the map and the route carry the screen; words are the
   detail layer. A card shows a photo, a name, and at most one line of signal. Everything else
   (hours, flags, evidence, notes, credits beyond the overlay) waits behind a tap, a hover, or the
   place sheet.
   - No paragraphs on any list, card or board.
   - Numbers are icons plus figures (🚗 1:05, ⚠ 1), never sentences.
   - Warnings say what's wrong in one short line, and the reason opens on tap.
2. **Say each thing once.** A fact lives in exactly one component, the one where it's acted on. If
   another screen needs it, show a glyph or count that links there; never repeat the text.
   - **Day facts** (sleep, drive, end time, ⚠, sun) live in the day header: the board column head,
     or the calendar cell in ③. They aren't also in a strip, toast or summary row.
   - **Place facts** (hours, flags, evidence, tier, gallery, credits) live in the place sheet. Cards
     carry the photo, the name, the tier control and one signal.
   - **Warnings** live on the stop they concern. The day header shows only a count.
   - **Stage counts** live in the stepper only.
   - **Help text and keyboard hints** appear once, then hide after first use, remembered in
     `plan-ui:nz`.

## Stages
A stepper, not a wizard. Every stage is always reachable, and each shows one live count.

| Stage | JA / EN | Count shown | What happens |
|---|---|---|---|
| ① | 集める / Collect | 未仕分け n | Triage places into tiers, make groups |
| ② | 組み立てる / Plan | 絶対 7/9 配置 | Put places into days and times: routes, map, live times, ⚠ rule |
| ③ | 見直す / Review | ⚠ n | Calendar, versions compared side by side, share |

- **Moving:** click a stage, or `[` `]`.
- **Hand-off:** 「日程に組む →」 at the end of ① opens ② on the first day that has an unplaced 絶対.
- **Calendar:** clicking a calendar day opens ② on that day.
- **Stored in `plan-ui:nz`:** the current stage, the day and the filters.

## Tiers (trip-level, shared by every version)
| Tier | JA | EN | Key |
|---|---|---|---|
| must | 絶対行く | Must go | 1 |
| want | 行きたい | Want | 2 |
| maybe | 時間があれば | If time | 3 |
| skip | 見送り | Skip | 0 |
| — | 未仕分け | Inbox | `⌫` clears the tier |

- **Look:** tiers are shades of the ink colour (solid, 55%, ring, dashed), always shown with the word, never a hue.
- **Card control:** every card has a 4-segment control, 44 px per segment. No tap-to-cycle.
- **Keyboard:**
  - `J` / `K` move between cards; keys are matched by `e.code`, so JIS keyboards work.
  - Select with `X`, Shift-click or `⌘A`; a selection raises a bulk bar with the tiers, グループへ and 日程へ.
- **Seed:** her saved places (`saved:true`) start as `want`, labelled 「保存済みから」. Nothing else is guessed.
- **Skip:** a `skip` place is hidden from the pool, from swaps and from auto-plan, but is never removed from a day it is already on.
- **Coverage:** each version shows how many musts it places, e.g. 「絶対 7/9」. An unplaced must is a to-do warning, never a block.

## Groups (trip-level)
- A group is one outing: `{id, name, ids}`. A place belongs to at most one group. Groups have no colour.
- The 25 curated clusters are read-only 「おすすめ」 templates; 「使う」 copies one into a group.
- Area is a way to sort the board, never something stored.
- In ②, groups are draggable palette blocks. Dropping one runs the gap-fit cluster insert with its preview, and the block then shows 「3/4 配置」.

## State v2 (`plan:nz`)
`{v:2, active, trip:{tier:{id:tier}, groups:[…], notes:{id:text}}, my, versions, imports, booked}`

- **Versions** keep `days`, `stay`, `stayDay`, `start`, `anchors` and `titles`.
- **Migration from v1:**
  - Back up the raw v1 string to `plan:nz:v1` first.
  - Notes move up to the trip: from `my.notes`, then from the newest version that has them.
  - Tiers start from the saved-places seed; groups start empty.
- **Old-app guard:** an old cached app moves a v2 save to `plan:nz:broken` and writes v1 back over it. On boot, the new app merges `trip` back from `:broken`.
- **Undo:** one stack covers trip edits and version edits. `editTrip()` never forks a preset into My plan.
- **Two tabs:** a `storage` event reloads state, so two desktop tabs don't overwrite each other.
- **Share links v3:**
  - Add tiers and group ids; group names are not included.
  - Importing a link only fills tiers the receiver hasn't set.
  - Old apps ignore the new keys.
- **Sync (phase 2):** `tier_set`, `group_set` / `group_drop`, `note_set`, `booked_set` and `imp_add` / `imp_drop` events. The newest event for each key wins.

## Layout: container queries on `.v-plan`, never media queries
| Container width | ① Collect | ② Plan | ③ Review |
|---|---|---|---|
| < 640 (phone) | full-view card list (today's browse, promoted) | today's day view | calendar + 2 versions |
| 640–1023 | list + map | timeline + map, palette in a drawer | calendar + versions |
| 1024–1439 | filter rail 232 \| card grid \| map 420 | palette 280 \| day timeline 440 \| map (fluid) | month calendar \| versions grid |
| ≥ 1440 | same, wider grid | same, plus a 「6日」 board toggle | same |
| ≥ 1600 | | 6-day board by default, map docked 360 | |

- **Map:** one SVG instance, moved between layouts by `grid-area`. The node is never moved in the DOM.
- **Fold:** the book caps `.views` at 720 px, so the fold adds `.guide:has(.t-plan:checked) .views{max-width:none}`; FOLD.md records it.

## Calendar (③, and the trip strip in ②)
- **Month view:** February 2027, Sunday first. Weeks with no trip days fold to one line. Weekends are bold, not coloured.
- **Each trip-day cell shows:**
  - the date and weekday, with the day colour as a bar;
  - where they sleep;
  - the stop count and musts placed;
  - driving time, and the end time against that day's limit;
  - the ⚠ count and bookings;
  - sunrise and sunset, at the day's first stop;
  - one fixed fact: landing 09:00, the Sat market, Valentine's, a ferry-only weekday, or the 20:30 car return.
- **Interaction:**
  - Clicking a day opens ② on that day.
  - Dropping a stop onto a day moves it there, with the usual preview.
  - The trip strip is the ② day picker and the board's column headers.

## Versions (③)
- **Grid:** days × 2–4 pinned versions.
- **Dimming:** cells equal to the active version dim to 「＝同じ」, so differences stand out.
- **Actions:** 「この案にする」 for a whole version, 「この日だけ取り込む」 per cell.
- **Totals row:** driving, ⚠ and 絶対 coverage.

## Drag and drop
- **One pointer controller, no HTML5 DnD.** Drop zones: palette, day, slot, tier lane, group and calendar day.
- **Touch** drags from the handle only (long-press), or select then 日程へ.
- **During a drag:**
  - Positions are measured once per drag; frames move things by transform only.
  - The day is re-simulated only when the slot changes, and the ghost shows arrival, added drive and any ⚠.
- **Dropping:**
  - A clean drop commits.
  - A ⚠ drop lands "armed": a second drop or Enter commits, Esc reverts.
- **Keyboard:** 「移動…」 menus, and Alt+←/→ between days.

## Visual direction
- **"An open travel book, not a console."** Paper background, hairline cards, shadow only while dragging. No gauges, charts or KPI tiles.
- **Grid:** 8 px, gutters 24/32, never more than three panes, and the map full-bleed to the right edge.

## Type and colour system (owner: unify; fewer colours; readable on screens)
Defined once as tokens on `.v-plan`. Rules use only these, and `tools/style.test.js` fails CI on
anything else.
- **One family, sans, everywhere.** That includes headings, place names, day numerals and the story
  image. No Mincho or serif:
  `--pl-font: "Hiragino Sans","Hiragino Kaku Gothic ProN",-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif`.
  Figures use `font-variant-numeric: tabular-nums`, so times line up.
- **Two weights:** 400 (text) and 600 (names, headings, selected state).
- **Five sizes:**

  | Token | Size | Line height | Used for |
  |---|---|---|---|
  | `--pl-fs-s` | 12 | 1.5 | meta, credits |
  | `--pl-fs-m` | 14 | 1.6 | body, labels, stop rows |
  | `--pl-fs-l` | 17 | 1.45 | place names, day titles |
  | `--pl-fs-xl` | 22 | 1.35 | screen headings |
  | `--pl-fs-d` | 40 | 1 | day numeral only |

  JA body text keeps a 1.75 line height. Nothing below 12. `rem`-relative where the host allows,
  so Larger Text works.
- **Colour is a short list:**

  | Token | Role |
  |---|---|
  | `--ink` | text |
  | `--muted` | secondary text, ≥4.5:1 on every surface |
  | `--line` | hairlines |
  | `--bg` / `--surface` | backgrounds |
  | `--acc` | the one accent: links, focus, selection, the primary button |
  | `--pl-warn` | ⚠ only |

  Everything else is the photographs.
  - **Day hues (`--d1…--d6`) are markers, never text.** They appear as the route line, map pins
    and a 3 px bar or dot on day headers and pills. The `--pl-dN-ink` text colours are retired:
    day numbers and labels are `--ink`.
  - **Tiers** are ink weights: solid `--ink`, `--muted`, outline, dashed. **Saved** is a glyph in
    `--ink`. No extra hues anywhere: badges, chips and categories are ink or muted.

## Budget
- **Phone, ②:** ≤100 KB gz on the first screen.
- **Phone, ①:** ≤100 KB gz, with land-lo deferred.
- **Lazy chunks** load by trigger: `planner-collect.js` (≤7.5 KB) for ①, `planner-desk.js` (≤16) when the container is ≥1024 wide after paint, `planner-cal.js` (≤6) when ③ opens, `planner-gallery.js` (≤2) on the first gallery need.
  - The desk and cal caps were raised from 6.5 and 3.5 on purpose. Neither touches a phone's first screen: desk loads only on a wide container, cal only when ③ opens. The caps in `tools/budget.test.js` are the source of truth.
- The phone never loads desktop code, because the trigger is the container's width.
- `tools/budget.test.js` gates CI.

## Increments (each deployable, each tested before the next)
1. **Make room.** Move sheet code and CSS out to planner-more, and cluster blurbs to groups.json. Switch to container queries. Add the budget and state tests. About 93 KB, no visible change.
2. **State v2, tiers, groups, stage ①, phone first.**
3. **Drag controller, wide layouts, the 6-day board, the all-days map.**
4. **Calendar, versions grid, and the fold updates.**

**Next iteration:** auto-plan for must-gos, as a greedy cheapest insertion that is always previewed and applies as one undo step.
