const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/searchNormalization.js"), "utf8")
  .replace(/export function /g, "function ");
const context = {};
vm.runInNewContext(`${source}; this.api = { normalizeSearchText, matchesSearch };`, context);
const { normalizeSearchText, matchesSearch } = context.api;

test("station search ignores accents and letter case", () => {
  assert.equal(matchesSearch("Méribel", "MERIBEL"), true);
  assert.equal(matchesSearch("Les Ménuires", "menuires"), true);
});

test("station search ignores hyphens, spaces and apostrophes", () => {
  assert.equal(matchesSearch("Saint-Gervais-les-Bains", "saint gervais les bains"), true);
  assert.equal(matchesSearch("L'Alpe-d'Huez", "lalpe dhuez"), true);
  assert.equal(normalizeSearchText("Val-d'Isère"), normalizeSearchText("VAL DISERE"));
});
