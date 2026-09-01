const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("station cache action calls the station-scoped purge endpoint", () => {
  const page = read("pages/admin/stations/[slug].tsx");
  assert.match(page, /cache\/stations\/\$\{encodeURIComponent\(slug\)\}\/purge/);
  assert.match(page, /Vider le cache de cette station/);
  assert.match(page, /Cache de la station vidé/);
});

test("general cache page exposes directory and public purge endpoints", () => {
  const page = read("pages/admin/cache.tsx");
  assert.match(page, /endpoint="\/api\/admin\/cache\/resorts\/purge"/);
  assert.match(page, /Vider le cache de l’annuaire/);
  assert.match(page, /endpoint="\/api\/admin\/cache\/public\/purge"/);
  assert.match(page, /Vider tout le cache public/);
  assert.match(read("src/components/admin/AdminBar.tsx"), /href="\/admin\/cache"/);
});

test("global purge requires explicit confirmation before the request", () => {
  const page = read("pages/admin/cache.tsx");
  const component = read("src/components/admin/CachePurgeButton.tsx");
  assert.match(page, /confirmation="Confirmez-vous la purge de tout le cache public \?"/);
  assert.match(component, /confirmation && !window\.confirm\(confirmation\)/);
  assert.match(component, /return;/);
});

test("cache action covers loading, success and error states without navigation", () => {
  const component = read("src/components/admin/CachePurgeButton.tsx");
  assert.match(component, /state === "loading"/);
  assert.match(component, /disabled=\{state === "loading"\}/);
  assert.match(component, /setState\("success"\)/);
  assert.match(component, /setState\("error"\)/);
  assert.match(component, /aria-live="polite"/);
  assert.doesNotMatch(component, /router|location|reload/);
});

test("cache purges use the existing authenticated CSRF-aware admin helper", () => {
  const component = read("src/components/admin/CachePurgeButton.tsx");
  const api = read("src/lib/adminApi.ts");
  assert.match(component, /requireAdminResponse\(endpoint, \{ method: "POST" \}\)/);
  assert.match(api, /headers\.set\("X-CSRF-Token", csrf\)/);
  assert.match(api, /credentials: "include"/);
  assert.match(api, /response\.status === 401/);
  assert.equal(fs.existsSync(path.join(root, "pages/api/admin/cache.ts")), false);
});
