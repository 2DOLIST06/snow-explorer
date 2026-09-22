const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the map uses Advanced Markers, one InfoWindow, clustering and the configured Map ID", () => {
  const source = read("src/components/maps/StationMap.tsx");
  assert.match(source, /AdvancedMarkerElement/);
  assert.match(source, /new MarkerClusterer\(\{ map, markers \}\)/);
  assert.match(source, /const infoWindow = new maps\.InfoWindow\(\)/);
  assert.match(source, /NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID/);
  assert.match(source, /addEventListener\("gmp-click"/);
  assert.doesNotMatch(source, /marker\.addListener/);
  assert.doesNotMatch(source, /new google\.maps\.Marker/);
});

test("station cards use published coordinates and expose a safe missing-coordinate state", () => {
  const source = read("pages/stations/[slug].tsx");
  assert.match(source, /latitude: hasValidCoordinates \?/);
  assert.match(source, /<StationMapCard/);
  assert.doesNotMatch(source, /nominatim\.openstreetmap/);
  const card = read("src/components/maps/StationMapCard.tsx");
  assert.match(card, /mode="preview"/);
  assert.match(card, /mode="modal"/);
  assert.match(card, /Coordonnées indisponibles/);
  assert.match(card, /noopener noreferrer/);
});

test("the stations directory toggles an overview loaded from the dedicated endpoint", () => {
  const directory = read("pages/stations/index.tsx");
  assert.match(directory, /fetchStationMapServer/);
  assert.match(directory, /Voir les stations sur la carte/);
  assert.match(directory, /Masquer la carte/);
  assert.equal(fs.existsSync(path.join(root, "pages/carte-stations-ski.tsx")), false);
  assert.match(read("src/lib/api/stationMap.ts"), /\/api\/stations\/map/);
});

test("the environment template never contains a Google Maps secret", () => {
  const env = read(".env.example");
  assert.match(env, /^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$/m);
  assert.match(env, /^NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=$/m);
});

test("the marker clusterer runtime dependency is installed explicitly", () => {
  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  assert.match(packageJson.dependencies["@googlemaps/markerclusterer"], /^\^2\.6\.2$/);
  assert.match(packageJson.dependencies["fast-equals"], /^\^5\.0\.1$/);
  assert.match(packageJson.dependencies.supercluster, /^\^8\.0\.1$/);
  assert.match(packageJson.dependencies.kdbush, /^\^4\.0\.2$/);
  assert.deepEqual(
    packageLock.packages["node_modules/@googlemaps/markerclusterer"].dependencies,
    { "fast-equals": "^5.0.1", supercluster: "^8.0.1" },
  );
  assert.equal(packageLock.packages["node_modules/fast-equals"].version, "5.2.2");
  assert.equal(packageLock.packages["node_modules/supercluster"].version, "8.0.1");
  assert.equal(packageLock.packages["node_modules/supercluster"].dependencies.kdbush, "^4.0.2");
  assert.equal(packageLock.packages["node_modules/kdbush"].version, "4.0.2");
});
