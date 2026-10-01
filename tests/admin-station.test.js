const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  normalizeAdminStation,
  normalizeAdminWidgets,
  normalizePisteMapUrl,
  syncLegacyPisteMapUrls,
} = require("../src/lib/adminStation");

test("admin station uses the legacy values already supported by the public page", () => {
  const widgets = {
    snow: { openingDate: "2026-12-05", season: { closingDate: "2027-04-18" } },
    pistes: { colors: { green: 7, blue: 12, red: 8, black: 3 } },
    remontees: { tireFesses: 4, telesieges: 6, telepheriques: 2 },
  };
  const station = normalizeAdminStation(
    { altitude_base_m: 1600, altitude_top_m: 2610, region: { id: "paca" } },
    widgets
  );

  assert.equal(station.altitude_min_m, 1600);
  assert.equal(station.altitude_max_m, 2610);
  assert.equal(station.season_open_date, "2026-12-05");
  assert.equal(station.season_close_date, "2027-04-18");
  assert.equal(station.pistes_count, 30);
  assert.equal(station.lifts_count, 12);
  assert.equal(station.region_id, "paca");
});

test("current resort values take precedence over derived widget values", () => {
  const station = normalizeAdminStation(
    { altitude_min_m: 1700, pistes_count: 42, lifts_count: 15, season_open_date: "2026-11-28" },
    {
      snow: { openingDate: "2026-12-05" },
      pistes: { colors: { green: 1, blue: 1, red: 1, black: 1 } },
      remontees: { tireFesses: 1, telesieges: 1, telepheriques: 1 },
    }
  );

  assert.equal(station.altitude_min_m, 1700);
  assert.equal(station.pistes_count, 42);
  assert.equal(station.lifts_count, 15);
  assert.equal(station.season_open_date, "2026-11-28");
});

test("a null station map URL is not restored from legacy widget keys", () => {
  const station = normalizeAdminStation(
    { pistes_small_map_url: null, pistes_large_map_url: null },
    {
      pistes: {
        smallMapUrl: "https://example.com/legacy-small.webp",
        large_map_url: "https://example.com/legacy-large.webp",
      },
    }
  );

  assert.equal(station.pistes_small_map_url, null);
  assert.equal(station.pistes_large_map_url, null);
});

test("clearing a large map produces a null station payload value", () => {
  assert.equal(normalizePisteMapUrl(""), null);
  assert.equal(normalizePisteMapUrl("   "), null);
});

test("saving synchronizes every legacy map key without changing other piste properties", () => {
  const widgets = syncLegacyPisteMapUrls(
    {
      pistes: {
        enabled: true,
        caption: "Plan 2025",
        colors: { green: 4 },
        smallMapUrl: "old-small.webp",
        largeMapUrl: "old-large.webp",
        small_map_url: "older-small.webp",
        large_map_url: "older-large.webp",
      },
      snow: { enabled: true },
    },
    { pistes_small_map_url: null, pistes_large_map_url: null }
  );

  assert.equal(widgets.pistes.smallMapUrl, null);
  assert.equal(widgets.pistes.largeMapUrl, null);
  assert.equal(widgets.pistes.small_map_url, null);
  assert.equal(widgets.pistes.large_map_url, null);
  assert.equal(widgets.pistes.caption, "Plan 2025");
  assert.deepEqual(widgets.pistes.colors, { green: 4 });
  assert.deepEqual(widgets.snow, { enabled: true });
});

test("a deleted map stays deleted after save and reload", () => {
  const savedWidgets = syncLegacyPisteMapUrls(
    { pistes: { smallMapUrl: "old-small.webp", largeMapUrl: "old-large.webp" } },
    { pistes_small_map_url: null, pistes_large_map_url: null }
  );
  const reloaded = normalizeAdminStation(
    { pistes_small_map_url: null, pistes_large_map_url: null },
    savedWidgets
  );

  assert.equal(reloaded.pistes_small_map_url, null);
  assert.equal(reloaded.pistes_large_map_url, null);
});

test("newly uploaded small and large maps are preserved for station and legacy payloads", () => {
  const uploaded = {
    pistes_small_map_url: "https://example.com/new-small.webp",
    pistes_large_map_url: "https://example.com/new-large.webp",
  };
  const stationPayload = {
    pistes_small_map_url: normalizePisteMapUrl(uploaded.pistes_small_map_url),
    pistes_large_map_url: normalizePisteMapUrl(uploaded.pistes_large_map_url),
  };
  const widgetsPayload = syncLegacyPisteMapUrls({ pistes: { caption: "Current" } }, stationPayload);

  assert.deepEqual(stationPayload, uploaded);
  assert.equal(widgetsPayload.pistes.smallMapUrl, uploaded.pistes_small_map_url);
  assert.equal(widgetsPayload.pistes.largeMapUrl, uploaded.pistes_large_map_url);
});

test("station editor binds map fields and previews to canonical station URLs", () => {
  const page = fs.readFileSync("pages/admin/stations/[slug].tsx", "utf8");

  assert.match(page, /value=\{resort\?\.pistes_large_map_url \|\| ""\}/);
  assert.match(page, /value=\{resort\?\.pistes_small_map_url \|\| ""\}/);
  assert.match(page, /pistes_large_map_url: e\.target\.value \|\| null/);
  assert.match(page, /pistes_large_map_url: largeUrl,[\s\S]*pistes_small_map_url: smallUrl/);
  assert.doesNotMatch(page, /resort\.pistes_large_map_url \?\?/);
  assert.doesNotMatch(page, /resort\.pistes_small_map_url \?\?/);
});

test("admin widgets use piste maps returned on the resort record", () => {
  const widgets = normalizeAdminWidgets(
    { pistes: { enabled: true } },
    { pistes_small_map_url: "small.webp", pistes_large_map_url: "large.webp" }
  );

  assert.equal(widgets.pistes.smallMapUrl, "small.webp");
  assert.equal(widgets.pistes.largeMapUrl, "large.webp");
});

test("published piste map fields override an empty disabled legacy widget without writing", () => {
  const station = {
    pistes_large_map_url: "https://example.com/display.webp",
    pistes_small_map_url: "",
    pistes_caption: null,
  };
  const rawWidgets = {
    pistes: {
      is_active: false,
      large_map_url: null,
      largeMapUrl: null,
      small_map_url: null,
      smallMapUrl: null,
      official_map_url: "https://example.com/ancien-plan.jpg",
    },
  };

  const widgets = normalizeAdminWidgets(rawWidgets, station);

  assert.equal(widgets.pistes.largeMapUrl, "https://example.com/display.webp");
  assert.equal(widgets.pistes.smallMapUrl, null);
  assert.equal(widgets.pistes.officialMapUrl, "https://example.com/ancien-plan.jpg");
  assert.equal(widgets.pistes.enabled, true);
  assert.deepEqual(station, {
    pistes_large_map_url: "https://example.com/display.webp",
    pistes_small_map_url: "",
    pistes_caption: null,
  });
});

test("opening the admin form only reads data and never persists normalized availability", () => {
  const page = fs.readFileSync("pages/admin/stations/[slug].tsx", "utf8");
  const loadFunction = page.slice(page.indexOf("const load = async"), page.indexOf("const saveAll = async"));

  assert.doesNotMatch(loadFunction, /method:\s*["'](?:PATCH|POST|PUT|DELETE)["']/);
});

test("station editor does not reserve an extra viewport around the footer", () => {
  const page = fs.readFileSync("pages/admin/stations/[slug].tsx", "utf8");
  const styles = page.slice(page.indexOf("const styles ="), page.indexOf("topBar:"));

  assert.doesNotMatch(styles, /page:\s*\{[\s\S]*?minHeight:\s*["']100vh["']/);
  assert.match(styles, /height:\s*["']calc\(100dvh - 88px\)["']/);
});
