const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getStationApiBase,
  isResortInactive,
  loadPublicResort,
  stationFromPayload,
} = require("../src/lib/api/stationPage");

const silentLogger = { info() {}, error() {} };
const response = (status, body, contentType = "application/json") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });

test("station SSR uses the configured absolute backend and strips trailing slashes", () => {
  assert.equal(getStationApiBase({ API_URL: "https://backend.example.com///", NODE_ENV: "production" }), "https://backend.example.com");
  assert.throws(() => getStationApiBase({ NODE_ENV: "production" }), /Missing backend origin/);
});

test("public station payload supports direct, resort and data contracts", () => {
  const auron = { name: "Auron", slug: "auron", is_active: true };
  assert.equal(stationFromPayload(auron), auron);
  assert.equal(stationFromPayload({ resort: auron }), auron);
  assert.equal(stationFromPayload({ data: auron }), auron);
  assert.equal(stationFromPayload([auron], "auron"), auron);
  assert.equal(stationFromPayload([auron], "isola-2000"), undefined);
  assert.equal(stationFromPayload({ found: false }), undefined);
  assert.equal(stationFromPayload({ message: "failure" }), null);
});

test("Auron and Isola 2000 valid responses remain public", async () => {
  for (const station of [
    { name: "Auron", slug: "auron", is_active: true },
    { name: "Isola 2000", slug: "isola-2000", is_active: true },
  ]) {
    const actual = await loadPublicResort(station.slug, {
      env: { API_URL: "https://backend.example.com", NODE_ENV: "production" },
      fetchImpl: async (url) => {
        assert.equal(url, `https://backend.example.com/api/resorts/${station.slug}`);
        return response(200, [station]);
      },
      logger: silentLogger,
    });
    assert.deepEqual(actual, station);
    assert.equal(isResortInactive(actual), false);
  }
});

test("only an actual or explicit not-found response maps to absence", async () => {
  const options = {
    env: { API_URL: "https://backend.example.com", NODE_ENV: "production" },
    logger: silentLogger,
  };
  assert.equal(await loadPublicResort("missing", { ...options, fetchImpl: async () => response(404, { error: "not_found" }) }), null);
  assert.equal(await loadPublicResort("missing", { ...options, fetchImpl: async () => response(200, { exists: false }) }), null);
});

test("backend, auth, network and invalid JSON failures never become 404", async () => {
  const options = {
    env: { API_URL: "https://backend.example.com", NODE_ENV: "production" },
    logger: silentLogger,
  };
  for (const status of [401, 403, 500, 502, 503]) {
    await assert.rejects(loadPublicResort("auron", { ...options, fetchImpl: async () => response(status, { error: "upstream" }) }), new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(loadPublicResort("auron", { ...options, fetchImpl: async () => { throw new Error("network down"); } }), /network down/);
  await assert.rejects(loadPublicResort("auron", { ...options, fetchImpl: async () => response(200, "not json", "text/html") }), /JSON/);
  await assert.rejects(loadPublicResort("auron", { ...options, fetchImpl: async () => response(200, { unexpected: true }) }), /invalid payload/);
});

test("all supported public active-field variants identify inactive stations", () => {
  assert.equal(isResortInactive({ is_active: false }), true);
  assert.equal(isResortInactive({ resort_is_active: false }), true);
  assert.equal(isResortInactive({ active: false }), true);
  assert.equal(isResortInactive({ is_active: true, active: false }), false);
});

const { keyFigures, parseCivilDate, seasonDisplay } = require("../src/lib/stationPublicDisplay");

test("public key figures use only the new API fields, pluralize and retain zero", () => {
  assert.deepEqual(keyFigures({
    ski_area_km: 135, snowparks_count: 1, family_parks_count: 0,
    pistes_count: 99, lifts_count: 20,
  }).map((item) => item.label), [
    "135 km de pistes", "1 snowpark", "0 family parks",
  ]);
  assert.deepEqual(keyFigures({ ski_area_km: null, snowparks_count: 2, family_parks_count: 1 }).map((item) => item.label), [
    "2 snowparks", "1 family park",
  ]);
  assert.deepEqual(keyFigures({ ski_area_km: "", snowparks_count: undefined, family_parks_count: NaN }), []);
});

test("civil season dates keep their calendar day and year", () => {
  const civil = parseCivilDate("2026-12-05");
  assert.equal(civil.getFullYear(), 2026);
  assert.equal(civil.getMonth(), 11);
  assert.equal(civil.getDate(), 5);
  assert.deepEqual(seasonDisplay({
    season_label: "2026-2027", season_open_date: "2026-12-05", season_close_date: "2027-04-11",
  }), { label: "2026-2027", opening: "5 décembre 2026", closing: "11 avril 2027" });
});

test("season label falls back from two dates and stays hidden for one date", () => {
  assert.equal(seasonDisplay({ season_label: null, season_open_date: "2026-12-05", season_close_date: "2027-04-11" }).label, "2026-2027");
  assert.deepEqual(seasonDisplay({ season_label: "2026-2027", season_open_date: "2026-12-05", season_close_date: null }), {
    label: null, opening: "5 décembre 2026", closing: null,
  });
});
