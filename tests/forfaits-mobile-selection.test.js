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
