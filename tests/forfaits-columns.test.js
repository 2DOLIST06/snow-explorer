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
const { normalizeForfaits } = componentModule.exports;

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

test("legacy forfait payloads can still infer columns when none are configured", () => {
  const result = normalizeForfaits([], [
    { id: "one-day", title: "1 jour", columns: [{ label: "Adulte", value: "77" }] },
  ]);

  assert.deepEqual(result.columns, [{ id: "fc-adulte", label: "Adulte" }]);
  assert.deepEqual(result.items[0].prices, { "fc-adulte": "77" });
});
