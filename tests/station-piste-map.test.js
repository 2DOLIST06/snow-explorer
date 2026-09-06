const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveStationPisteMap } = require("../src/lib/stationPisteMap");

test("the exact ANMSM large-only publication drives the public image and modal", () => {
  const station = {
    pistes_large_map_url: "https://example.com/display.webp",
    pistes_small_map_url: "",
    pistes_caption: null,
  };
  const cfg = {
    is_active: false,
    large_map_url: null,
    small_map_url: null,
    official_map_url: "https://example.com/ancien-plan.jpg",
  };

  const pistes = resolveStationPisteMap(station, cfg);
  const displayedImage = pistes.smallMapUrl || pistes.largeMapUrl;
  const modalImage = pistes.largeMapUrl || pistes.smallMapUrl;

  assert.equal(pistes.enabled, true);
  assert.equal(displayedImage, "https://example.com/display.webp");
  assert.equal(modalImage, "https://example.com/display.webp");
  assert.equal(pistes.smallMapUrl, null);
  assert.equal(pistes.officialMapUrl, null);
});

test("legacy settings remain available when no published image exists", () => {
  assert.deepEqual(resolveStationPisteMap({}, {
    enabled: true,
    smallMapUrl: "https://example.com/legacy-small.webp",
    largeMapUrl: "https://example.com/legacy-large.webp",
    officialMapUrl: "https://example.com/old.jpg",
  }), {
    enabled: true,
    smallMapUrl: "https://example.com/legacy-small.webp",
    largeMapUrl: "https://example.com/legacy-large.webp",
    officialMapUrl: null,
    caption: null,
    hasPublishedImage: false,
  });
});
