const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("pages/stations/index.tsx", "utf8");
const map = fs.readFileSync("src/components/maps/StationMap.tsx", "utf8");
const styles = fs.readFileSync("src/styles/globals.css", "utf8");

test("station directory combines search, region, department and ski-area membership", () => {
  assert.match(page, /matchesQuery\s*&& \(!region/);
  assert.match(page, /&& \(!department/);
  assert.match(page, /&& \(!selectedAreaStationSlugs/);
  assert.match(page, /skiAreaBySlug\.get\(skiArea\).*stations/);
  assert.match(page, /setRegion\(event\.target\.value\); setDepartment\(""\)/);
});

test("station list and map share the filtered station slugs and expose a reset", () => {
  assert.match(page, /new Set\(data\.map\(\(station\) => station\.slug\)\)/);
  assert.match(page, /mapStations\.filter\(\(station\) => slugs\.has\(station\.slug\)\)/);
  assert.match(page, /const resetFilters/);
  assert.match(page, /Aucun résultat/);
});

test("directory map can expand, refits after resize and retains clustering", () => {
  assert.match(page, /stations-directory-layout--map-expanded/);
  assert.match(page, /resizeSignal=\{mapExpanded\}/);
  assert.match(map, /event\?\.trigger\?\.\(mapRef\.current, "resize"\)/);
  assert.match(map, /mapRef\.current\.fitBounds/);
  assert.match(map, /new MarkerClusterer\(\{ map, markers \}\)/);
});

test("directory layout is two-column on desktop and stacked without horizontal overflow", () => {
  assert.match(styles, /grid-template-areas:"results map"/);
  assert.match(styles, /station-results-grid\{grid-template-columns:repeat\(2/);
  assert.match(styles, /@media\(max-width:1050px\).*grid-template-areas:"map" "results"/s);
  assert.match(styles, /@media\(max-width:700px\).*grid-template-columns:1fr/s);
});
