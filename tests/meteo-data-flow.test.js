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
  assert.match(page, /selected && <StationWeather/);
  assert.match(page, /parseCoordinate\(selected\?\.latitude, 90\)/);
});

test("shared weather keeps observations independent from missing forecast coordinates", () => {
  const widget = read("src/components/weather/StationWeather.tsx");
  assert.match(widget, /fetchStationWeather\(slug, signal\)/);
  assert.match(widget, /lat === null \|\| lon === null/);
  assert.doesNotMatch(widget, /nominatim|current_weather|snow_depth_cm.*Open-Meteo/);
});
