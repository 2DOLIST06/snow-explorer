const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const component = fs.readFileSync(path.join(root, "src/components/stations/StationV3Page.tsx"), "utf8");
const preview = fs.readFileSync(path.join(root, "pages/admin/stations/[slug]/preview-v3.tsx"), "utf8");
const editor = fs.readFileSync(path.join(root, "pages/admin/stations/[slug].tsx"), "utf8");

test("V3 keeps every primary section in one reorderable page", () => {
  assert.match(component, /const DEFAULT_ORDER[^;]+apercu[^;]+meteo-neige[^;]+webcams[^;]+forfaits[^;]+plan-des-pistes/);
  assert.match(component, /setOrder\(\[section, \.\.\.DEFAULT_ORDER\.filter/);
  assert.match(component, /order\.map\(\(section\)/);
  assert.match(component, /type="button" aria-pressed=/);
  assert.doesNotMatch(component, /router\.push|window\.location|href=.*meteo-neige/);
});

test("V3 reuses the public business widgets and legacy hero", () => {
  for (const reused of ["StationLegacyHero", "StationForfaitsBlocks", "MeteoblueSkiWidget", "StationWebcamsBlock", "WebcamsAuto", "PlanPistesFigure", "StationMapCard", "SkiAreaPublicCard"]) assert.match(component, new RegExp(reused));
  assert.match(component, /resolveStationPisteMap/);
  assert.match(component, /getV2Content/);
});

test("V3 receives and renders the exact V1 forfaits result", () => {
  const v1 = fs.readFileSync(path.join(root, "pages/stations/[slug].tsx"), "utf8");
  const shared = fs.readFileSync(path.join(root, "src/components/stations/StationForfaitsBlocks.tsx"), "utf8");
  assert.match(v1, /resolveStationForfaits\(cfg\?\.forfaits, loadedResort\.ski_pass\)/);
  assert.match(preview, /resolveStationForfaits\(widgets\.forfaits, raw\.ski_pass\)/);
  assert.match(v1, /<StationForfaitsBlocks widgets=\{cfg\}/);
  assert.match(component, /<StationForfaitsBlocks widgets=\{widgets\}/);
  assert.doesNotMatch(component, /getV2Section\(station, "forfaits"\)|raw\.ski_pass|is_active/);
  assert.match(shared, /StationForfaitsBlock[\s\S]+StationForfaitsBlock/);
});

test("V3 preview is authenticated, noindex and never persists a layout value", () => {
  assert.match(editor, /Prévisualiser la fiche V3/);
  assert.match(preview, /auth\.status !== "authenticated"/);
  assert.match(component, /preview \? "noindex, nofollow"/);
  assert.doesNotMatch(preview, /page_layout_version\s*=/);
  assert.doesNotMatch(preview, /method:\s*["'](?:POST|PUT|PATCH)/);
});
