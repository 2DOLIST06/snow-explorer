const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  getStationApiBase,
  isResortInactive,
  loadStationPageSources,
  loadPublicResort,
  resolveResortRegion,
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

test("station regions support nested, flat and region_id API contracts", () => {
  const nested = { name: "Auron", region: { id: "paca", name: "Provence-Alpes-Côte d’Azur" } };
  assert.equal(resolveResortRegion(nested), nested);

  assert.deepEqual(
    resolveResortRegion({ name: "Auron", region_id: "paca", region_name: "Provence-Alpes-Côte d’Azur" }),
    { name: "Auron", region_id: "paca", region_name: "Provence-Alpes-Côte d’Azur", region: { id: "paca", name: "Provence-Alpes-Côte d’Azur" } },
  );

  assert.deepEqual(
    resolveResortRegion({ name: "Auron", region_id: "paca" }, [{ id: "paca", name: "Provence-Alpes-Côte d’Azur", country_code: "FR" }]),
    { name: "Auron", region_id: "paca", region: { id: "paca", name: "Provence-Alpes-Côte d’Azur", country_code: "FR" } },
  );
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
        assert.equal(url, `https://backend.example.com/api/resorts/?q=${station.slug}`);
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

test("station page starts its two remaining backend calls in parallel", async () => {
  const started = [];
  let releaseStation;
  let releaseWidgets;
  const stationGate = new Promise((resolve) => { releaseStation = resolve; });
  const widgetsGate = new Promise((resolve) => { releaseWidgets = resolve; });

  const pending = loadStationPageSources("auron", {
    apiBase: "https://backend.example.com",
    fetchImpl: async (url) => {
      started.push(url);
      await stationGate;
      return response(200, { name: "Auron", slug: "auron" });
    },
    loadWidgets: async (slug) => {
      started.push(`widgets:${slug}`);
      await widgetsGate;
      return { stationSlug: slug };
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [
    "https://backend.example.com/api/stations/auron",
    "widgets:auron",
  ], "neither request waits for the other to finish");
  releaseWidgets();
  releaseStation();
  const result = await pending;
  assert.equal(result.stationResponse.status, 200);
  assert.deepEqual(result.widgets.config, { stationSlug: "auron" });
});

test("station page backend budget excludes ski-passes and regions", () => {
  const stationPage = fs.readFileSync(path.join(__dirname, "../pages/stations/[slug].tsx"), "utf8");
  const widgetsApi = fs.readFileSync(path.join(__dirname, "../src/lib/api/stations.ts"), "utf8");

  assert.match(stationPage, /loadStationPageSources\(slug/);
  assert.match(stationPage, /normalizeStationSkiPass\(loadedResort\.ski_pass\)/);
  assert.doesNotMatch(stationPage, /\/api\/regions/);
  assert.doesNotMatch(widgetsApi, /\/ski-passes/);
  assert.equal((widgetsApi.match(/await fetch\(/g) || []).length, 1);
});

test("station detail region and ski pass preserve functional content and SEO", () => {
  const stationPage = fs.readFileSync(path.join(__dirname, "../pages/stations/[slug].tsx"), "utf8");

  assert.match(stationPage, /region\?: \{ id\?: string; name\?: string; slug\?: string/);
  assert.match(stationPage, /<StationForfaitsBlock/);
  assert.match(stationPage, /<title>\{seoTitle\}<\/title>/);
  assert.match(stationPage, /<meta name="description" content=\{seoDescription\}/);
  assert.match(stationPage, /<link rel="canonical" href=\{canonicalUrl\}/);
  assert.match(stationPage, /application\/ld\+json/);
});

test("station 404 handling remains authoritative when widgets fail", async () => {
  const { stationResponse, widgets } = await loadStationPageSources("missing", {
    apiBase: "https://backend.example.com",
    fetchImpl: async () => response(404, { error: "not_found" }),
    loadWidgets: async () => { throw Object.assign(new Error("widgets_not_found"), { status: 404 }); },
  });

  assert.equal(stationResponse.status, 404);
  assert.equal(widgets.config, null);
  assert.equal(widgets.error.status, 404);
  const stationPage = fs.readFileSync(path.join(__dirname, "../pages/stations/[slug].tsx"), "utf8");
  assert.match(stationPage, /if \(stationResponse\.status === 404\) \{\s*return \{ notFound: true \};/);
});

test("piste color details use one display switch for rendering and SSR serialization", () => {
  const stationPage = fs.readFileSync(
    path.join(__dirname, "../pages/stations/[slug].tsx"),
    "utf8",
  );

  assert.match(stationPage, /const SHOW_PISTE_COLOR_DETAILS = false;/);
  assert.match(stationPage, /SHOW_PISTE_COLOR_DETAILS && colors \?/);
  assert.match(
    stationPage,
    /SHOW_PISTE_COLOR_DETAILS && cfg\.pistes\?\.colors \? \{ colors: cfg\.pistes\.colors \} : \{\}/,
  );
  assert.doesNotMatch(stationPage, /JSON\.parse\(JSON\.stringify\(resort\)\)/);
});
