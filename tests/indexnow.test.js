const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("IndexNow admin offers bulk, individual and date-sorting controls", () => {
  const page = read("pages/admin/indexnow.tsx");
  assert.match(page, /Tout cocher/);
  assert.match(page, /Tout décocher/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /setSortDirection/);
  assert.match(page, /lastModified/);
  assert.match(read("src/components/admin/AdminBar.tsx"), /href="\/admin\/indexnow"/);
});

test("IndexNow submission uses the shared authenticated admin API helper", () => {
  const page = read("pages/admin/indexnow.tsx");
  assert.match(page, /import \{ adminFetch \} from "@\/lib\/adminApi"/);
  assert.match(page, /adminFetch\("\/api\/admin\/indexnow"/);
  assert.match(page, /"Content-Type": "application\/json"/);
  assert.match(page, /JSON\.stringify\(\{ urls: \[\.\.\.selected\] \}\)/);
  assert.match(page, /admin_authentication_required/);
  assert.match(page, /csrf_validation_failed/);
  assert.equal(fs.existsSync(path.join(root, "pages/api/admin/indexnow.ts")), false);
});

test("IndexNow lists published ski areas together with their updated stations", () => {
  const page = read("pages/admin/indexnow.tsx");
  assert.match(page, /import \{ fetchAllPublicSkiAreas \} from "@\/lib\/api\/skiAreas"/);
  assert.match(page, /fetchAllPublicSkiAreas\(\)/);
  assert.match(page, /getSitemapEntries\(resorts, regions, skiAreas\)/);
  assert.match(page, /skiAreasResult\.status === "rejected"/);
  assert.match(page, /new Set\(rows\.map\(\(row\) => row\.url\)\)/);
});
