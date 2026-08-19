const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");

test("robots.txt allows crawling and advertises the sitemap", () => {
  const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");

  assert.equal(
    robots,
    "User-agent: *\nAllow: /\n\nSitemap: https://www.snow-explorer.com/sitemap.xml\n",
  );
  assert.doesNotMatch(robots, /Disallow:/);
});

function loadSitemapGenerator() {
  const regionsSource = fs.readFileSync(path.join(root, "src/lib/regions.ts"), "utf8");
  const regionsJavascript = ts.transpileModule(regionsSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const regionsModule = { exports: {} };
  new Function("module", "exports", "require", regionsJavascript)(regionsModule, regionsModule.exports, require);

  const source = fs.readFileSync(path.join(root, "src/lib/sitemap.ts"), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => (id === "@/lib/regions" ? regionsModule.exports : require(id));
  new Function("module", "exports", "require", javascript)(module, module.exports, localRequire);
  return module.exports;
}

test("the dynamic sitemap uses both public API resources and an XML response", () => {
  const page = fs.readFileSync(path.join(root, "pages/sitemap.xml.tsx"), "utf8");
  const resortsApi = fs.readFileSync(path.join(root, "src/lib/api/resorts.ts"), "utf8");
  const regionsApi = fs.readFileSync(path.join(root, "src/lib/api/regions.ts"), "utf8");

  assert.match(page, /Promise\.allSettled/);
  assert.match(page, /fetchActiveResortsServer\(\)/);
  assert.match(page, /fetchRegionsServer\(\)/);
  assert.match(page, /application\/xml; charset=utf-8/);
  assert.match(resortsApi, /`\$\{base\}\$\{RESORTS_PATH\}\?active=true`/);
  assert.match(regionsApi, /const REGIONS_PATH = "\/api\/regions"/);
});

test("sitemap dates, validation, static URLs, and deduplication are safe", () => {
  const { createSitemapXml, getSitemapEntries, parseLastModified } = loadSitemapGenerator();
  const source = fs.readFileSync(path.join(root, "src/lib/sitemap.ts"), "utf8");
  const resorts = [
    { id: "1", name: "Auron", slug: "auron", is_active: true, updated_at: "2026-08-19T10:30:00+00:00", region: { name: "Provence Alpes Côte d'Azur" } },
    { id: "2", name: "Inactive", slug: "inactive", is_active: false, updated_at: "2026-08-19T10:30:00Z" },
    { id: "3", name: "Empty", slug: "  ", is_active: true, updated_at: null },
    { id: "4", name: "Invalid", slug: "invalid-date", is_active: true, updated_at: "not-a-date" },
  ];
  const regions = [
    { id: "fallback-id", slug: "alpes", updated_at: "2026-08-18T09:15:00Z" },
    { id: "alpes", updated_at: null },
    { id: "bad", updated_at: "invalid" },
    { id: "", slug: " " },
  ];
  const entries = getSitemapEntries(resorts, regions);
  const station = entries.find((entry) => entry.url.endsWith("/stations/auron"));
  const region = entries.find((entry) => entry.url.endsWith("/regions/alpes"));

  assert.equal(station.lastModified.toISOString(), "2026-08-19T10:30:00.000Z");
  assert.equal(region.lastModified.toISOString(), "2026-08-18T09:15:00.000Z");
  assert.equal(entries.filter((entry) => entry.url.endsWith("/regions/alpes")).length, 1);
  assert.equal(entries.some((entry) => entry.url.includes("inactive") || entry.url.endsWith("/stations/")), false);
  assert.equal(entries.find((entry) => entry.url.endsWith("/stations/invalid-date")).lastModified, undefined);
  assert.equal(entries.find((entry) => entry.url.endsWith("/regions/bad")).lastModified, undefined);
  assert.equal(
    entries.some((entry) => entry.url.endsWith("/regions/provence-alpes-cote-d-azur")),
    true,
    "regions embedded in resorts remain available when the regions endpoint is incomplete",
  );
  assert.equal(entries.some((entry) => entry.url === "https://www.snow-explorer.com/contact"), true);
  assert.equal(parseLastModified(null), undefined);
  assert.equal(parseLastModified("nonsense"), undefined);

  const xml = createSitemapXml(resorts, regions);
  assert.match(xml, /<lastmod>2026-08-19T10:30:00\.000Z<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-08-18T09:15:00\.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, /Invalid Date|<lastmod>\s*<\/lastmod>/);
  assert.doesNotMatch(source, /new Date\(\)/);
});
