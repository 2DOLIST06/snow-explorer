const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("forfaits only links to the selected station", () => {
  const page = fs.readFileSync(path.join(root, "pages/forfaits.tsx"), "utf8");

  assert.doesNotMatch(page, /Voir la fiche/);
  assert.match(page, /Voir la station/);
});

test("meteo only links to the selected station", () => {
  const page = fs.readFileSync(path.join(root, "pages/meteo.tsx"), "utf8");

  assert.doesNotMatch(page, /Voir la fiche/);
  assert.match(page, /selected && <div className="weather-content__station"/);
  assert.match(page, /Voir la station/);
});
