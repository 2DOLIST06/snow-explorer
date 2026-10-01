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

const { getDepartmentOptions, getSkiAreaStationIds, getStationDepartment } = loadFilterHelpers();

const stations = [
  { id: "resort-courchevel", name: "Courchevel", slug: "courchevel", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-meribel", name: "Méribel", slug: "meribel", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-val-thorens", name: "Val Thorens", slug: "val-thorens", region: { name: "Auvergne-Rhône-Alpes" }, department: "Savoie" },
  { id: "resort-chamonix", name: "Chamonix", slug: "chamonix", region: { name: "Auvergne-Rhône-Alpes" }, department: "Haute-Savoie" },
  { id: "resort-auron", name: "Auron", slug: "auron", region: { name: "Provence-Alpes-Côte d’Azur" }, department: "Alpes-Maritimes" },
  { id: "resort-sans-departement", name: "Sans département", slug: "sans-departement", region: { name: "Occitanie" }, department: null },
  { id: "resort-departement-vide", name: "Département vide", slug: "departement-vide", region: { name: "Occitanie" }, department: "" },
];

const skiAreas = [{
  id: 7,
  name: "Les 3 Vallées",
  slug: "les-3-vallees",
  stations: [
    { id: "resort-courchevel", name: "Courchevel", slug: "courchevel-1850", cover_image_url: null, logo_url: null },
    { id: "resort-meribel", name: "Méribel", slug: "meribel-les-allues", cover_image_url: null, logo_url: null },
    { id: "resort-val-thorens", name: "Val Thorens", slug: "val-thorens-station", cover_image_url: null, logo_url: null },
  ],
}];

function filterStations({ q = "", region = "", department = "", skiArea = "" } = {}) {
  const skiAreaStationIds = getSkiAreaStationIds(skiAreas, skiArea);
  const query = q.toLocaleLowerCase("fr");
  return stations.filter((station) => (
    (!query || station.name.toLocaleLowerCase("fr").includes(query))
    && (!region || station.region?.name === region)
    && (!department || getStationDepartment(station) === department)
    && (!skiAreaStationIds || skiAreaStationIds.has(station.id))
  ));
}

test("department options include all non-empty departments without a region", () => {
  assert.deepEqual(
    [...getDepartmentOptions(stations, "")],
    ["Alpes-Maritimes", "Haute-Savoie", "Savoie"],
  );
});

test("department options are restricted to the selected region", () => {
  assert.deepEqual(
    [...getDepartmentOptions(stations, "Auvergne-Rhône-Alpes")],
    ["Haute-Savoie", "Savoie"],
  );
});

test("an invalid department is reset after a region change", () => {
  const selectedDepartment = "Savoie";
  const nextOptions = getDepartmentOptions(stations, "Provence-Alpes-Côte d’Azur");
  const nextDepartment = nextOptions.includes(selectedDepartment) ? selectedDepartment : "";
  assert.equal(nextDepartment, "");
  assert.match(page, /getDepartmentOptions\(initialStations, nextRegion\)\.includes\(department\).*setDepartment\(""\)/);
});

test("ski-area filtering uses the resort ids returned in the selected area's station objects", () => {
  assert.deepEqual(
    filterStations({ skiArea: "les-3-vallees" }).map((station) => station.slug),
    ["courchevel", "meribel", "val-thorens"],
  );
});

test("ski-area membership intersects with region, department and search filters and resets", () => {
  assert.deepEqual(filterStations({ region: "Auvergne-Rhône-Alpes", skiArea: "les-3-vallees" }).map((station) => station.slug), ["courchevel", "meribel", "val-thorens"]);
  assert.deepEqual(filterStations({ department: "Savoie", skiArea: "les-3-vallees" }).map((station) => station.slug), ["courchevel", "meribel", "val-thorens"]);
  assert.deepEqual(filterStations({ q: "méribel", skiArea: "les-3-vallees" }).map((station) => station.slug), ["meribel"]);
  assert.deepEqual(filterStations().map((station) => station.slug), stations.map((station) => station.slug));
});

test("ski-area filtering returns no result only when no resort id belongs to the area", () => {
  assert.deepEqual(filterStations({ skiArea: "unknown-area" }), []);
  assert.deepEqual(filterStations({ region: "Provence-Alpes-Côte d’Azur", skiArea: "les-3-vallees" }), []);
});

test("station directory combines search, region, department and ski-area membership", () => {
  assert.match(page, /matchesQuery\s*&& \(!region/);
  assert.match(page, /&& \(!department/);
  assert.match(page, /&& \(!selectedSkiAreaStationIds/);
  assert.match(page, /selectedSkiAreaStationIds\.has\(station\.id\)/);
  assert.match(page, /getSkiAreaStationIds\(skiAreas, skiArea\)/);
  assert.match(page, /getDepartmentOptions\(initialStations, region\)/);
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
