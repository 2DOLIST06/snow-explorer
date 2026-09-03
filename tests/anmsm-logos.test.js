const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("pages/admin/anmsm/logos.tsx", "utf8");
const api = fs.readFileSync("src/lib/api/anmsmLogos.ts", "utf8");
const frame = fs.readFileSync("src/components/stations/StationLogoFrame.tsx", "utf8");
const publicPage = fs.readFileSync("pages/stations/[slug].tsx", "utf8");
const css = fs.readFileSync("src/styles/globals.css", "utf8");

test("the authenticated admin navigation exposes the ANMSM review page", () => {
  assert.match(fs.readFileSync("src/components/admin/AdminBar.tsx", "utf8"), /href="\/admin\/anmsm\/logos">Logos ANMSM/);
  assert.match(fs.readFileSync("pages/_app.tsx", "utf8"), /<AdminRoute>/);
});
test("published and candidate logos are compared and use the real public frame", () => {
  assert.match(page, /Logo publié/); assert.match(page, /Nouveau logo optimisé/);
  assert.match(page, /StationLogoFrame preview="desktop"/); assert.match(page, /StationLogoFrame preview="mobile"/);
  assert.match(publicPage, /<StationLogoFrame src=\{resort\.logo_url\}/);
  assert.match(frame, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(css, /station-overview-card__logo img\{width:100%;height:100%;object-fit:contain\}/);
  assert.match(css, /station-overview-card__logo--desktop\{width:112px!important;height:112px!important/);
  assert.match(css, /station-overview-card__logo--mobile\{width:88px!important;height:88px!important/);
});
test("horizontal and vertical logos cannot be distorted or cropped", () => {
  assert.match(css, /anmsm-picture img\{width:100%;height:100%;object-fit:contain;object-position:center\}/);
  assert.match(css, /station-overview-card__logo img\{object-position:center\}/);
});
test("all warning labels and blocking errors are explicit", () => {
  for (const code of ["extreme_horizontal_ratio", "extreme_vertical_ratio", "low_visual_occupancy", "large_transparent_margins", "low_source_resolution", "source_over_size_limit", "optimized_file_over_50kb", "download_failed", "unsupported_format", "conversion_failed", "transparency_lost", "station_mapping_required", "s3_upload_failed"]) assert.match(page, new RegExp(code));
  assert.match(page, /Cette erreur empêche la validation/); assert.match(page, /disabled=\{busy \|\| blocking\(item\)\}/);
});
test("individual, page-wide, filtered and clear selection are available", () => {
  assert.match(page, /Sélectionner le logo de/); assert.match(page, /Tout sélectionner sur cette page/);
  assert.match(page, /Tout sélectionner dans les résultats/); assert.match(page, /selectAllAnmsmLogos\(filters\)/); assert.match(page, /Tout décocher/);
});
test("bulk approval, partial failure, ignore, reprocess and restore are backend-confirmed", () => {
  assert.match(page, /Confirmer la validation/); assert.match(page, /result\.failed/); assert.match(page, /détail des échecs/);
  assert.match(page, /Conserver les logos actuels/); assert.match(page, /Relancer l’optimisation/); assert.match(page, /Restaurer l’ancien logo/);
  assert.match(api, /bulk-approve/); assert.match(api, /bulk-ignore/); assert.match(api, /bulk-reprocess/); assert.match(api, /\/restore/);
});
test("manual synchronization reports all counters and already-running state", () => {
  assert.match(page, /Vérifier maintenant les logos ANMSM/); assert.match(api, /\/sync/);
  for (const label of ["Stations reçues", "Stations associées", "Stations non associées", "Nouveaux logos", "Logos modifiés", "Logos inchangés", "Stations sans logo", "Conversions réussies", "Erreurs", "Durée de la synchronisation"]) assert.match(page, new RegExp(label));
  assert.match(page, /synchronisation ANMSM est déjà en cours/);
});
test("every ANMSM route uses the shared authenticated cookie-session client", () => {
  assert.match(api, /adminFetch\(path, init\)/);
  assert.doesNotMatch(api, /\bfetch\(/);
  for (const route of ["/sync", "/bulk-approve", "/bulk-ignore", "/bulk-reprocess", "/restore"]) assert.match(api, new RegExp(route));
  const adminClient = fs.readFileSync("src/lib/adminApi.ts", "utf8");
  assert.match(adminClient, /credentials: "include"/);
  assert.match(adminClient, /headers\.set\("X-CSRF-Token", csrf\)/);
  assert.match(adminClient, /handlers\?\.onExpired\(\)/);
});
test("sync prevents duplicate POSTs, exposes progress, refreshes on success and distinguishes HTTP failures", () => {
  assert.match(page, /if \(syncInFlight\.current\) return/);
  assert.match(page, /disabled=\{busy\}/);
  assert.match(page, /Synchronisation en cours…/);
  assert.match(page, /else await load\(\)/);
  for (const status of [401, 403, 405, 409, 422, 500, 502, 503, 504]) assert.match(api, new RegExp(`\\b${status}:`));
  assert.match(page, /HTTP \$\{e\.status\}/);
  assert.match(page, /JSON\.stringify\(e\.payload/);
});
test("filters persist in the URL and pagination is server-driven", () => {
  assert.match(page, /router\.replace\(\{ pathname: router\.pathname, query \}/); assert.match(page, /shallow: true/);
  assert.match(page, /Page précédente/); assert.match(page, /Page suivante/); assert.match(api, /URLSearchParams/);
});
test("the browser only calls the Flask API and never uploads or computes logo assets", () => {
  assert.doesNotMatch(page + api, /aws-sdk|S3Client|PutObject|crypto\.subtle|createHash|FormData|presign/i);
  assert.doesNotMatch(page, /fetch\(|axios|amazonaws\.com/);
  assert.match(api, /adminFetch/); assert.match(api, /\/api\/admin\/anmsm\/logos/);
});

test("station mappings normalize the backend snake_case contract once", () => {
  const mappings = fs.readFileSync("src/components/admin/anmsm/StationMappings.tsx", "utf8");
  const types = fs.readFileSync("src/types/anmsmLogo.ts", "utf8");
  assert.match(api, /normalizeStationMappingsResponse/);
  for (const field of ["external_name", "external_station_id", "match_type", "station_id", "without_logo", "per_page"]) assert.match(api + types, new RegExp(field));
  for (const field of ["externalName", "externalStationId", "matchType", "stationId", "withoutLogo", "totalPages"]) assert.match(mappings, new RegExp(field));
  assert.match(mappings, /response\.pagination\.totalPages/);
  assert.match(mappings, /suggestion\.matchType === "normalized_exact"/);
  assert.match(mappings, /item\.suggestions\.map/);
  assert.doesNotMatch(mappings, /suggestion_type|suggested_resort|anmsm_station_name|anmsm_logo_url/);
});

test("the ANMSM media host is allowed without removing existing image hosts", () => {
  const config = fs.readFileSync("next.config.js", "utf8");
  assert.match(config, /hostname: "anmsm\.media\.tourinsoft\.eu"/);
  assert.match(config, /pathname: "\/upload\/\*\*"/);
  assert.match(config, /hostname: "d38x6kuhd141c9\.cloudfront\.net"/);
});
