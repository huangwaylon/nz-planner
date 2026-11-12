#!/bin/sh
# Assemble the public site in _site/ from an explicit allowlist. Nothing else in the repo is
# published: research/, tools/, the specs and the screenshots never reach Pages.
set -eu
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site/data/nz _site/images _site/vendor/maplibre
for f in index.html host.js planner.js planner-map.js planner.css poc.css planner-import.js planner-import.css planner-more.js planner-more.css planner-collect.js planner-collect.css planner-desk.js planner-desk.css planner-cal.js planner-cal.css planner-gallery.js planner-gallery.css planner-sync.js planner-sync.css import.js story.js \
         sw.js manifest.webmanifest icon-180.png icon-512.png; do
  cp "$f" _site/
done
cp data/nz/*.json _site/data/nz/
# the map engine, loaded by planner-map.js on first draw (README "vendor/maplibre")
cp vendor/maplibre/maplibre-gl.js vendor/maplibre/maplibre-gl-worker.js vendor/maplibre/maplibre-gl.css vendor/maplibre/LICENSE.txt _site/vendor/maplibre/
cp -R images/nz images/og.jpg _site/images/
# Refuse to publish anything private. The patterns are themselves private, so they never live in
# the repo: locally research/deny.txt (gitignored), in CI the DIST_DENY secret, one per line.
deny=$(mktemp)
{ [ -f research/deny.txt ] && cat research/deny.txt; printf '%s\n' "${DIST_DENY:-}"; } | grep -v '^$' > "$deny" || true
if [ ! -s "$deny" ]; then
  echo 'no deny patterns (research/deny.txt or DIST_DENY); refusing to build blind' >&2; rm -f "$deny"; exit 1
fi
if grep -rIl -F -f "$deny" _site; then
  echo 'private string in _site' >&2; rm -f "$deny"; exit 1
fi
rm -f "$deny"
du -sh _site
