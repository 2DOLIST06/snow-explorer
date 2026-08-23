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

test("IndexNow submission stays server-side, authenticated and host-limited", () => {
  const route = read("pages/api/admin/indexnow.ts");
  const config = read("src/lib/indexNow.ts");
  assert.match(route, /"admin", "auth", "session"/);
  assert.match(route, /X-CSRF|x-csrf-token/);
  assert.match(route, /INDEXNOW_ENDPOINT/);
  assert.match(config, /url\.host === INDEXNOW_HOST/);
  assert.equal(read("public/7ccf80d73d9243f6b722189d96607f40.txt").trim(), "7ccf80d73d9243f6b722189d96607f40");
});
