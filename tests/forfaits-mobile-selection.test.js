const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("pages/forfaits.tsx", "utf8");

test("mobile station selection reveals ski passes and keeps a change action", () => {
  assert.match(page, /contentRef\.current\?\.scrollIntoView/);
  assert.match(page, /station-picker--collapsed/);
  assert.match(page, />Changer</);
  assert.match(page, /ref=\{contentRef\} className="passes-content"/);
});

test("station selection renders historical and active JSON ski passes like the station page", () => {
  assert.match(page, /-ski-passes/);
  assert.doesNotMatch(page, /export function activeJsonForfaits/);
  assert.match(page, /candidate\?\.is_active === true/);
  assert.match(page, /forfaits: forfaits\?\.enabled \? forfaits/);
  assert.match(page, /normalizedForfaits: jsonForfaits/);
  assert.match(page, /<StationForfaitsBlock \{\.\.\.selected\.forfaits\} \/><StationForfaitsBlock \{\.\.\.\(selected\.normalizedForfaits \|\| \{\}\)\} \/>/);
  assert.match(page, /String\(price\.period_id\) === String\(period\.id\)/);
});
