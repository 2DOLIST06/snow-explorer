const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const homepage = fs.readFileSync(path.join(__dirname, "../pages/index.tsx"), "utf8");

test("homepage featured station cards display the station logo instead of a cover", () => {
  assert.match(homepage, /const logoUrl = resort\.logo_url \|\| resort\.logoUrl/);
  assert.match(homepage, /src=\{logoUrl\}/);
  assert.match(homepage, /alt=\{`Logo de la station \$\{resort\.name\}`\}/);
  assert.doesNotMatch(homepage, /featuredResortsWithImage/);
});
