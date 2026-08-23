const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "../src/components/stations/StationForfaitsBlock.tsx"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;
const componentModule = { exports: {} };
new Function("exports", "require", "module", "__filename", "__dirname", compiled)(
  componentModule.exports,
  require,
  componentModule,
  "StationForfaitsBlock.tsx",
  path.dirname(path.join(__dirname, "../src/components/stations/StationForfaitsBlock.tsx")),
);
const { hasForfaitPrice, normalizeForfaits, periodGrid } = componentModule.exports;

const visibilitySource = fs.readFileSync(path.join(__dirname, "../src/lib/skiPassVisibility.ts"), "utf8");
const visibilityCompiled = ts.transpileModule(visibilitySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const visibilityModule = { exports: {} };
new Function("exports", "require", "module", visibilityCompiled)(visibilityModule.exports, require, visibilityModule);
const { getSkiPassBlocksVisibility } = visibilityModule.exports;

test("legacy and normalized public visibility are independent", () => {
  assert.deepEqual(getSkiPassBlocksVisibility(true, false), { legacy: true, normalized: false, any: true });
  assert.deepEqual(getSkiPassBlocksVisibility(false, true), { legacy: false, normalized: true, any: true });
  assert.deepEqual(getSkiPassBlocksVisibility(true, true), { legacy: true, normalized: true, any: true });
  assert.deepEqual(getSkiPassBlocksVisibility(false, false), { legacy: false, normalized: false, any: false });
});

const adminSource = fs.readFileSync(
  path.join(__dirname, "../pages/admin/stations/[slug].tsx"),
  "utf8",
);

test("normalized admin categories are data-driven and editable", () => {
  const editor = fs.readFileSync(path.join(__dirname, "../src/components/admin/SkiPassEditor.tsx"), "utf8");
  assert.match(editor, /category_label/);
  assert.match(editor, /Ajouter une catégorie/);
  assert.match(editor, /Supprimer/);
  assert.doesNotMatch(editor, /\["Adulte", "Enfant", "Senior"\]/);
});

test("normalized admin products expose duration, ordering and price modes", () => {
  const editor = fs.readFileSync(path.join(__dirname, "../src/components/admin/SkiPassEditor.tsx"), "utf8");
  assert.match(editor, /duration_days/);
  assert.match(editor, /duration_label/);
  assert.match(editor, /sort_order/);
  assert.match(editor, /<option value="fixed">Fixe<\/option>/);
  assert.match(editor, /<option value="dynamic">Dynamique<\/option>/);
});

test("normalized season visibility uses its dedicated PATCH and confirms backend state", () => {
  const editor = fs.readFileSync(path.join(__dirname, "../src/components/admin/SkiPassEditor.tsx"), "utf8");
  const api = fs.readFileSync(path.join(__dirname, "../src/lib/api/skiPasses.ts"), "utf8");
  const visibilityApi = api.slice(api.indexOf("export async function setAdminSkiPassSeasonActive"));
  const toggle = editor.slice(editor.indexOf("const togglePublicDisplay"), editor.indexOf("\n\n  return"));

  assert.match(visibilityApi, /method: "PATCH"/);
  assert.doesNotMatch(visibilityApi, /method: "PUT"/);
  assert.match(visibilityApi, /JSON\.stringify\(\{ is_active: isActive \}\)/);
  assert.match(visibilityApi, /return body\.is_active/);
  assert.match(toggle, /const isActive = !season\.is_active/);
  assert.match(toggle, /is_active: confirmedIsActive/);
  assert.doesNotMatch(toggle, /await reload\(\)/);
});

test("legacy and normalized ski pass editors remain visible and independent", () => {
  const legacyStart = adminSource.indexOf('id="forfaits"');
  const advancedStart = adminSource.indexOf('id="forfaits-avances"');

  assert.ok(legacyStart >= 0, "the legacy forfait editor is present");
  assert.ok(advancedStart > legacyStart, "the normalized editor follows the legacy editor");
  assert.match(adminSource.slice(legacyStart, advancedStart), /<SaveButton onClick=\{patchWidgets\}/);
  assert.match(adminSource.slice(legacyStart, advancedStart), /widgets\?\.forfaits\?\.enabled/);
  assert.match(adminSource.slice(advancedStart), /<SkiPassEditor stationSlug=\{slug\}/);

  const editor = fs.readFileSync(path.join(__dirname, "../src/components/admin/SkiPassEditor.tsx"), "utf8");
  const importer = fs.readFileSync(path.join(__dirname, "../src/components/admin/ForfaitsJsonImport.tsx"), "utf8");
  const api = fs.readFileSync(path.join(__dirname, "../src/lib/api/skiPasses.ts"), "utf8");
  assert.match(editor, /useEffect\(\(\) => \{ void reload\(\); \}, \[reload\]\)/);
  assert.match(editor, /await reload\(\)/);
  assert.match(importer, /\/forfaits\/\$\{action\}/);
  assert.match(api, /\/ski-passes/);
});

test("public forfait tables only retain columns configured globally by admin", () => {
  const result = normalizeForfaits(
    [
      { id: "title", label: "title" },
      { id: "adult", label: "Adulte" },
      { id: "child", label: "Enfant" },
    ],
    [
      {
        id: "one-day",
        title: "1 jour",
        prices: {
          adult: "77",
          child: "63.10",
          title: "1 jour",
          "c-2-1": "2 jours",
        },
        columns: [{ id: "c-3-1", label: "c-3-1", value: "6 jours" }],
        note: "ancienne note",
      },
    ],
  );

  assert.deepEqual(result.columns, [
    { id: "adult", label: "Adulte" },
    { id: "child", label: "Enfant" },
  ]);
  assert.deepEqual(result.items[0].prices, { adult: "77", child: "63.10" });
});

test("forfait rows without any price are hidden independently for each period", () => {
  const periodOne = periodGrid({
    id: "low",
    categories: [
      { id: "adult", label: "Adulte" },
      { id: "child", label: "Enfant" },
    ],
    passes: [
      { id: "day", name: "1 jour", prices: [
        { category_id: "adult", price_type: "fixed", price: 42 },
        { category_id: "child", price_type: "fixed", price: null },
      ] },
      { id: "week", name: "6 jours", prices: [
        { category_id: "adult", price_type: "fixed", price: null },
        { category_id: "child", price_type: "dynamic", price_min: "", price_max: null },
      ] },
    ],
  });
  const periodTwo = periodGrid({
    id: "high",
    passes: [
      { id: "day", name: "1 jour", prices: [{ category_id: "adult", category_label: "Adulte", price_type: "fixed", price: null }] },
      { id: "week", name: "6 jours", prices: [{ category_id: "adult", category_label: "Adulte", price_type: "dynamic", price_min: 250, price_max: null }] },
    ],
  });

  assert.deepEqual(periodOne.rows.map((row) => row.id), ["day"]);
  assert.deepEqual(periodTwo.rows.map((row) => row.id), ["week"]);
});

test("zero remains a displayable forfait price", () => {
  assert.equal(hasForfaitPrice({ price_type: "fixed", price: 0 }), true);
  assert.equal(hasForfaitPrice({ price_type: "fixed", price: "   " }), false);
});

test("public forfait prices expose their category label for the mobile card layout", () => {
  const component = fs.readFileSync(path.join(__dirname, "../src/components/stations/StationForfaitsBlock.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../src/styles/globals.css"), "utf8");

  assert.match(component, /data-label=\{column\.label\}/);
  assert.match(styles, /\.forfaits-table td::before\{content:attr\(data-label\)/);
  assert.match(styles, /\.forfaits-table tbody\{display:grid;gap:12px\}/);
});

test("legacy forfait payloads can still infer columns when none are configured", () => {
  const result = normalizeForfaits([], [
    { id: "one-day", title: "1 jour", columns: [{ label: "Adulte", value: "77" }] },
  ]);

  assert.deepEqual(result.columns, [{ id: "fc-adulte", label: "Adulte" }]);
  assert.deepEqual(result.items[0].prices, { "fc-adulte": "77" });
});

test("price notes become ordered stars without reusing the dynamic label", () => {
  const { collectPriceNotes } = componentModule.exports;
  const notes = collectPriceNotes({
    columns: [{ id: "adult", label: "Adulte" }],
    rows: [
      { id: "one", title: "1 jour", cells: { adult: { category_id: "adult", label: "Web flexible", note: "Hors assurance" } } },
      { id: "two", title: "2 jours", cells: { adult: { category_id: "adult", label: "Web flexible", note: "Hors assurance" } } },
      { id: "three", title: "3 jours", cells: { adult: { category_id: "adult", label: "Web flexible", note: "Achat en ligne uniquement" } } },
    ],
  });

  assert.deepEqual(notes, [
    { label: "Hors assurance", stars: "*" },
    { label: "Achat en ligne uniquement", stars: "**" },
  ]);
});

test("the JSON preview reports imported starred notes", () => {
  const importer = fs.readFileSync(path.join(__dirname, "../src/components/admin/ForfaitsJsonImport.tsx"), "utf8");

  assert.match(importer, /collectImportedPriceNotes\(data\)/);
  assert.match(importer, /Notes détectées dans le JSON/);
  assert.match(importer, /Notes étoilées/);
  assert.match(importer, /season\?: SkiPassSeason/);
});
