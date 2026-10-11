const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("weather page uses its SSR directory without collection refetches", () => {
  const page = read("pages/meteo.tsx");

  assert.match(page, /initialStations\.filter/);
  assert.match(page, /initialStations: await fetchActiveResortsServer\(\)/);
  assert.doesNotMatch(page, /fetch\("\/api\/ski\/stations"/);
  assert.doesNotMatch(page, /fetch\("\/api\/ski\/resorts\/"/);
  assert.doesNotMatch(page, /setStations|bySlug|loadAllStations/);
  assert.match(page, /onClick=\{\(\) => selectStation\(station\)\}/);
});

test("weather page always uses automatic forecasts without widget iframe reads", () => {
  const page = read("pages/meteo.tsx");
  assert.doesNotMatch(page, /iframe|loadingWidget|directoryMeteo|selected\.widgets|selected\.meteo|fetch\(/);
  assert.match(page, /lat !== null && lon !== null && <SkiWeatherWidget/);
  assert.match(page, /parseCoordinate\(selected\?\.latitude, 90\)/);
});

test("external weather fallback geocodes only missing coordinates", () => {
  const widget = read("src/components/SkiWeatherWidget.tsx");

  assert.match(widget, /if \(usedLat == null \|\| usedLon == null\)/);
  assert.match(widget, /nominatim\.openstreetmap\.org\/search/);
  assert.match(widget, /fetch\(`\/api\/ski-weather\?lat=\$\{usedLat\}&lon=\$\{usedLon\}`/);
});
