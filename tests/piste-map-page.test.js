const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("pages/plan-des-pistes.tsx", "utf8");
const header = fs.readFileSync("src/components/layout/ProHeader.tsx", "utf8");

test("the main navigation links to the piste map directory", () => {
  assert.match(header, /label: "Plan des pistes", href: "\/plan-des-pistes"/);
});

test("the piste map page keeps the shared station selection experience", () => {
  assert.match(page, /className="passes-layout"/);
  assert.match(page, /<h2>Choisissez une station<\/h2>/);
  assert.match(page, /setSelected\(\{ \.\.\.station, pistes: getPistes/);
  assert.match(page, /Plan des pistes de \{selected\.name\}/);
});

test("station choices do not duplicate the profile link shown in the result", () => {
  assert.doesNotMatch(page, /Voir la fiche/);
  assert.match(page, /Voir la station/);
});

test("piste maps open in the same in-site dialog pattern as station pages", () => {
  assert.match(page, /setMapOpen\(true\)/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(page, /className="pistes-modal-backdrop"/);
  assert.doesNotMatch(page, /href=\{mapUrl\} target="_blank"/);
  assert.doesNotMatch(page, /href=\{officialMapUrl\} target="_blank"/);
});
