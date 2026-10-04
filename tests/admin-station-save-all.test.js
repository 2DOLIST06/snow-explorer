const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../pages/admin/stations/[slug].tsx"),
  "utf8"
);

test("station editor exposes one button that saves station data and widgets", () => {
  assert.match(source, />\s*\{saving \? "Enregistrement…" : "Tout enregistrer"\}\s*<\/button>/);
  assert.match(source, /const \[stationResponse, widgetsResponse\] = await Promise\.all/);
  assert.match(source, /adminFetch\(stationUrl/);
  assert.match(source, /adminFetch\(`\$\{stationUrl\}\/widgets`/);
  assert.doesNotMatch(source, /Enregistrer widgets|Enregistrer station|<SaveButton/);
});

test("per-section completion indicators remain independent from saving", () => {
  assert.match(source, /const sectionChecks = \{/);
  assert.match(source, /style=\{section\.complete \? styles\.sectionStatusOk : styles\.sectionStatusKo\}/);
  assert.match(source, /\{section\.complete \? "✓" : "✕"\}/);
});

test("station PATCH explicitly sends editable V2 fields and never computed V2 contents", () => {
  const payloadBlock = source.slice(source.indexOf("const payload: ResortType = {"), source.indexOf("const widgetsPayload"));
  assert.doesNotMatch(payloadBlock, /\.\.\.editableResort|v2_contents/);
  assert.match(payloadBlock, /page_layout_version: resort\.page_layout_version/);
  for (const field of ["v2_overview_html", "v2_weather_snow_html", "v2_ski_pass_html", "v2_piste_map_html", "v2_webcam_html"]) {
    assert.match(payloadBlock, new RegExp(`${field}: resort\\.${field} \\?\\? null`));
  }
  assert.doesNotMatch(source, /Aucune sous-section n[’']est actuellement publiée/);
});
