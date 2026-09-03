const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("pages/admin/anmsm/logos.tsx", "utf8");
const api = fs.readFileSync("src/lib/api/anmsmLogos.ts", "utf8");
const types = fs.readFileSync("src/types/anmsmLogo.ts", "utf8");
const css = fs.readFileSync("src/styles/globals.css", "utf8");

test("the workspace is loaded first and retained when a refresh fails", () => {
  assert.match(api, /getAnmsmWorkspace.*\/workspace/);
  assert.match(page, /const data = await getAnmsmWorkspace\(\)/);
  assert.doesNotMatch(page, /catch \(error\) \{ setWorkspace\(null\)/);
  assert.match(page, /API indisponible/);
});

test("one compact table compares old, optimized and real-site logos", () => {
  for (const heading of ["Logo actuellement publié", "Nouveau logo ANMSM optimisé", "Rendu réel sur le site"]) assert.match(page, new RegExp(heading));
  assert.match(page, /current_logo_url/); assert.match(page, /candidate_preview_url/);
  assert.match(page, /StationLogoFrame.*preview="desktop"/); assert.match(page, /StationLogoFrame.*preview="mobile"/);
  assert.doesNotMatch(page, /anmsm-card|anmsm-tabs|<StationMappings/);
});

test("preparation is sequential, resumable, checksum-aware and bounded to three attempts", () => {
  assert.match(page, /candidate\.checksum !== row\.anmsm_logo_checksum/);
  assert.match(page, /for \(let index = 0; index < queue\.length; index \+= 1\)/);
  assert.match(page, /if \(!await prepareOne\(queue\[index\]\)\)/);
  assert.match(page, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(page, /error\.status === 0 \|\| error\.status === 502/);
  assert.match(page, /stopRequested\.current/); assert.match(page, />Arrêter</); assert.match(page, />Reprendre</);
  assert.doesNotMatch(page, /Promise\.all/);
});

test("a failed preparation keeps candidates and processing continues", () => {
  assert.match(page, /Préparation échouée/);
  assert.match(page, /errors \+= 1/);
  assert.doesNotMatch(page, /setWorkspace\(current => null/);
});

test("exact and manual mappings use real backend identifiers and stay in table flow", () => {
  assert.match(page, /row\.mapping/); assert.match(page, /normalized_exact/);
  assert.match(page, /external_station_id: row\.external_station_id, station_id: resort\.station_id/);
  assert.match(api, /confirm.*\{ mappings \}/);
  assert.match(page, /Rechercher une station Snow Explorer/);
  assert.match(page, /value\.trim\(\)\.length < 2/);
  assert.match(css, /anmsm-inline-picker ul\{position:static;max-height:170px;overflow:auto/);
  assert.doesNotMatch(css, /anmsm-inline-picker ul\{position:(fixed|absolute)/);
});

test("selection uses candidate ids globally and survives workspace updates", () => {
  assert.match(page, /useState<Set<number>>\(new Set\(\)\)/);
  assert.match(page, /ready\.map\(row => row\.candidate!\.candidate_id\)/);
  assert.match(page, /Tout sélectionner les logos prêts/); assert.match(page, /Tout décocher/);
  assert.doesNotMatch(page, /setSelected\(new Set\(\)\).*prepareOne/);
});

test("bulk publishing handles complete and partial success without navigation", () => {
  assert.match(api, /bulkApproveAnmsmLogos.*bulk-approve.*\{ candidate_ids \}/);
  assert.match(page, /window\.confirm\(`Publier \$\{candidate_ids\.length\} logos sélectionnés \? Les anciens logos seront conservés\.`\)/);
  assert.match(page, /result\.results\.filter\(item => item\.ok\)/);
  assert.match(page, /status: "published"/); assert.match(page, /Publication échouée/);
  assert.match(page, /filter\(id => !succeeded\.has\(id\)\)/);
  assert.doesNotMatch(page, /router\.(push|replace)/);
});

test("published candidates are not selectable", () => {
  assert.match(page, /candidate\?\.status === "ready"/);
  assert.match(page, /candidate\?\.status === "published" \? "Déjà publié"/);
  assert.match(page, /disabled=\{!selectable\}/);
});

test("presigned previews are used verbatim and refreshed after expiry", () => {
  assert.match(types, /candidate_preview_url: string \| null/);
  assert.match(page, /src=\{candidate\?\.candidate_preview_url\}/);
  assert.match(page, /onExpired=\{\(\) => void refresh\(\)\}/);
  assert.doesNotMatch(page + api, /optimized_s3_key|amazonaws|localStorage|sessionStorage|URLSearchParams/);
});

test("preview dimensions, containment, accessibility and mobile ordering are explicit", () => {
  assert.match(css, /station-overview-card__logo--desktop\{width:112px!important;height:112px!important/);
  assert.match(css, /station-overview-card__logo--mobile\{width:88px!important;height:88px!important/);
  assert.match(css, /anmsm-logo-image img\{width:100%;height:100%;object-fit:contain/);
  assert.match(page, /Sélectionner le logo de/); assert.match(page, /aria-label=\{`Préparation des logos/);
  assert.match(css, /data-label="Station"\]\{order:1/); assert.match(css, /data-label="État"\]\{order:6/);
});

test("only final backend routes remain in the logo workflow", () => {
  for (const route of ["/workspace", "/prepare", "/bulk-approve"]) assert.match(api, new RegExp(route));
  assert.doesNotMatch(api + page, /\/selection|\/sync|bulk-ignore|bulk-reprocess|\/restore/);
  assert.match(api, /adminFetch\(path, init\)/);
});
