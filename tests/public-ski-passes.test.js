const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const compiled = ts.transpileModule(fs.readFileSync("src/lib/publicSkiPasses.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function("exports", "require", "module", compiled)(moduleUnderTest.exports, require, moduleUnderTest);
const { loadPublicSkiPasses } = moduleUnderTest.exports;

const season = { id: 1, is_active: true, season: "2026-2027", currency: "EUR", periods: [], passes: [] };

test("canonical response skips widgets when it certifies legacy is not required", async () => {
  let canonicalCalls = 0;
  let legacyCalls = 0;
  const result = await loadPublicSkiPasses(
    async () => { canonicalCalls += 1; return { ski_pass: season, legacy_required: false }; },
    async () => { legacyCalls += 1; return {}; },
  );
  assert.equal(canonicalCalls, 1);
  assert.equal(legacyCalls, 0);
  assert.equal(result.ski_pass.season, "2026-2027");
  assert.equal(result.legacy_fallback, "not_required");
});

test("canonical embedded legacy prices retain all visible legacy fields without widgets", async () => {
  let legacyCalls = 0;
  const legacy = { enabled: true, columns: [{ id: "adult", label: "Adulte" }], items: [{ id: "day", prices: { adult: 42 } }], periods: [], season: "2025-2026", source_url: "https://example.test" };
  const result = await loadPublicSkiPasses(
    async () => ({ ski_pass: season, legacy_forfaits: legacy }),
    async () => { legacyCalls += 1; return {}; },
  );
  assert.equal(legacyCalls, 0);
  assert.deepEqual(result.legacy_forfaits, legacy);
  assert.equal(result.legacy_fallback, "embedded");
});

test("unknown legacy status uses widgets explicitly and preserves nested payloads", async () => {
  let legacyCalls = 0;
  const legacy = { enabled: true, columns: [], items: [{ id: "historic" }] };
  const result = await loadPublicSkiPasses(
    async () => season,
    async () => { legacyCalls += 1; return { widgets: { forfaits: legacy } }; },
  );
  assert.equal(legacyCalls, 1);
  assert.deepEqual(result.legacy_forfaits, legacy);
  assert.equal(result.legacy_fallback, "widgets");
});

test("canonical and required legacy errors reject instead of returning partial data", async () => {
  await assert.rejects(() => loadPublicSkiPasses(async () => { throw new Error("canonical"); }, async () => ({})), /canonical/);
  await assert.rejects(() => loadPublicSkiPasses(async () => season, async () => { throw new Error("legacy"); }), /legacy/);
});
