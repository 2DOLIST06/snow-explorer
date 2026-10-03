const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const page = fs.readFileSync("pages/stations/index.tsx", "utf8");
const map = fs.readFileSync("src/components/maps/StationMap.tsx", "utf8");
const styles = fs.readFileSync("src/styles/globals.css", "utf8");

function loadFilterHelpers() {
  const filename = path.resolve("src/lib/stationDirectoryFilters.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Set }, { filename });
  return module.exports;
}

const { getDepartmentOptions, getSkiAreaOptions, getSkiAreaStationIds, getStationDepartment, matchesStationLocation } = loadFilterHelpers();

const stations = [
  { id: "resort-1", name: "Courchevel", slug: "courchevel", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-2", name: "Méribel", slug: "meribel", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-3", name: "Val Thorens", slug: "val-thorens", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-4", name: "Chamonix", slug: "chamonix", region: { name: "Auvergne-Rhône-Alpes" }, department: "Haute-Savoie" },
  { id: "resort-5", name: "Auron", slug: "auron", region: { name: "Provence-Alpes-Côte d’Azur" }, department: "Alpes-Maritimes" },
  { id: "resort-6", name: "Sans département", slug: "sans-departement", region: { name: "Occitanie" }, department: null },
  { id: "resort-7", name: "Département vide", slug: "departement-vide", region: { name: "Occitanie" }, department: "" },
  { id: "resort-8", name: "La Grave", slug: "la-grave", region: { name: "Auvergne-Rhône-Alpes" }, department: "Hautes-Alpes" },
  { id: "resort-9", name: "Les Orres", slug: "les-orres", region: { name: "Provence-Alpes-Côte d’Azur" }, department: "Hautes-Alpes" },
];

const skiAreas = [
  {
    slug: "les-3-vallees",
    stations: [{ id: "resort-1" }, { id: "resort-2" }, { id: "resort-3" }],
  },
  {
    slug: "domaine-multi-regions",
    stations: [{ id: "resort-4" }, { id: "resort-5" }],
  },
  {
    slug: "domaine-occitan",
    stations: [{ id: "resort-6" }],
  },
];

function filterStations({ q = "", region = "", department = "", skiArea = "" } = {}) {
  const skiAreaStationIds = getSkiAreaStationIds(skiAreas, skiArea);
  const query = q.toLocaleLowerCase("fr");
  return stations.filter((station) => (
    (!query || station.name.toLocaleLowerCase("fr").includes(query))
    && matchesStationLocation(station, region, department)
    && (!skiAreaStationIds || skiAreaStationIds.has(station.id))
  ));
}

test("department options include all non-empty departments without a region", () => {
  assert.deepEqual(
    [...getDepartmentOptions(stations)],
    ["Alpes-Maritimes", "Haute-Savoie", "Hautes-Alpes", "Savoie"],
  );
});

test("department options remain complete when a region is selected", () => {
  assert.deepEqual(
    [...getDepartmentOptions(stations)],
    ["Alpes-Maritimes", "Haute-Savoie", "Hautes-Alpes", "Savoie"],
  );
  assert.match(page, /getDepartmentOptions\(initialStations\)/);
});

test("department takes precedence over inconsistent station regions", () => {
  assert.deepEqual(
    filterStations({ region: "Auvergne-Rhône-Alpes", department: "Hautes-Alpes" }).map((station) => station.slug),
    ["la-grave", "les-orres"],
  );
  assert.deepEqual(
    filterStations({ region: "Provence-Alpes-Côte d’Azur", department: "Hautes-Alpes" }).map((station) => station.slug),
    ["la-grave", "les-orres"],
  );
  assert.match(page, /matchesStationLocation\(station, region, department\)/);
});

test("ski-area filtering uses the resort IDs resolved from ski_area_resort", () => {
  assert.deepEqual(
    filterStations({ skiArea: "les-3-vallees" }).map((station) => station.slug),
    ["courchevel", "meribel", "val-thorens"],
  );
});

test("ski-area options are restricted to areas with a station in the selected region", () => {
  assert.deepEqual(
    getSkiAreaOptions(skiAreas, stations, "Provence-Alpes-Côte d’Azur").map((area) => area.slug),
    ["domaine-multi-regions"],
  );
  assert.deepEqual(
    getSkiAreaOptions(skiAreas, stations, "Auvergne-Rhône-Alpes").map((area) => area.slug),
    ["les-3-vallees", "domaine-multi-regions"],
  );
  assert.deepEqual(getSkiAreaOptions(skiAreas, stations, ""), skiAreas);
});

test("changing region clears a selected ski area that is no longer available", () => {
  assert.match(page, /getSkiAreaOptions\(skiAreas, initialStations, nextRegion\).*area\.slug === skiArea.*setSkiArea\(""\)/);
  assert.match(page, /skiAreaOptions\.map\(\(area\) =>/);
});

test("ski-area membership intersects with region, department and search filters and resets", () => {
  assert.deepEqual(filterStations({ region: "Auvergne-Rhône-Alpes", skiArea: "les-3-vallees" }).map((station) => station.slug), ["courchevel", "meribel", "val-thorens"]);
  assert.deepEqual(filterStations({ department: "Savoie", skiArea: "les-3-vallees" }).map((station) => station.slug), ["courchevel", "meribel", "val-thorens"]);
  assert.deepEqual(filterStations({ q: "méribel", skiArea: "les-3-vallees" }).map((station) => station.slug), ["meribel"]);
  assert.deepEqual(filterStations().map((station) => station.slug), stations.map((station) => station.slug));
});

test("station directory combines search, region, department and ski-area membership", () => {
  assert.match(page, /matchesQuery\s*&& matchesStationLocation/);
  assert.match(page, /&& \(!selectedSkiAreaStationIds/);
  assert.match(page, /getSkiAreaStationIds\(skiAreas, skiArea\)/);
  assert.match(page, /fetchAllPublicSkiAreasWithStations\(\)/);
  assert.match(page, /getDepartmentOptions\(initialStations\)/);
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
