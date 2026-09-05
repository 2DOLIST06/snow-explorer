const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fixture = require("./fixtures/anmsm-coverage.json");
const page = fs.readFileSync("pages/admin/anmsm/coverage.tsx", "utf8");
const api = fs.readFileSync("src/lib/adminCoverageApi.ts", "utf8");
const contract = fs.readFileSync("src/lib/anmsmCoverage.ts", "utf8");

test("fixture covers the coverage workflow and server pagination", () => {
  const resources = fixture.snow_explorer_stations.flatMap(row => Object.values(row.resources));
  for (const status of ["published", "ready_to_review", "to_prepare", "available_not_imported", "missing_from_anmsm", "error", "unknown"]) assert.ok(resources.some(resource => resource.workflow_status === status));
  assert.ok(fixture.snow_explorer_stations.some(row => Object.keys(row.resources.logo).length === 0));
  assert.ok(fixture.anmsm_only_stations[0].suggestion);
  assert.ok(fixture.snow_explorer_pagination.total_pages > 1);
  const empty = { ...fixture, snow_explorer_stations: [], anmsm_only_stations: [], snow_explorer_pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 }, anmsm_only_pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } };
  assert.equal(empty.snow_explorer_stations.length, 0);
});
test("page provides tabs, global counters, server controls, details and French labels", () => {
  for (const label of ["Stations Snow Explorer", "Uniquement chez ANMSM", "Exporter les stations à contacter", "Suggestion non validée", "Logo et plan des pistes à demander", "Disponibilité ANMSM à contrôler", "Présent — provenance inconnue", "Voir le détail"]) assert.match(page + contract, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const parameter of ["tab", "search", "filter", "sort", "page", "page_size"]) assert.match(page + contract, new RegExp(parameter));
  assert.match(page, /data\.stats/); assert.match(page, /pagination\.total/); assert.match(page, /router\.replace/);
});
test("initial coverage request has exactly the endpoint path and no query string", () => {
  assert.match(api, /getAnmsmCoverage\(\)/);
  assert.match(api, /coverageUrl\(buildCoverageApiParams\(\)\)/);
  assert.match(contract, /buildCoverageApiParams = \(\) => new URLSearchParams\(\)/);
  assert.match(api, /query \? `\?\$\{query\}` : ""/);
});
test("frontend URL state is isolated from the API allowlist", () => {
  assert.match(page, /router\.query\.tab/);
  assert.match(page, /query\.tab === "snow_explorer" \? <SnowTable/);
  assert.match(page, /<OnlyTable data=\{data\}/);
  for (const forbidden of ["tab", "search", "filter", "sort", "page", "page_size", "status", "collection"]) {
    assert.doesNotMatch(contract, new RegExp(`buildCoverageApiParams[^;]+(?:set|append)\\(["']${forbidden}["']`, "s"));
  }
  assert.doesNotMatch(contract, /set\(["']sort["'],\s*q\.sort|sort=business/);
  assert.doesNotMatch(api, /router\.query|CoverageQuery/);
});
test("both response collections feed their UI tab and errors preserve loaded data", () => {
  assert.match(page, /data\.snow_explorer_stations\.map/);
  assert.match(page, /data\.anmsm_only_stations\.map/);
  assert.match(page, /\{error && <p[^>]+role="alert"/);
  assert.match(page, /!loading && data &&/);
  assert.doesNotMatch(page, /setData\(null\)/);
});
test("coverage transport is read-only and exports the backend CSV", () => {
  assert.match(contract, /new URLSearchParams\(\{ format: "csv" \}\)/);
  assert.match(api, /Content-Type/); assert.match(api, /Content-Disposition/);
  assert.doesNotMatch(page + api, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(page, /préparer un média|publier un média|supprimer un média/i);
});
test("validation and diagnostic HTTP errors are explicit", () => {
  assert.match(contract, /stats ou collections absentes/); assert.match(contract, /Objet resources absent/); assert.match(contract, /Statut de workflow non supporté/); assert.match(contract, /Nombres de pagination invalides/);
  for (const status of [401, 403, 404, 500]) assert.match(api, new RegExp(String(status)));
  assert.doesNotMatch(page, />\{[^}]*\}\s*null/);
});
test("successful development loads log response keys only", () => {
  assert.match(api, /process\.env\.NODE_ENV === "development"/);
  assert.match(api, /console\.info\("\[ANMSM coverage\] response keys", Object\.keys\(payload\)\)/);
  assert.doesNotMatch(api, /console\.(?:log|info).*token|console\.(?:log|info).*cookie|console\.(?:log|info).*authorization/i);
});
