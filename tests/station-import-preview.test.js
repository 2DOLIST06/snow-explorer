const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("La Clusaz bulk preview uses the flat API contract without unsafe legacy names", () => {
  const preview = {
    checksum: "checksum",
    errors: [],
    preview_token: "token",
    stations: [{
      changes: [{ action: "update", new_value: true, old_value: false, path: "station.is_active" }],
      id: null,
      name: "La Clusaz",
      slug: "la-clusaz",
      status: "update",
    }],
    summary: { errors: 0, existing: 1, missing: 0, total: 1, unchanged: 0 },
    valid: true,
    warnings: [],
  };

  const previewStations = Array.isArray(preview?.stations)
    ? preview.stations.filter(item => Boolean(item && typeof item === "object"))
    : [];
  const [item] = previewStations;
  const stationName = item.name?.trim() || item.slug?.trim() || "Station non identifiée";
  const changes = Array.isArray(item.changes) ? item.changes : [];

  assert.equal(stationName, "La Clusaz");
  assert.equal(item.slug, "la-clusaz");
  assert.equal(item.status, "update");
  assert.deepEqual(changes, [{ action: "update", new_value: true, old_value: false, path: "station.is_active" }]);
  assert.equal(preview.summary?.total ?? previewStations.length, 1);

  const frontend = ["pages", "src"].flatMap(directory => walk(path.join(root, directory))).map(file => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(frontend, /(?:item\.station|item\.target|station\.station|previewStation\.station|result\.station)\.name/);
});

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(directory, entry.name)) : /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : [],
  );
}
