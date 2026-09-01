const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the shared header reuses page data and has only one deduplicated fallback fetch", () => {
  const app = read("pages/_app.tsx");
  const header = read("src/components/layout/ProHeader.tsx");

  assert.match(app, /pageProps\.stationDirectory \?\? pageProps\.initialStations/);
  assert.match(app, /<ProHeader initialStations=\{stationDirectory\}/);
  assert.equal((header.match(/fetch\("\/api\/ski\/resorts\/"\)/g) || []).length, 1);
  assert.match(header, /if \(initialStations\) \{/);
  assert.match(header, /fallbackStationsPromise/);
  assert.doesNotMatch(header, /useEffect\([^]*\[query\]\)/);
  assert.doesNotMatch(header, /setResults|\[results, setResults\]/);
});

test("homepage serializes its complete directory and never refetches it in the browser", () => {
  const homepage = read("pages/index.tsx");

  assert.match(homepage, /featuredResorts: Resort\[\]/);
  assert.match(homepage, /stationDirectory: Resort\[\]/);
  assert.match(homepage, /props: \{ featuredResorts, stationDirectory: activeResorts \}/);
  assert.doesNotMatch(homepage, /fetch\(getResortsApiUrl|fetch\(fetchUrl/);
  assert.doesNotMatch(homepage, /setAllResorts|setItems/);
});

test("stations directory searches its server data locally without a browser fetch", () => {
  const stations = read("pages/stations/index.tsx");

  assert.match(stations, /initialStations\.filter/);
  assert.doesNotMatch(stations, /fetch\(/);
  assert.doesNotMatch(stations, /useEffect/);
  assert.match(stations, /props: \{ initialStations \}/);
});
