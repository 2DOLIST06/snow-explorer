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
        assert.equal(url, `https://backend.example.com/api/stations/${station.slug}`);
        return response(200, { resort: station });
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
