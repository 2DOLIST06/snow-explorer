const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../pages/admin/stations/[slug].tsx"),
  "utf8"
);

test("station edit page links to the public station in a new window", () => {
  assert.match(source, /href=\{`\/stations\/\$\{encodeURIComponent\(resort\.slug \|\| slug\)\}`\}/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, />\s*Voir la station\s*<\/Link>/);
});
