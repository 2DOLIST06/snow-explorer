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

test("homepage selection shows the most recently modified stations first", () => {
  const { getLatestAddedResorts, parseResortsPayload } = loadResortsApi();
  const resorts = [
    {
      id: "station-c",
      name: "Station C",
      created_at: "2026-08-23T17:00:00Z",
      updated_at: "2026-08-22T18:00:00Z",
    },
    { id: "unknown" },
    {
      id: "station-a",
      name: "Station A",
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2026-08-23T16:30:00Z",
    },
    { id: "invalid", updated_at: "not-a-date" },
    {
      id: "station-b",
      name: "Station B",
      created_at: "2026-08-23T18:00:00Z",
      updated_at: "2026-08-23T14:00:00Z",
    },
  ];

  const parsed = parseResortsPayload({ results: resorts });

  assert.equal(parsed[0].updated_at, "2026-08-22T18:00:00Z");

  assert.deepEqual(
    getLatestAddedResorts(parsed, 3).map((resort) => resort.id),
    ["station-a", "station-b", "station-c"],
  );
  assert.deepEqual(
    resorts.map((resort) => resort.id),
    ["station-c", "unknown", "station-a", "invalid", "station-b"],
    "the API result must not be mutated",
  );
});

test("stations without a valid modification date keep their API order as a fallback", () => {
  const { getLatestAddedResorts } = loadResortsApi();
  const resorts = [{ id: "first" }, { id: "second" }];

  assert.deepEqual(
    getLatestAddedResorts(resorts).map((resort) => resort.id),
    ["first", "second"],
  );
});
