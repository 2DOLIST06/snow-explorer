const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("robots.txt allows crawling and advertises the sitemap", () => {
  const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");

  assert.equal(
    robots,
    "User-agent: *\nAllow: /\n\nSitemap: https://www.snow-explorer.com/sitemap.xml\n",
  );
  assert.doesNotMatch(robots, /Disallow:/);
});

test("the dynamic sitemap uses active backend resorts and an XML response", () => {
  const page = fs.readFileSync(path.join(root, "pages/sitemap.xml.tsx"), "utf8");
  const generator = fs.readFileSync(path.join(root, "src/lib/sitemap.ts"), "utf8");

  assert.match(page, /fetchActiveResortsServer\(\)/);
  assert.match(page, /application\/xml; charset=utf-8/);
  assert.match(generator, /"\/", "\/stations", "\/meteo", "\/forfaits", "\/plan-des-pistes", "\/contact"/);
  assert.match(generator, /\/stations\/\$\{encodeURIComponent\(resort\.slug\)\}/);
  assert.match(generator, /regionSlug\(resort\.region\)/);
  assert.doesNotMatch(generator, /<priority>|<changefreq>|<lastmod>/);
});
