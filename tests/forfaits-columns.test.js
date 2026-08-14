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

test("admin forfait columns offer presets while retaining a custom text field", () => {
  assert.match(adminSource, /Saisir un nom personnalisé/);
  assert.match(
    adminSource,
    /FORFAIT_COLUMN_SUGGESTIONS = \["Adulte", "Enfant", "Senior", "Enfant \/ Senior"\]/,
  );
  assert.match(adminSource, /<select[\s\S]*Proposition pour la colonne/);
});

test("admin forfait rows offer duration presets while retaining a custom text field", () => {
  assert.match(adminSource, /Saisir un type personnalisé/);
  assert.match(adminSource, /FORFAIT_ROW_SUGGESTIONS = \[[\s\S]*"Demi-journée"/);
  assert.match(adminSource, /"1 jour"[\s\S]*"10 jours"[\s\S]*"Saison"/);
  assert.match(adminSource, /Proposition pour la ligne/);
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
