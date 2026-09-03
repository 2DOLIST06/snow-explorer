const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const homepage = fs.readFileSync(path.join(__dirname, "../pages/index.tsx"), "utf8");

test("homepage featured station cards display the station logo instead of a cover", () => {
  assert.match(homepage, /const logoUrl = resort\.logo_url \|\| resort\.logoUrl/);
  assert.match(homepage, /src=\{logoUrl\}/);
  assert.match(homepage, /alt=\{`Logo \$\{resort\.name\} - Snow Explorer`\}/);
  assert.doesNotMatch(homepage, /featuredResortsWithImage/);
});

test("homepage reloads station logos for every request instead of serving stale ISR data", () => {
  assert.match(homepage, /export const getServerSideProps: GetServerSideProps<HomeProps>/);
  assert.match(homepage, /cache: "no-store"/);
  assert.doesNotMatch(homepage, /getStaticProps|revalidate:/);
});
