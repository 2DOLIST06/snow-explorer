const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const page = fs.readFileSync("pages/plan-des-pistes.tsx", "utf8");
const projection = fs.readFileSync("src/lib/publicPisteMap.ts", "utf8");
const header = fs.readFileSync("src/components/layout/ProHeader.tsx", "utf8");

function loadProjection() {
  const javascript = ts.transpileModule(projection, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (module, exports) { ${javascript}\n})(module, module.exports);`, { module, URL });
  return module.exports;
}

const { getDirectoryPistes, getPistes } = loadProjection();

test("the main navigation links to the piste map directory", () => {
  assert.match(header, /label: "Plan des pistes", href: "\/plan-des-pistes"/);
});

test("the piste map page keeps the shared station selection experience", () => {
  assert.match(page, /className="passes-layout"/);
  assert.match(page, /<h2>Choisissez une station<\/h2>/);
  assert.match(page, /setSelected\(station\)/);
  assert.match(page, /Plan des pistes de \{selected\.name\}/);
});

test("selection never refetches the resort collection and uses its plan projection first", () => {
  assert.equal((page.match(/fetch\(/g) || []).length, 1);
  assert.doesNotMatch(page, /api\/ski\/resorts|fetchActiveResortsServer\(.*selectStation/s);
  assert.match(page, /const directoryPistes = getDirectoryPistes\(station\)/);
  assert.match(page, /if \(directoryPistes\) \{[\s\S]*?return;[\s\S]*?setLoading\(true\)/);
});

test("widgets is a single conditional legacy fallback", () => {
  assert.equal((page.match(/-widgets/g) || []).length, 1);
  assert.match(page, /setLegacyPistes\(getPistes\(await response\.json\(\)\)\)/);
  assert.doesNotMatch(page, /useState<Resort\[\]>/);
  assert.doesNotMatch(page, /setStations|setInitialStations/);
});

test("all current and historical piste map fields remain normalised", () => {
  for (const field of [
    "smallMapUrl", "small_map_url", "pistes_small_map_url",
    "largeMapUrl", "large_map_url", "pistes_large_map_url",
    "piste_map_url", "pistes_map_url", "officialMapUrl", "official_map_url",
    "pistes_official_map_url", "caption", "pistes_map_caption",
  ]) assert.match(projection, new RegExp(field));
  assert.match(projection, /source\.pistes \|\| source\.widgets\?\.pistes/);
});

test("only a usable directory map suppresses the widgets fallback", () => {
  const projected = getDirectoryPistes({ pistes_large_map_url: "https://maps.example/projected.jpg" });
  assert.equal(projected.largeMapUrl, "https://maps.example/projected.jpg");

  assert.equal(getDirectoryPistes({
    pistes_small_map_url: null,
    pistes_large_map_url: null,
    pistes_map_url: null,
    pistes_official_map_url: null,
    pistes_map_caption: null,
  }), null);
  assert.equal(getDirectoryPistes({ name: "Legacy station" }), null);
  assert.equal(getDirectoryPistes({ name: "No map anywhere" }), null);

  const official = getDirectoryPistes({ officialMapUrl: "https://maps.example/official.pdf" });
  assert.equal(official.officialMapUrl, "https://maps.example/official.pdf");

  const historical = getDirectoryPistes({
    pistes: { small_map_url: "https://maps.example/small.jpg", large_map_url: "https://maps.example/large.jpg" },
  });
  assert.equal(historical.smallMapUrl, "https://maps.example/small.jpg");
  assert.equal(historical.largeMapUrl, "https://maps.example/large.jpg");
});

test("a null directory projection still permits a legacy widgets map", () => {
  const station = { pistes_small_map_url: null, pistes_large_map_url: null, pistes_official_map_url: null };
  assert.equal(getDirectoryPistes(station), null);
  const widgets = getPistes({ widgets: { pistes: { largeMapUrl: "https://maps.example/legacy.jpg" } } });
  assert.equal(widgets.largeMapUrl, "https://maps.example/legacy.jpg");
});

test("selection stores only a station reference plus legacy fallback data", () => {
  assert.match(page, /useState<Resort \| null>/);
  assert.match(page, /getDirectoryPistes\(selected\) \|\| legacyPistes/);
  assert.doesNotMatch(page, /\{ \.\.\.station, pistes:/);
});

test("mobile station selection reveals the piste map and keeps a change action", () => {
  assert.match(page, /contentRef\.current\?\.scrollIntoView/);
  assert.match(page, /station-picker--collapsed/);
  assert.match(page, />Changer</);
  assert.match(page, /ref=\{contentRef\} className="passes-content"/);
});

test("station choices do not duplicate the profile link shown in the result", () => {
  assert.doesNotMatch(page, /Voir la fiche/);
  assert.match(page, /Voir la station/);
});

test("piste maps open in the same in-site dialog pattern as station pages", () => {
  assert.match(page, /setMapOpen\(true\)/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(page, /className="pistes-modal-backdrop"/);
  assert.doesNotMatch(page, /href=\{mapUrl\} target="_blank"/);
  assert.doesNotMatch(page, /href=\{officialMapUrl\} target="_blank"/);
});
