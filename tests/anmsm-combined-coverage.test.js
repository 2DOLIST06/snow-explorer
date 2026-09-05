const test = require("node:test");
const assert = require("node:assert/strict");
const { CASE_LABELS, buildCombinedCoverageRows, getCombinedCoverage } = require("../src/lib/anmsmCombinedCoverage");

const snapshot = (id, values = {}) => ({
  external_station_id: id, station_name: `ANMSM ${id}`, observed_at: "2026-09-05T12:00:00Z",
  logo_available: true, logo_observation_complete: true, logo_url: `https://anmsm/logo-${id}`,
  piste_map_available: true, piste_map_observation_complete: true, piste_map_url: `https://anmsm/map-${id}`,
  logo_workflow_status: "unknown", piste_map_workflow_status: "unknown", ...values,
});
const station = (id, logo_url = null, piste_map_url = null) => ({ station_id: id, station_name: `Snow ${id}`, logo_url, piste_map_url });
const mapping = id => ({ external_station_id: id, station_id: id, verified: true });
const candidate = (id, kind, url) => ({ external_station_id: id, station_id: id, status: "approved", published_url: url, kind });

function fixture() {
  const anmsm_snapshots = [
    snapshot("both-published"), snapshot("neither-published"), snapshot("logo-published"), snapshot("map-published"),
    snapshot("unmapped"),
    snapshot("only-logo", { piste_map_available: false }),
    snapshot("only-map", { logo_available: false }),
    snapshot("neither", { logo_available: false, piste_map_available: false }),
    snapshot("unknown", { logo_available: false, logo_observation_complete: false }),
    // An older duplicate must not survive even though its name sorts separately.
    snapshot("unmapped", { observed_at: "2025-01-01T00:00:00Z", station_name: "obsolete duplicate" }),
  ];
  const snow_explorer_stations = [
    station("both-published", "pub-logo", "pub-map"), station("neither-published"),
    station("logo-published", "logo-only", null), station("map-published", null, "map-only"),
    station("only-logo"), station("only-map"), station("neither"), station("unknown"),
    station("snow-only", "manual-logo", "manual-map"),
  ];
  const mappings = ["both-published", "neither-published", "logo-published", "map-published", "only-logo", "only-map", "neither", "unknown"].map(mapping);
  const logo_candidates = [candidate("both-published", "logo", "pub-logo"), candidate("logo-published", "logo", "logo-only")];
  const piste_map_candidates = [candidate("both-published", "piste_map", "pub-map"), candidate("map-published", "piste_map", "map-only")];
  return { anmsm_snapshots, snow_explorer_stations, mappings, logo_candidates, piste_map_candidates };
}

test("the combined contract exposes all required business labels", () => {
  for (const key of ["both_available_all", "both_available_mapped", "both_available_unmapped", "both_available_both_published",
    "both_available_neither_published", "both_available_only_logo_published", "both_available_only_piste_map_published",
    "only_logo_available_confirmed", "only_piste_map_available_confirmed", "neither_available_confirmed", "combined_availability_unknown",
    "snow_explorer_has_both", "snow_explorer_has_neither", "snow_explorer_has_only_logo", "snow_explorer_has_only_piste_map",
    "snow_explorer_without_verified_anmsm_mapping", "anmsm_without_snow_explorer_mapping", "mapped_stations",
    "request_logo_only", "request_piste_map_only", "request_both", "request_none"]) assert.ok(CASE_LABELS[key], key);
  assert.ok(!Object.values(CASE_LABELS).includes("À traiter"));
});

test("availability, publication, current Snow Explorer state and requests are classified independently", () => {
  const { counts } = getCombinedCoverage(fixture());
  assert.deepEqual({ all: counts.both_available_all, mapped: counts.both_available_mapped, unmapped: counts.both_available_unmapped }, { all: 5, mapped: 4, unmapped: 1 });
  assert.equal(counts.both_available_both_published, 1);
  assert.equal(counts.both_available_neither_published, 1);
  assert.equal(counts.both_available_only_logo_published, 1);
  assert.equal(counts.both_available_only_piste_map_published, 1);
  assert.equal(counts.only_logo_available_confirmed, 1);
  assert.equal(counts.only_piste_map_available_confirmed, 1);
  assert.equal(counts.neither_available_confirmed, 1);
  assert.equal(counts.combined_availability_unknown, 2); // partial unknown plus Snow-only row
  assert.equal(counts.snow_explorer_has_both, 2);
  assert.equal(counts.snow_explorer_has_neither, 5);
  assert.equal(counts.snow_explorer_has_only_logo, 1);
  assert.equal(counts.snow_explorer_has_only_piste_map, 1);
  assert.equal(counts.request_logo_only, 1);
  assert.equal(counts.request_piste_map_only, 1);
  assert.equal(counts.request_both, 1);
  assert.equal(counts.request_none, 6);
});

test("approved candidates prove ANMSM publication only while they still match the published URL", () => {
  const input = fixture();
  input.logo_candidates.push({ ...candidate("neither-published", "logo", "old-url"), published_url: "old-url" });
  input.logo_candidates.push({ ...candidate("map-published", "logo", "ignored"), status: "ready" });
  const rows = buildCombinedCoverageRows(input);
  assert.equal(rows.find(row => row.station_id === "both-published").anmsm_logo_published, true);
  assert.equal(rows.find(row => row.station_id === "neither-published").anmsm_logo_published, false);
  assert.equal(rows.find(row => row.station_id === "snow-only").anmsm_logo_published, false, "manual files are not ANMSM publications");
});

test("sum invariants hold and external ANMSM identifiers are unique", () => {
  const result = getCombinedCoverage(fixture());
  const c = result.counts;
  assert.equal(c.both_available_all, c.both_available_mapped + c.both_available_unmapped);
  assert.equal(c.both_available_mapped, c.both_available_both_published + c.both_available_neither_published + c.both_available_only_logo_published + c.both_available_only_piste_map_published);
  assert.equal(fixture().snow_explorer_stations.length, c.snow_explorer_has_both + c.snow_explorer_has_neither + c.snow_explorer_has_only_logo + c.snow_explorer_has_only_piste_map);
  const ids = result.rows.map(row => row.anmsm_external_station_id).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size);
});

test("case and name search are applied before pagination and total is never page length", () => {
  const input = fixture();
  const page1 = getCombinedCoverage(input, { case: "both_available_mapped", page: 1, page_size: 2 });
  const page2 = getCombinedCoverage(input, { case: "both_available_mapped", page: 2, page_size: 2 });
  assert.equal(page1.pagination.total, 4); assert.equal(page1.pagination.total_pages, 2); assert.equal(page1.rows.length, 2); assert.equal(page2.rows.length, 2);
  assert.ok([...page1.rows, ...page2.rows].every(row => row.cases.includes("both_available_mapped")));
  const snowSearch = getCombinedCoverage(input, { search: "Snow only-logo", page_size: 1 });
  const anmsmSearch = getCombinedCoverage(input, { search: "ANMSM unmapped", page_size: 1 });
  assert.equal(snowSearch.pagination.total, 1); assert.equal(anmsmSearch.pagination.total, 1);
});

test("unknown availability cannot become a confirmed absence or station request", () => {
  const row = buildCombinedCoverageRows(fixture()).find(item => item.station_id === "unknown");
  assert.equal(row.anmsm_logo_available, null);
  assert.ok(row.cases.includes("combined_availability_unknown"));
  assert.ok(row.cases.includes("request_none"));
  assert.ok(!row.cases.some(value => ["only_piste_map_available_confirmed", "neither_available_confirmed", "request_logo_only", "request_both"].includes(value)));
});

test("combined workflow filters use both real statuses and return precise per-resource actions", () => {
  const input = fixture();
  Object.assign(input.anmsm_snapshots[0], { logo_workflow_status: "to_prepare", piste_map_workflow_status: "to_prepare" });
  Object.assign(input.anmsm_snapshots[1], { logo_workflow_status: "available_not_imported", piste_map_workflow_status: "ready_to_review" });
  Object.assign(input.anmsm_snapshots[2], { logo_workflow_status: "error", logo_error: "conversion failed" });
  const rows = buildCombinedCoverageRows(input);
  const both = rows.find(row => row.station_id === "both-published");
  assert.ok(both.cases.includes("logo_and_piste_map_to_prepare"));
  assert.deepEqual(both.workflow_actions, [{ resource: "logo", action: "prepare" }, { resource: "piste_map", action: "prepare" }]);
  const mixed = rows.find(row => row.station_id === "neither-published");
  assert.ok(mixed.cases.includes("logo_or_piste_map_to_retrieve")); assert.ok(mixed.cases.includes("logo_or_piste_map_to_review"));
  assert.ok(rows.find(row => row.station_id === "logo-published").cases.includes("logo_or_piste_map_error"));
});
