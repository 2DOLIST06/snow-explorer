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
