const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const page = fs.readFileSync("pages/admin/anmsm/piste-maps.tsx", "utf8");
const api = fs.readFileSync("src/lib/adminPisteMapsApi.ts", "utf8");
const css = fs.readFileSync("src/styles/globals.css", "utf8");
const publicPage = fs.readFileSync("pages/stations/[slug].tsx", "utf8");
const source = fs.readFileSync("src/lib/anmsmPisteMaps.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module("pisteMaps.test.js", module); mod._compile(compiled, "pisteMaps.test.js");
const { normalizePisteMapWorkspace, paginatePisteMaps, pisteMapReady } = mod.exports;

test("complete and empty workspaces are normalized once with safe collections", () => {
  const full = normalizePisteMapWorkspace({ rows: [{ external_station_id: "a", external_map_id: "m", candidate: { candidate_id: 2, status: "ready" } }], stats: { maps_to_review: 1 } });
  assert.equal(full.rows.length, 1); assert.deepEqual(full.rows[0].warnings, []); assert.equal(full.stats.maps_to_review, 1);
  assert.deepEqual(normalizePisteMapWorkspace({ rows: [] }).rows, []);
  const invalid = normalizePisteMapWorkspace({}); assert.deepEqual(invalid.rows, []); assert.ok(invalid.contractError);
  assert.doesNotThrow(() => invalid.rows.filter(Boolean).slice(0).map(Boolean).find(Boolean));
});

test("the real routes and sequential fresh-workspace preparation are used", () => {
  for (const route of ["/workspace", "/prepare", "/bulk-approve", "/station-mappings/confirm"]) assert.match(api, new RegExp(route));
  assert.match(api, /\{ candidate_ids \}/); assert.match(page, /const freshWorkspace = await refresh/);
  assert.match(page, /const queue = workspace\.rows\.filter/); assert.match(page, /await prepareOne\(queue\[index\]\)/); assert.doesNotMatch(page, /Promise\.all/);
});

test("mapping, comparison, filtering, pagination and global exclusive selection remain on one page", () => {
  for (const label of ["Plans à vérifier", "Plans à récupérer", "Stations à associer", "Plans publiés", "Problèmes", "Tous", "Plan actuellement publié", "Nouveau plan ANMSM"]) assert.match(page, new RegExp(label));
  assert.match(page, /value\.trim\(\)\.length < 2/); assert.match(page, /next\.delete\(item\.candidate_id\)/);
  assert.match(page, /Plan principal sélectionné/); assert.match(page, /pageSize.*20/); assert.match(page, /Page précédente/); assert.match(page, /Page suivante/);
  assert.equal(paginatePisteMaps(Array(51).fill(fullRow()), 3, 20).length, 11);
});

test("publication supports partial success and keeps failed selections", () => {
  assert.match(page, /result\.results\.filter\(item => item\.ok\)/); assert.match(page, /filter\(id => !succeeded\.has\(id\)\)/);
  assert.match(page, /current_map_url: row\.candidate\?\.display_url/); assert.match(page, /Plan publié/); assert.match(page, /publication\(s\) impossible/);
});

test("admin previews preserve signed URLs and proportions and open accessibly", () => {
  assert.match(page, /<img src=\{src\}/); assert.doesNotMatch(page + api, /amazonaws|s3_key|new URL/);
  assert.match(css, /piste-map-preview img[^}]*object-fit:contain/); assert.match(css, /piste-map-modal img[^}]*object-fit:contain/);
  assert.match(page, /role="dialog"/); assert.match(page, /event\.key === "Escape"/); assert.match(page, /Pleine largeur/); assert.match(page, /Crédit :/);
});

test("multiple maps per station are ready independently but selected exclusively", () => {
  const a = normalizePisteMapWorkspace({ rows: [fullRow(1), fullRow(2)] }).rows;
  assert.ok(a.every(pisteMapReady)); assert.equal(new Set(a.map(row => row.external_station_id)).size, 1);
  assert.match(page, /for \(const item of rows\).*external_station_id === row\.external_station_id/);
});

test("public large map is created on modal opening only and closes with Escape", () => {
  assert.match(publicPage, /\{open && \([\s\S]*?<img[\s\S]*?src=\{big\}/);
  assert.match(publicPage, /if \(!open\) return;[\s\S]*event\.key === "Escape"/);
});

function fullRow(id = 1) { return { external_station_id: "station", external_station_name: "Station", external_map_id: `map-${id}`, mapping: { station_id: "42", station_name: "Snow", station_slug: "snow" }, candidate_id: id, candidate_status: "pending", candidate: { candidate_id: id, status: "ready", warnings: [], display_url: `https://signed/${id}` } }; }
