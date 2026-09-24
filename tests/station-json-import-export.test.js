const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("station exports download the untouched backend blobs for both envelopes", () => {
  const api = read("src/lib/api/stationImports.ts");
  const station = read("pages/admin/stations/[slug].tsx");
  const list = read("pages/admin/stations/index.tsx");

  assert.match(api, /getStationExportResponse[\s\S]*responseType: "blob"/);
  assert.match(api, /getAllStationsExportResponse[\s\S]*responseType: "blob"/);
  assert.match(station, /downloadBlobResponse\(await getStationExportResponse/);
  assert.match(list, /kind === "all" \? await getAllStationsExportResponse\(\)[\s\S]*downloadBlobResponse\(response/);
  assert.doesNotMatch(api, /\.stations\b|JSON\.stringify\([^)]*response\.data/);
});

test("bulk preview and confirmation reuse one complete parsed document", () => {
  const api = read("src/lib/api/stationImports.ts");
  const modal = read("src/components/admin/imports/BulkImportModal.tsx");

  assert.match(api, /file: document/);
  assert.match(api, /create_missing: options\.create_missing/);
  assert.match(modal, /setDocument\(parsed\); setPreview\(value\)/);
  assert.match(modal, /confirmBulkStationImport\(document, preview\.preview_token, options\)/);
  assert.equal((modal.match(/readStationImportDocument\(file\)/g) || []).length, 1);
  assert.match(modal, /Créer les stations absentes/);
});

test("every bulk import option invalidates its previous preview", () => {
  const modal = read("src/components/admin/imports/BulkImportModal.tsx");
  assert.equal((modal.match(/invalidatePreview\(\);/g) || []).length >= 4, true);
  assert.match(modal, /setDocument\(undefined\)/);
});

test("partial import results expose localized errors and keep a retry path", () => {
  const single = read("src/components/admin/imports/StationImportModal.tsx");
  const bulk = read("src/components/admin/imports/BulkImportModal.tsx");

  for (const source of [single, bulk]) {
    assert.match(source, /Import partiel ou en erreur/);
    assert.match(source, /Corriger et réessayer/);
    assert.match(source, /MessageList title="Erreurs"/);
  }
  assert.match(bulk, /messages\(station\.errors\)/);
});
