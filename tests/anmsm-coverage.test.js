const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fixture = require("./fixtures/anmsm-coverage.json");
const page = fs.readFileSync("pages/admin/anmsm/coverage.tsx", "utf8");
const api = fs.readFileSync("src/lib/adminCoverageApi.ts", "utf8");
const contract = fs.readFileSync("src/lib/anmsmCoverage.ts", "utf8");

const viewLabels = ["À traiter", "Toutes les stations Snow Explorer", "Stations non associées à ANMSM", "Disponibilité ANMSM à contrôler", "Stations à contacter", "Logos disponibles à récupérer", "Plans disponibles à récupérer", "Logos à préparer", "Plans à préparer", "Logos à vérifier", "Plans à vérifier", "Logos publiés depuis ANMSM", "Plans publiés depuis ANMSM", "Erreurs", "Stations uniquement chez ANMSM"];
test("the single view menu has every business view in the required order", () => {
  let cursor = -1; for (const label of viewLabels) { const next = page.indexOf(label); assert.ok(next > cursor, label); cursor = next; }
  assert.equal((page.match(/aria-label="Afficher"/g) || []).length, 1);
  assert.doesNotMatch(page, /coverage-summary|coverage-tabs|Retirer le filtre|Réinitialiser|Filtres rapides|STAT_LABELS/);
});
test("the selected view is filtered before search and local display pagination", () => {
  assert.match(page, /const selectedRows[^;]+filterRowsForSelectedView/);
  assert.match(page, /const searchedSnow = selectedRows\.filter/);
  assert.match(page, /const visibleRows = allVisible\.slice/);
  assert.doesNotMatch(page, /<SnowTable[^>]+data\.snow_explorer_stations/);
  assert.match(contract, /logo_published: status\("logo", "published"\)/);
  assert.match(contract, /map_published: status\("piste_map", "published"\)/);
});
test("representative stations satisfy distinct exact views", () => {
  const rows = fixture.snow_explorer_stations;
  const unmatched = rows.filter(row => row.mapping_status === "unmatched" || row.mapping_status == null || row.mapping_validated === false);
  const logos = rows.filter(row => row.resources.logo.workflow_status === "published");
  const maps = rows.filter(row => row.resources.piste_map.workflow_status === "published");
  const errors = rows.filter(row => row.mapping_status === "mapping_error" || [row.resources.logo, row.resources.piste_map].some(resource => resource.workflow_status === "error" || resource.error));
  const contacts = rows.filter(row => row.needs_station_contact === true);
  assert.ok(unmatched.length && logos.length && maps.length && errors.length && contacts.length);
  const unknownUnmatched = rows.find(row => row.mapping_status === "unmatched");
  assert.ok(!logos.includes(unknownUnmatched)); assert.ok(!maps.includes(unknownUnmatched));
  assert.notDeepEqual(logos.map(x => x.station_id), maps.map(x => x.station_id));
});
test("totals use complete collections, never the current response page as a global total", () => {
  assert.match(api, /totalPages[\s\S]+Promise\.all/); assert.match(api, /snow_explorer_pagination\.total_pages/);
  assert.match(api, /new Map\(all\.flatMap/); assert.doesNotMatch(page, /snow_explorer_stations\.length/);
  assert.match(page, /allVisible\.length\.toLocaleString/);
});
test("ANMSM-only rows stay in their exclusive table", () => {
  assert.match(page, /view === "anmsm_only" \? <OnlyTable/);
  assert.match(page, /data\?\.anmsm_only_stations/);
  assert.match(page, /Suggestion non validée/); assert.match(page, /Vérifier si la station existe dans Snow Explorer/);
});
test("the simplified tables expose only five columns and human labels", () => {
  for (const heading of ["Station", "Association ANMSM", "Logo", "Plan des pistes", "À faire"]) assert.match(page, new RegExp(`<th>${heading}`));
  assert.doesNotMatch(page, /<th>Couverture|<th>État|<th>Actions|<th>Identifiant/);
  for (const raw of ["needs_control", "available_not_imported", "ready_to_review"]) assert.doesNotMatch(page, new RegExp(`>${raw}<`));
});
test("export is exclusive to contact view and transport remains read-only", () => {
  assert.match(page, /view === "contact" && <button[^>]+[\s\S]*Exporter les stations à contacter/);
  assert.equal((page.match(/Exporter les stations à contacter/g) || []).length, 1);
  assert.doesNotMatch(page + api, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});
test("only documented pagination reaches the API, while frontend URL state stays local", () => {
  assert.match(contract, /params\.set\("page"/); assert.match(contract, /params\.set\("page_size"/);
  for (const forbidden of ["view", "search", "tab", "filter", "sort", "business"]) assert.doesNotMatch(contract, new RegExp(`params\\.set\\(["']${forbidden}`));
  assert.match(page, /query: \{ view: values\.view,[\s\S]+search: values\.search[\s\S]+page: String/);
});
