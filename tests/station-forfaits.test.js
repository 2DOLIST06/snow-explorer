const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("src/lib/stationForfaits.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const stationForfaitsModule = { exports: {} };
new Function("exports", "require", "module", compiled)(
  stationForfaitsModule.exports,
  require,
  stationForfaitsModule,
);
const { normalizeLegacyStationForfaits, normalizeStationSkiPass } = stationForfaitsModule.exports;

test("legacy station passes keep their enabled flag and season periods", () => {
  const normalized = normalizeLegacyStationForfaits({
    enabled: true,
    columns: [{ id: "adult", label: "Adulte" }],
    items: [{ id: "day", title: "1 jour", prices: { adult: 42 } }],
    season: { periods: [{ id: "low", passes: [] }] },
  });

  assert.equal(normalized.enabled, true);
  assert.equal(normalized.items[0].prices.adult, 42);
  assert.equal(normalized.periods[0].id, "low");
});

test("inactive or missing normalized ski passes stay hidden", () => {
  assert.equal(normalizeStationSkiPass(null), undefined);
  assert.equal(normalizeStationSkiPass({ is_active: false }), undefined);
});

test("active station ski passes are sorted and prices are attached to their period", () => {
  const normalized = normalizeStationSkiPass({
    id: "season-1",
    is_active: true,
    season: "2026-2027",
    currency: "EUR",
    source_url: "https://station.example/tarifs",
    periods: [
      { id: 2, name: "Haute", start_date: "2027-02-01", end_date: "2027-03-01", sort_order: 20 },
      { id: 1, name: "Basse", start_date: "2026-12-01", end_date: "2027-01-31", sort_order: 10 },
    ],
    passes: [{
      id: "day",
      name: "1 jour",
      duration_days: 1,
      duration_label: "1 jour",
      sort_order: 1,
      prices: [
        { period_id: "1", category: "adult", category_label: "Adulte", price_type: "fixed", price: 42, price_min: null, price_max: null },
        { period_id: 2, category: "adult", category_label: "Adulte", price_type: "fixed", price: 55, price_min: null, price_max: null },
      ],
    }],
  });

  assert.equal(normalized.enabled, true);
  assert.deepEqual(normalized.periods.map((period) => period.id), [1, 2]);
  assert.deepEqual(normalized.periods.map((period) => period.passes[0].prices[0].price), [42, 55]);
  assert.equal(normalized.season, "2026-2027");
  assert.equal(normalized.source_url, "https://station.example/tarifs");
});

test("station detail and forfaits pages share the normalized ski-pass preparation", () => {
  const stationPage = fs.readFileSync("pages/stations/[slug].tsx", "utf8");
  const forfaitsPage = fs.readFileSync("pages/forfaits.tsx", "utf8");

  assert.match(stationPage, /normalizeStationSkiPass\(loadedResort\.ski_pass\)/);
  assert.match(forfaitsPage, /normalizeStationSkiPass\(payload\.ski_pass\)/);
  assert.match(forfaitsPage, /getSkiPassBlocksVisibility/);
  assert.doesNotMatch(forfaitsPage, /hasActiveForfaits/);
});

test("public forfait selection uses one aggregate request and never loads station detail directly", () => {
  const page = fs.readFileSync("pages/forfaits.tsx", "utf8");
  assert.match(page, /fetch\(`\/api\/ski\/stations\/\$\{encodedSlug\}-ski-passes`\)/);
  assert.doesNotMatch(page, /fetch\(`\/api\/ski\/resorts\/\$\{encodedSlug\}`/);
  assert.doesNotMatch(page, /fetch\(`\/api\/ski\/stations\/\$\{encodedSlug\}-widgets`/);
  assert.doesNotMatch(page, /Promise\.allSettled/);
});

test("a failed aggregate request is rendered as an explicit error, not an empty complete result", () => {
  const page = fs.readFileSync("pages/forfaits.tsx", "utf8");
  assert.match(page, /if \(!response\.ok\) throw new Error\("ski_passes_fetch_failed"\)/);
  assert.match(page, /setLoadError\(true\)/);
  assert.match(page, /role="alert"/);
  assert.doesNotMatch(page, /catch \{\s*setSelected/);
});
