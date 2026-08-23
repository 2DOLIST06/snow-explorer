const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadResortsApi() {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/lib/api/resorts.ts"),
    "utf8",
  );
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", javascript)(
    module,
    module.exports,
    require,
  );
  return module.exports;
}

test("homepage selection shows the most recently added stations first", () => {
  const { getLatestAddedResorts } = loadResortsApi();
  const resorts = [
    { id: "old", created_at: "2026-01-10T10:00:00Z" },
    { id: "unknown" },
    { id: "new", created_at: "2026-08-20T10:00:00Z" },
    { id: "invalid", created_at: "not-a-date" },
    { id: "middle", created_at: "2026-05-12T10:00:00Z" },
  ];

  assert.deepEqual(
    getLatestAddedResorts(resorts, 3).map((resort) => resort.id),
    ["new", "middle", "old"],
  );
  assert.deepEqual(
    resorts.map((resort) => resort.id),
    ["old", "unknown", "new", "invalid", "middle"],
    "the API result must not be mutated",
  );
});

test("stations without a creation date keep their API order as a fallback", () => {
  const { getLatestAddedResorts } = loadResortsApi();
  const resorts = [{ id: "first" }, { id: "second" }];

  assert.deepEqual(
    getLatestAddedResorts(resorts).map((resort) => resort.id),
    ["first", "second"],
  );
});
