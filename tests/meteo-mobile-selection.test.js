const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("mobile weather selection reveals the forecast and keeps a change action", () => {
  const page = fs.readFileSync(path.join(root, "pages/meteo.tsx"), "utf8");
  const css = fs.readFileSync(path.join(root, "src/styles/globals.css"), "utf8");

  assert.match(page, /contentRef\.current\?\.scrollIntoView/);
  assert.match(page, />Changer</);
  assert.match(page, /station-picker--collapsed/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*\.station-picker--collapsed \.station-picker__controls\{display:none\}/);
});
