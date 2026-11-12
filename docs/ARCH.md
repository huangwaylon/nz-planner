# Architecture decision (lead, after arch-lead / arch-pm / arch-perf)

## Decided
- **Stack:** vanilla JS, no framework, no build, system fonts (same as travel-plans). v1 is 56 KB gz total.
- **Hosting:** GitHub Pages, static. Brotli on Cloudflare would only save ~12%, and a service worker
  makes repeat loads 0 bytes.
- **Service model: local-first, shared on top.** The phone's own copy always renders, and nothing
  waits on the network. Phase 1 is local-only plus links and snapshots; phase 2 adds sync. PM's case
  wins on *why* (they plan apart, and links overwrite each other). The sync backend is the owner's
  proven $0 pattern from `../fitness` (ADR 0015) and `../sharedfinances`: a Google Sheet plus a
  bound Apps Script web app. Firestore was considered and dropped: a new provider and a new project,
  for no gain.
- **Storage:**
  - Shell and data go in Cache Storage. A versioned `SHELL` cache holds the shell; a stable `data`
    cache holds content-hashed data files. `vendor/maplibre` is not pre-cached (kept once fetched),
    and map tiles are not cached: no offline map for now (the map shows its offline note).
  - Plans, history and snapshots go in localStorage through `LS`. They are tiny; IndexedDB is not needed.
  - Call `navigator.storage.persist()`. Push installing to the Home Screen, since iOS evicts after
    7 days otherwise.
- **Data delivery:**
  - The basemap is OpenFreeMap's vector tiles, fetched at runtime by MapLibre (`planner-map.js`,
    `vendor/maplibre`, loaded by `import()` on the map's first draw: ~300 KB + ~150 KB gz for the
    engine and its worker, off the critical path). There is no land SVG.
  - The drive-time matrix is minutes-only and lazy-loaded after first render (~26 KB gz).
  - The km column is dropped from the shipped file.
  - Until the matrix arrives, use haversine×1.35 at 50 km/h.
- **Budget:**
  - Critical path ≤100 KB gz; repeat load 0 bytes.
  - LCP ≤2.0 s on Fast 4G with 4× CPU.
  - No boot task over 50 ms; render ≤16 ms; drag and map frames ≤16.7 ms.

## Phase 1 (now)
1. `sw.js` and `manifest.webmanifest`: copy the travel-plans pattern, including the refresh banner.
2. LINE in-app browser detection: show a 「Safariで開く」 card. Then a Japanese install card until
   `navigator.standalone` is true.
3. Undo stack, unlimited per session. Named snapshots (「この案を保存」) as versions. Compare two versions.
4. Opening a share link **adds a version** instead of overwriting My plan.
5. Map gestures: MapLibre's own camera; the planner writes nothing per frame and waits for
   `moveend`.
   Selection toggles classes, it never re-renders the pins.
6. Privacy guard: plans hold only place ids, minutes and HH:MM times. No names, flights or addresses.

## Phase 2 (before Jan 2027): Sheet + Apps Script sync, the fitness app's contract
- **Data:** one spreadsheet, *NZ Planner*, owned by the **same shared Google account** as fitness and
  sharedfinances. One tab, `events`: `at`, `person`, `id`, `type`, `data` (JSON). Append-only, with
  `at` the server time and strictly increasing.
- **Backend:** an Apps Script bound to that sheet, scope `spreadsheets.currentonly`, web app
  (*Execute as: Me*, *Anyone*). Plain `Code.gs` with no bundler, to match this repo's no-build
  rule. `doPost` never throws, and there is no `doGet`.
- **Auth:** `KEY_A` / `KEY_B` in Script Properties, 32 random bytes hex each. The key *is* the person,
  which gives 「{name}・2時間前に編集」 for free. Keys go in the body, never the URL; the app gets
  one by pairing with a QR code or link fragment, stored in `LS`.
- **Transport:** `POST` with `Content-Type: text/plain` (no preflight), `{key, action, …}` →
  `{ok, …}` or `{ok:false, error}`. Actions: `event`, `snapshot {since}` (tail read), `whoami`, `health`.
- **Events:**
  - `day_set {plan, date, ids[], stay{}, start, base}`: the full order for one day.
  - `plan_new {plan, name, from}`, `plan_rename`, `plan_drop`.
  - `pref`.
  - The client mints `id`, so a retry is acked as a duplicate.
- **Compute-on-read:** the newest `day_set` per (plan, date) wins. If it is from the other person and
  its `base` is not the version this phone edited, show both, with
  「{name}さんも3日目を変更しました。両方残しています。」. Undo and 30-day history come free: it is
  the log itself.
- **Client:** paint from the local snapshot, write optimistically to a queue in `LS` that replays in
  order with backoff, and refetch on open and on visibility (30 s floor). `rev` discards the cache on a
  hand edit, but never the queue.
- Sync dot: 同期済み / 未送信 n件 / オフライン.
- **Owner's one-time steps** (a SETUP.md mirroring fitness's google-setup): create the Sheet, paste
  `Code.gs`, set two keys, deploy, and paste the `/exec` URL into `data/config.json`. The URL is
  not secret, since the keys are.
- Later: a 9:16 story image of a day, drawn on the device.

## Cost rule (user requirement: effectively $0)
- GitHub Pages: free.
- Google Sheet and Apps Script: free on a consumer account, with no Cloud billing attached.
  - Quotas: 90 min/day of script runtime and 20 k URL calls. Two phones making a few hundred
    requests a day sit far below them.
  - Over a quota, a request fails and the app stays local-first, so the cost is a delay in sync,
    not money.
- No paid APIs at runtime. Drive times and geocodes are fetched once at authoring time from free
  services (OSRM demo, Nominatim) and shipped as static files.
- The basemap is the exception: OpenFreeMap's tiles (free, no key) at runtime. That third party
  sees the phone's IP and the area viewed, never the plan. Attribution is always shown.
- No Google Maps API key: links are plain maps URLs, which cost nothing.
