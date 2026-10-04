const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const component = fs.readFileSync(path.join(root, "src/components/stations/StationV3Page.tsx"), "utf8");
const preview = fs.readFileSync(path.join(root, "pages/admin/stations/[slug]/preview-v3.tsx"), "utf8");
const editor = fs.readFileSync(path.join(root, "pages/admin/stations/[slug].tsx"), "utf8");
const publicPage = fs.readFileSync(path.join(root, "pages/stations/[slug].tsx"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "src/lib/sitemap.ts"), "utf8");
const { getStationPresentation, getStationPisteDetails } = require("../src/lib/stationOverview");

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

test("the retained V3 preview is authenticated, noindex and never persists a layout value", () => {
  assert.match(preview, /auth\.status !== "authenticated"/);
  assert.match(component, /preview \? "noindex, nofollow"/);
  assert.doesNotMatch(preview, /page_layout_version\s*=/);
  assert.doesNotMatch(preview, /method:\s*["'](?:POST|PUT|PATCH)/);
});

test("every canonical station URL renders V3 without consulting a layout version", () => {
  assert.match(publicPage, /<StationV3Page station=\{resort\} widgets=\{cfg\} departmentStations=\{departmentStations\}/);
  const selector = publicPage.slice(publicPage.indexOf("const ResortPage"), publicPage.indexOf("/* =========================\n * SSR"));
  assert.doesNotMatch(selector, /page_layout_version|StationV2Page|LegacyResortPage/);
  assert.match(component, /const canonical = `\$\{ORIGIN\}\/stations\/\$\{encodeURIComponent\(station\.slug\)\}`/);
});

test("admin only exposes clearly named station editorial content", () => {
  assert.match(editor, /title="Contenus de la fiche station"/);
  for (const label of ["Aperçu", "Météo & enneigement", "Forfaits", "Plan des pistes", "Webcams"]) assert.match(editor, new RegExp(`"${label}"`));
  for (const removed of ["Version actuelle", "Activer la nouvelle fiche station", "Prévisualiser la nouvelle fiche", "Prévisualiser la fiche V3", "Contenus de la nouvelle fiche"]) assert.doesNotMatch(editor, new RegExp(removed));
});

test("the sitemap publishes one station URL and no historical section URL", () => {
  assert.match(sitemap, /url: `\$\{SITE_ORIGIN\}\/stations\/\$\{encodeURIComponent\(slug\)\}`/);
  assert.doesNotMatch(sitemap, /sitemapV2Sections|V2_SECTION_KEYS|\/stations\/\$\{encodeURIComponent\(slug\)\}\/\$\{section\}/);
});

test("V3 SEO is self-referencing, indexable and keeps specific metadata", () => {
  assert.match(component, /text\(station\.meta_title\) \|\|/);
  assert.match(component, /text\(station\.meta_description\) \|\|/);
  assert.match(component, /<link rel="canonical" href=\{canonical\}/);
  assert.match(component, /preview \? "noindex, nofollow" : "index, follow"/);
  assert.match(component, /<SectionHeading id="v3-overview-title"/);
});

test("V3 overview keeps the V1 presentation independently from optional V2 editorial content", () => {
  assert.deepEqual(getStationPresentation({ description_md: "Premier paragraphe.\n\nSecond paragraphe." }), ["Premier paragraphe.", "Second paragraphe."]);
  assert.deepEqual(getStationPresentation({}, { description: { html: "Texte historique V1" } }), ["Texte historique V1"]);
  assert.match(component, /descriptionParagraphs\.map/);
  assert.match(component, /editorial\(getV2Content\(station, "apercu"\)\)/);
});

test("V3 displays piste difficulty details only for strictly positive real values", () => {
  const station = { description_md: "Présentation", pistes_colors: { green: 3, blue: 4, red: 6, black: 2 } };
  assert.deepEqual(getStationPisteDetails(station).map(({ color, value }) => [color, value]), [["green", 3], ["blue", 4], ["red", 6], ["black", 2]]);
  assert.deepEqual(getStationPisteDetails({ pistes_colors: { green: 0, blue: 0, red: 0, black: 0 } }), []);
  assert.deepEqual(getStationPisteDetails({ pistes_colors: { green: null, blue: 4, red: undefined, black: 0 } }).map(({ color, value }) => [color, value]), [["blue", 4]]);
  assert.match(component, /pistes\.length \? <div className="v3-pistes"><h3>Pistes par difficulté<\/h3>/);
});
