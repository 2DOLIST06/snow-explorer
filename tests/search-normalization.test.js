const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/searchNormalization.js"), "utf8")
  .replace(/export function /g, "function ");
const context = {};
vm.runInNewContext(`${source}; this.api = { normalizeSearchText, matchesSearch, filterStations };`, context);
const { normalizeSearchText, matchesSearch, filterStations } = context.api;

test("station search ignores accents and letter case", () => {
  assert.equal(matchesSearch("Méribel", "MERIBEL"), true);
  assert.equal(matchesSearch("Les Ménuires", "menuires"), true);
});

test("station search ignores hyphens, spaces and apostrophes", () => {
  assert.equal(matchesSearch("Saint-Gervais-les-Bains", "saint gervais les bains"), true);
  assert.equal(matchesSearch("L'Alpe-d'Huez", "lalpe dhuez"), true);
  assert.equal(normalizeSearchText("Val-d'Isère"), normalizeSearchText("VAL DISERE"));
});

test("short station searches keep every match beyond previous autocomplete limits", () => {
  const stations = Array.from({length: 30}, (_, i) => ({id: String(i), name: `Val A${i}`, slug: `val-a${i}`}));
  stations.push({id: "thorens", name: "Val Thorens", slug: "val-thorens"});
  for (const query of ["Val", "VAL", "val "]) {
    const results = filterStations(stations, query);
    assert.equal(results.length, 31);
    assert.equal(results.at(-1).id, "thorens");
  }
  assert.equal(filterStations(stations, "Val T")[0].id, "thorens");
  assert.equal(filterStations(stations, "val-t")[0].id, "thorens");
  assert.equal(filterStations(stations, "").length, 31);
});

test("the same search handles arbitrary partial station names and separators", () => {
  const stations = [{name: "Saint-Gervais-les-Bains"}, {name: "Saint-Lary"}, {name: "Méribel"}];
  assert.equal(filterStations(stations, "saint").length, 2);
  assert.equal(filterStations(stations, "saint g")[0].name, "Saint-Gervais-les-Bains");
  assert.equal(filterStations(stations, "MERI")[0].name, "Méribel");
});
