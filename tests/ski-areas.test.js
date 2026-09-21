const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');

test('ski-area admin uses the exact backend routes and CSRF-aware client', () => {
  const api = read('src/lib/adminSkiAreasApi.ts');
  assert.match(api, /\/api\/admin\/ski-areas\?/);
  assert.match(api, /\/api\/admin\/ski-areas\/\$\{id\}\/\$\{published \? "publish" : "unpublish"\}/);
  assert.match(api, /\/api\/admin\/ski-areas\/station-options\?/);
  assert.match(api, /\/api\/admin\/stations\/\$\{encodeURIComponent\(stationId\)\}\/ski-areas/);
  assert.match(api, /method: "PUT"/);
  assert.match(api, /requireAdminResponse/);
});

test('optional ski-area fields clear with null while zero remains numeric', () => {
  const editor = read('src/components/admin/SkiAreaEditor.tsx');
  assert.match(editor, /payload\[key\] = form\[key\]\.trim\(\) \|\| null/);
  assert.match(editor, /payload\[key\] = form\[key\] === "" \? null : Number\(form\[key\]\)/);
  assert.match(editor, /station_ids: stations\.map/);
});

test('public pages, reciprocal links, drafts, navigation and sitemap are wired', () => {
  const api = read('src/lib/api/skiAreas.ts');
  const card = read('src/components/stations/SkiAreaPublicCard.tsx');
  const station = read('pages/stations/[slug].tsx');
  const sitemap = read('src/lib/sitemap.ts');
  assert.match(api, /\/api\/ski-areas\?page=/);
  assert.match(api, /area\.status === "published"/);
  assert.match(card, /Autres stations du même domaine/);
  assert.match(card, /\/stations\/\$\{station\.slug\}/);
  assert.match(station, /resort\.ski_areas\?\.map/);
  assert.match(station, /area\?\.status === "published"/);
  assert.match(sitemap, /\/domaines-skiables\/\$\{encodeURIComponent\(slug\)\}/);
  assert.match(read('src/components/layout/ProHeader.tsx'), /Domaines skiables/);
  assert.match(read('src/components/admin/AdminBar.tsx'), /\/admin\/domaines-skiables/);
});

test('sitemap fetches all public ski-area pages at the API maximum', () => {
  const api = read('src/lib/api/skiAreas.ts');
  const page = read('pages/sitemap.xml.tsx');
  assert.match(api, /fetchPublicSkiAreasPage\(1, 100\)/);
  assert.match(api, /first\.pagination\.pages - 1/);
  assert.match(page, /fetchAllPublicSkiAreas\(\)/);
});

test('ski-area facts group piste counts and station links use descriptive SEO text', () => {
  const card = read('src/components/stations/SkiAreaPublicCard.tsx');
  assert.match(card, /ski-area-facts__pistes/);
  assert.match(card, /Pistes de ski/);
  assert.match(card, /Découvrir \{station\.name\}/);
  assert.doesNotMatch(card, />Voir la station<\/Link>/);
});

test('station statistics can switch from the station to each published ski area', () => {
  const station = read('pages/stations/[slug].tsx');
  const styles = read('src/styles/globals.css');
  assert.match(station, /useState<"station" \| number>\("station"\)/);
  assert.match(station, /skiAreas\.map\(\(area\) =>/);
  assert.match(station, /aria-pressed=\{selectedScope === area\.id\}/);
  assert.match(station, /const activeStats = selectedSkiArea/);
  assert.match(station, /skiAreaKm: selectedSkiArea\.ski_area_km/);
  assert.match(station, /pistesCount: selectedSkiArea\.pistes_count/);
  assert.match(station, /liftsCount: selectedSkiArea\.lifts_count/);
  assert.match(station, /snowparksCount: selectedSkiArea\.snowparks_count \?\? null/);
  assert.match(station, /openDate: selectedSkiArea\.forecast_open_date/);
  assert.match(station, /closeDate: selectedSkiArea\.forecast_close_date/);
  assert.match(station, /Number\(altMax\) - Number\(altMin\)/);
  assert.match(station, /<PlanPistesFigure name=\{resort\.name\} small=\{mapSmall\}/);
  assert.match(station, /periods=\{cfg\?\.normalizedForfaits\?\.periods \|\| \[\]\}/);
  assert.doesNotMatch(station, /selectedMapSmall|selectedForfaits/);
  assert.match(styles, /\.station-stats-scope button\.is-active/);
});

test('ski-area admin inventory retains every catalog station state', () => {
  const expectations = read('src/components/admin/catalog/SkiAreaExpectations.tsx');
  assert.match(expectations, /Composition complète attendue/);
  assert.match(expectations, /items\.map\(item/);
  assert.match(expectations, /linked:"Rattachée"/);
  assert.match(expectations, /ignored:"Ignorée"/);
});

test('ski-area admin list highlights domains whose expected stations are valid and attached', () => {
  const page = read('pages/admin/domaines-skiables/index.tsx');
  const styles = read('src/styles/globals.css');
  assert.match(page, /listCatalogExpectations/);
  assert.match(page, /expectation\.resolution_state === "linked"/);
  assert.match(page, /attachedIds\.has/);
  assert.match(page, /is_active === true/);
  assert.match(page, /✓ Prêt à publier/);
  assert.match(page, /admin-publish-ready/);
  assert.match(styles, /\.admin-readiness/);
  assert.match(styles, /button\.admin-publish-ready/);
});
