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
