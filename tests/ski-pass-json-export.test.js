const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/lib/skiPassJsonExport.ts", "utf8");
const component = fs.readFileSync("src/components/admin/ForfaitsJsonImport.tsx", "utf8");

test("the empty ski-pass template documents special fields", () => {
  assert.match(source, /periods: \[\]/);
  assert.match(source, /passes: \[\]/);
  assert.match(source, /price_type.*fixed.*dynamic/);
  assert.match(source, /period_id/);
  assert.match(source, /label.*note facultative/);
});

test("the ski-pass JSON UI offers data and structure exports", () => {
  assert.match(component, />Exporter le JSON</);
  assert.match(component, />Exporter la structure vide</);
  assert.match(component, /skiPassExport\(stationSlug, season\)/);
  assert.match(component, /SKI_PASS_TEMPLATE/);
});

test("the ski-pass JSON UI can load a local JSON file before preview", () => {
  assert.match(component, /type="file"/);
  assert.match(component, /accept="application\/json,.json"/);
  assert.match(component, /await file\.text\(\)/);
  assert.match(component, /JSON\.parse\(content\)/);
  assert.match(component, /Choisir un fichier JSON/);
});
