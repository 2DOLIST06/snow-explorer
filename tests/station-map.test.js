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
  assert.doesNotMatch(source, /new google\.maps\.Marker/);
});

test("station maps are rendered only when both published coordinates exist", () => {
  const source = read("pages/stations/[slug].tsx");
  assert.match(source, /hasValidCoordinates \? \(/);
  assert.match(source, /mode="station"/);
  assert.doesNotMatch(source, /nominatim\.openstreetmap/);
  assert.match(source, /noopener noreferrer/);
});

test("the overview page loads its stations server-side from the dedicated endpoint", () => {
  assert.match(read("pages/carte-stations-ski.tsx"), /fetchStationMapServer/);
  assert.match(read("src/lib/api/stationMap.ts"), /\/api\/stations\/map/);
});

test("the environment template never contains a Google Maps secret", () => {
  const env = read(".env.example");
  assert.match(env, /^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$/m);
  assert.match(env, /^NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=$/m);
});
