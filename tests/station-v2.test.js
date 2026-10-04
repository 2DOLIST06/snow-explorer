const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("V2 always renders its five navigation entries and disables unavailable public sections", () => {
  const page = fs.readFileSync(path.join(root, "src/components/stations/StationV2Page.tsx"), "utf8");
  assert.match(page, /\["apercu", \.\.\.STATION_V2_SECTIONS\]/);
  assert.match(page, /aria-disabled="true"/);
  assert.match(page, /Non disponible pour cette station/);
  assert.match(page, /Cette section ne contient encore aucune donnée\./);
});

test("V2 public routes use business-or-editorial availability rather than publication flags", () => {
  const route = fs.readFileSync(path.join(root, "pages/stations/[slug]/[section].tsx"), "utf8");
  const logic = fs.readFileSync(path.join(root, "src/lib/stationV2.ts"), "utf8");
  assert.match(route, /hasV2SectionData\(station, section, widgets\)/);
  assert.match(logic, /v2_weather_snow_html/);
  assert.match(logic, /widgets\?\.pistes\?\.officialMapUrl/);
  assert.match(logic, /widgets\?\.normalizedForfaits\?\.enabled/);
  assert.doesNotMatch(route, /isV2SectionPublished/);
});
