const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("V2 always renders five clickable navigation entries and a clean business-data empty state", () => {
  const page = fs.readFileSync(path.join(root, "src/components/stations/StationV2Page.tsx"), "utf8");
  assert.match(page, /\["apercu", \.\.\.STATION_V2_SECTIONS\]/);
  assert.doesNotMatch(page, /aria-disabled="true"/);
  assert.match(page, /return <Link key=\{section\}/);
  assert.match(page, /Cette information n&apos;est pas disponible pour cette station\./);
});

test("V2 public routes depend on layout version, never editorial availability", () => {
  const route = fs.readFileSync(path.join(root, "pages/stations/[slug]/[section].tsx"), "utf8");
  const logic = fs.readFileSync(path.join(root, "src/lib/stationV2.ts"), "utf8");
  assert.match(route, /if \(!isStationV2\(station\)\) return \{ notFound: true \}/);
  assert.doesNotMatch(route, /hasV2SectionData/);
  assert.match(logic, /v2_weather_snow_html/);
  assert.match(logic, /widgets\?\.pistes\?\.officialMapUrl/);
  assert.match(logic, /widgets\?\.normalizedForfaits\?\.enabled/);
  assert.doesNotMatch(route, /isV2SectionPublished/);
});

test("V2 reuses the legacy hero and business components", () => {
  const page = fs.readFileSync(path.join(root, "src/components/stations/StationV2Page.tsx"), "utf8");
  assert.match(page, /<StationLegacyHero station=\{station\} \/>/);
  assert.match(page, /<MeteoblueSkiWidget/);
  assert.match(page, /<WebcamsAuto/);
  assert.match(page, /<StationForfaitsBlock/);
  assert.match(page, /<PlanPistesFigure/);
});
