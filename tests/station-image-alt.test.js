const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const stationPage = fs.readFileSync(path.join(__dirname, "../pages/stations/[slug].tsx"), "utf8");
const stationLogo = fs.readFileSync(path.join(__dirname, "../src/components/stations/StationLogoFrame.tsx"), "utf8");

test("station logo and cover image alts include the station name", () => {
  assert.match(stationPage, /alt=\{`Paysage \$\{resort\.name\}`\}/);
  assert.match(stationLogo, /alt=\{`Logo \$\{stationName\} - Snow Explorer`\}/);
  assert.match(stationPage, /property="og:image:alt" content=\{`Paysage \$\{resort\.name\}`\}/);
});
