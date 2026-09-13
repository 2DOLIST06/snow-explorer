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

test('ski-area admin inventory retains every catalog station state', () => {
  const expectations = read('src/components/admin/catalog/SkiAreaExpectations.tsx');
  assert.match(expectations, /Composition complète attendue/);
  assert.match(expectations, /items\.map\(item/);
  assert.match(expectations, /linked:"Rattachée"/);
  assert.match(expectations, /ignored:"Ignorée"/);
});
