const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function loadTypescript(path, resolve = require) {
  const source = fs.readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "require", "module", compiled)(module.exports, resolve, module);
  return module.exports;
}

const coordinates = loadTypescript("src/types/stationMap.ts");
const { stationDirectionsUrl } = loadTypescript("src/components/maps/StationMapCard.tsx", (name) => {
  if (name === "@/lib/stationName") return require("../src/lib/stationName");
  if (name === "@/types/stationMap") return coordinates;
  if (name === "./StationMapDynamic") return {};
  return require(name);
});

test("directions use the exact marker coordinates and leave the departure to Google Maps", () => {
  for (const station of [{ latitude: 45.9237, longitude: 6.8694 }, { latitude: 0, longitude: 0 }, { latitude: -90, longitude: 180 }]) {
    const url = new URL(stationDirectionsUrl(station));
    assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
    assert.deepEqual([...url.searchParams], [
      ["api", "1"], ["destination", `${station.latitude},${station.longitude}`], ["travelmode", "driving"],
    ]);
    assert.equal(url.searchParams.has("origin"), false);
  }
});

test("missing, nonnumeric, nonfinite and out-of-range coordinates hide directions", () => {
  for (const value of [undefined, null, "", "45", NaN, Infinity, -Infinity]) {
    assert.equal(stationDirectionsUrl({ latitude: value, longitude: 6 }), null);
    assert.equal(stationDirectionsUrl({ latitude: 45, longitude: value }), null);
  }
  assert.equal(stationDirectionsUrl({ latitude: 90.1, longitude: 6 }), null);
  assert.equal(stationDirectionsUrl({ latitude: 45, longitude: -180.1 }), null);
});
