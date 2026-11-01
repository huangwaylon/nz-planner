# DESIGN.md: the design system (lead's decision, round DS1)

Built from three reviews: the measured visual audit (research/ux/ds-audit.md), the UX review
(research/ux/ux-review.md) and the performance review (research/ux/perf-review.md). This file is
the contract between the two engineers: the JS owner emits these components and class names, and
the CSS owner builds each component once. WORKFLOW.md's Principles and its type and colour system
still bind. Where this file is more specific, it wins.

## Owner decisions (round DS1)
- **No premade plans.** `plans.json` ships `plans: []`. The 8 curated versions live in
  `tools/fixtures/presets.json` as the test fixture for check_plans and sim. First run opens ①.
  ② shows empty day frames.
- **Tier labels:** 絶対 / 行きたい / **できれば** / 見送り (EN Must / Want / If time / Skip). One label
  everywhere, retiring 時間があれば, 時間あれば and 余裕.
- **Destructive buttons are ink, not red.** `--pl-warn` red means ⚠ only.
- **Save and share live only in the header** (say once).
- **Line heights sit on a 4 px grid:** 12/16, 14/20 (JA body 14/24), 17/24, 22/28, 40/40.

## Tokens (defined once on `.v-plan`; style.test.js enforces them)
- **Spacing:** `--pl-s-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48. Nothing off this
  scale, and no negative margins except optical icon offsets in a component.
- **Radius:** `--pl-r-1` 8 (controls, thumbs), `-2` 16 (cards, sheets), `-3` 24 (large media),
  `--pl-r-pill`. Nested radii are concentric: inner = outer − padding.
- **Elevation:** `--pl-e-1` (cards at rest: hairline, no shadow), `-2` (sheets, menus, the drag
  ghost). That's 2 shadows in total.
- **Hairline:** 1px `--line`. Rings use `outline`, not inset shadows.
- **Tonal fill:** `--pl-tint` is `--ink` at 6%: hover, pressed and unselected segments.
- **Control heights:** `--pl-h-s` 32 (compact chips, desktop only), `-m` 44 (default), `-l` 52 (the
  primary on phone).
- **Icons:** 16 / 20 / 24, line icons from the sprite only. **No emoji as icons:** 🚗 🥾 ⛴ ✈ become
  sprite glyphs.
- **Motion:** `--pl-t-1` 120 ms (state), `-2` 200 ms (enter), `-3` 280 ms (sheets).
  Easing: `cubic-bezier(.2,0,0,1)` for enter, `(.3,0,1,1)` for exit. Transform and opacity only.
  `prefers-reduced-motion` gives cross-fades of 0–120 ms.
- **Colour:** WORKFLOW's list. `--acc2`, `#ffd08a` and `--pl-good` are retired.
- **Two global rules:**
  1. **Selected = ink.** Fill `--ink`, text `--surface`. The one exception is the segmented
     control's raised thumb.
  2. **One primary per view,** filled `--acc`. Everything else is secondary (hairline), ghost
     (text) or icon.

## Components (one implementation each; JS renders through shared helpers)
| Component | Spec | Replaces |
|---|---|---|
| Button | primary / secondary / ghost / icon; heights per token; radius `--pl-r-1` (pill for chips) | 22 variants |
| Chip | filter (toggle) and choice; 32 desktop / 44 phone; selected = ink | 4 chip styles |
| Segmented | thumb on a `--pl-tint` track; used for stage, 1日/6日, km/mi, JA/EN, sort | 5 renderings |
| Text field | 44 high, `--pl-r-1`, hairline, leading 20 icon, clear button | 5 styles |
| List row | [media 40/64] title + one meta line + trailing (action or figure) | rows in ②, 候補, swap, plans, import |
| Card | media first (photo ≥55% of height desktop, ≥45% phone), title, one signal, tier control | ① cards, palette blocks |
| Tier control | 4 segments, equal widths ≥44, labels per decision | 2 versions |
| Sheet | header [title · close ×] on one centre line, body, optional footer bar with one primary; bottom sheet on phone, centred dialog ≥1024; × only (no 完了 duplicate) | all sheets |
| Toast | one line, result or undo only; 3 s, 10 s with 元に戻す; never a question | 4 toast styles |
| Badge / count | ink pill with a figure; ⚠ count in `--pl-warn` | 注意 n vs ⚠ n |
| Stat | icon 16 + tabular figure (🚗 icon + 1:05); durations always H:MM | 1時間5分 / 17:02 mix |
| Day header | 3 px top bar in `--dN`, numeral 40, weekday, stats row, title 17 | 4 renderings |
| Stop marker | day-hued circle with its index, the same on the map, list and board | |
| Empty state | photo or illustration, one line, one primary | sentence + button |
| Action bar | floating, one row, count + ✕ + ≤3 actions; fits 320; disabled at 0 | 612 px bar |

## Alignment
1. **One content left edge per pane:** `--pl-s-4` on phone, `--pl-s-5` on desktop. Headers, lists
   and footers share it.
2. **One trailing edge per pane,** and trailing actions align to it.
3. **Baseline grid 4 px:** the label and value in a row share a baseline.
4. **Icon–text pairs** are centre-aligned via flex `align-items:center`, with a 4 or 8 gap.
5. **Numbers** use tabular figures and are right-aligned in columns.
6. **Grids hold:** equal tracks (calendar `repeat(7,1fr)`). A card's tier row is pinned to the
   card's bottom.
7. **Panes:** the map is full-bleed to the right edge and never taller than the viewport minus the
   header. The stepper centres on its column, not the viewport.

## Interaction rules (from the UX review)
1. **Add.** Inside a day, ＋ adds at once. Outside a day, 「日程へ」 opens the day picker. Toast:
   「{name}を{d}に追加 · 元に戻す」. Drag is never the only way.
2. **One primary per view,** as above.
3. **Surfaces:**
   - Sheets are for choosing among many things, and Back closes them.
   - Edits to the thing in front of you happen inline.
   - Toasts report a result or offer undo, nothing else.
4. **One undo:** one stack, one header button on every stage, and ⌘Z. Remove, clear and delete
   never ask first; they show an undo toast instead.
5. **⚠ confirm:** a rule-breaking edit lands armed on the item: 「⚠ {reason}」 [確定][やめる].
   Enter confirms, Esc reverts. No timers, no 「もう一度タップ」.
6. **Selection:** the action bar per the component table. Card controls hide while selecting, and
   the selection clears after a bulk action or stage change.
7. **Navigation:** the URL tracks `#collect`, `#plan/13`, `#review` (replaceState), and
   `#place=<id>` opens a place. Sheets and the full map push one history entry that Back closes.
8. **Same action, same look:**
   - ＋ 追加 is trailing.
   - ✕ 外す is last, with a 16 px gap.
   - 削除 lives in a ⋯ menu.
   - ⇆ 入れ替え and 📅 別の日へ sit in the item's action row, shown on selection or hover, not
     always.
   - The tier control appears on cards and in the place sheet.
9. **Focus and hover:** one 2.5 px `--acc` focus ring. Hover only under `(hover:hover)`. Focus
   returns to whatever opened a sheet.
10. **Copy:**
    - Verbs: 追加 / 外す / 削除 / 別の日へ / 入れ替え / 使う / やめる / 閉じる.
    - Nouns: 案, マイプラン, 未仕分け (EN Inbox).
    - Buttons ≤6 JA characters or ≤14 EN.
    - No 「タップ」 in copy that also fires from a mouse or keyboard.
    - Each string key is defined once; strings.test enforces it.

## First run with no presets
- Open on ① while マイプラン is empty.
- **② empty day:** its frame (a base or region photo, the day's fixed label such as 到着 or 土曜・
  パーネルのマーケット, sleep and limit) plus 3 thumbnails from わたしのリスト with ＋. One primary per
  day: 「候補から追加」.
- **③ with fewer than 2 saved versions:** the calendar plus one card, 「今の日程を案として保存」.
- **Onboarding:** three one-time hints (① sort, 日程に組む, first add), each dismissed for good.
- **The 「案」 menu** replaces the plan picker: マイプラン, saved versions as photo tiles,
  「＋ 今の日程を保存」, and a collapsed 自動保存 row. The fork prompt is deleted. 「すべての日を
  空にする」 comes with undo.
- **Base and region photos:** done. `data/nz/frames.json` holds one credited Commons image per trip
  day, keyed by date (`{u,w,h,by,lic,page,alt,altJa,region,regionJa}`), picked from gallery.json.
  It is lazy, like the gallery.

## Performance rules (binding; from research/ux/perf-review.md)
Today's data (178 places) is within budget. At her real list size (3,345 imports) most
interactions were 5-10x over, because of three structural problems: every candidate pin is built
into the map, every ① card is re-rendered, and every edit re-renders the whole app. The rules:

1. **Never render more than the screen.** Any list that can exceed 100 items (① cards, 候補 rows,
   the palette, import rows, the versions list) renders a window plus `content-visibility:auto`
   sections. No `innerHTML` of an unbounded list.
2. **Patch, don't rebuild.**
   - An edit marks dirty regions; each region re-renders alone.
   - A filter or search replaces the result list only, never its own input or chips.
   - A tier change moves one card.
3. **Read, then write.** Measure (`getBoundingClientRect`, `clientWidth`, `scrollY`) at the start
   of the task, before any DOM or class write. Never measure after `innerHTML` or a class toggle in
   the same task. Take the width from ResizeObserver entries, not from layout reads.
4. **No hidden heavy DOM.** Things that are not shown are not built: candidate pins, ① when on ②,
   off-screen sheets. `display:none` is not free on SVG.
5. **Map:** at most ~500 SVG nodes that change per frame. Large point sets go on canvas or into
   clusters. Write `--z` on the pin layer, once per settle, never from a resize in flight.
6. **Id lookups go through `Map`s,** never `querySelector('[data-id=…]')` in a loop, and never
   `Array.find` inside a filter over `DB.list`.
7. **Input:**
   - Keystrokes do O(visible) work in the handler; the filtering waits for the next frame, or for
     ~100 ms of quiet for anything over 16 ms.
   - Pointer handlers (move, over) are rAF-throttled and early-out when nothing changed.
8. **Simulation:**
   - At most one day's `schedule` per frame on the input path.
   - Bulk simulation (group best day, auto-plan, hand-off over all days) runs in idle slices of
     ≤8 ms, or in a Worker, and paints its results progressively.
9. **Storage:**
   - Save on idle with a dirty flag (`requestIdleCallback`, 1 s timeout), and flush on `pagehide`.
   - Imports live in their own key.
   - Never stringify the whole state on an input event.
10. **Animate only `transform` and `opacity`.** Use `will-change:transform` only on the element being
    dragged or swiped, added at gesture start and removed at its end.
11. **Every PR keeps `tools/perf.test.js` green** (next section). A new list or layer adds its own
    case.

**Data decision:** only imports inside the trip's country (NZ) join the place list. The import sheet
keeps others out by default (region filter preselects NZ), and never stores what it doesn't import.
Existing out-of-country imports in saved state are dropped on migration, with a one-line toast
saying how many.

**Gate:** `tools/perf.html` + `tools/perf-run.js` (owned by the CSS/system engineer): 4x CPU via CDP,
stress states A (3,345 imports) and B (1,000 NZ imports) seeded in-page with a seeded PRNG.
- ① render <100 ms (B), <150 ms (A)
- keystroke <50 ms
- day switch <50 ms
- drag p95 <20 ms
- longest boot task <50 ms
- every case <=1.25x of the baseline it records

Runs in CI. The stress gates start as warnings and become failures once the P0 fixes land, in this
same round.

## Class contract (JS emits, CSS styles; both engineers code to this)
- **Button:** `pl-btn` + one variant (`pl-btn--primary | --secondary | --ghost | --icon`) + an
  optional size (`--s | --l`; default 44). Destructive: `--secondary` with ink text, never red.
- **Chip:** `pl-chip` (`--filter | --choice`), state via `aria-pressed="true"`.
- **Segmented:** `pl-seg` > `button[aria-pressed]`.
- **Text field:** `pl-field` > `svg.pl-ico` + `input` + `button.pl-field__clear`.
- **List row:** `pl-row` > `.pl-row__media`? `.pl-row__body` (`.pl-row__title`, `.pl-row__meta`)
  `.pl-row__trail`.
- **Card:** `pl-card` > `.pl-card__media` `.pl-card__body` (`.pl-card__title`, `.pl-card__signal`)
  `.pl-tier`.
- **Tier control:** `pl-tier` > 4 × `button[aria-pressed]`.
- **Sheet:** `pl-sheet` > `.pl-sheet__head` (`h2.pl-sheet__title`, `button.pl-btn--icon.pl-sheet__close`)
  `.pl-sheet__body` `.pl-sheet__foot`?
- **Toast:** `pl-toast` (`.pl-toast__text`, `button.pl-btn--ghost`).
- **Badge:** `pl-badge` (`--warn`).
- **Stat:** `pl-stat` > `svg.pl-ico` + `span` (tabular).
- **Day header:** `pl-dayhead` (`--dN` via `style="--day:var(--dN)"`).
- **Stop marker:** `pl-marker`.
- **Empty state:** `pl-empty` (`.pl-empty__media`, `.pl-empty__text`, `.pl-btn--primary`).
- **Action bar:** `pl-actionbar`.
- **Icons:** `svg.pl-ico` + `pl-ico--16|20|24`, from the sprite. Drive, walk, ferry and plane glyphs
  replace the emoji.
- **Old class names** are removed when migrated; style.test.js fails on CSS rules for classes no JS
  emits, and lists any JS class without a rule.
