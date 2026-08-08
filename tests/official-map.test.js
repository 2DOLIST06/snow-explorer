const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCalameoEmbedUrl,
  getOfficialMapPresentation,
  getSafeHttpUrl,
  normalizeOfficialMapUrl,
  selectMapMode,
} = require("../src/lib/officialMap");

const calameoUrl = "https://www.calameo.com/read/0057989615a273aaacd64?page=1";

test("an existing piste map image always has priority over the official URL", () => {
  assert.equal(selectMapMode({ smallMapUrl: "https://example.com/map-small.webp", largeMapUrl: "https://example.com/map-large.webp", officialMapUrl: calameoUrl }), "image");
});

test("Calameo read URLs use its official viewer and retain the page", () => {
  assert.equal(getCalameoEmbedUrl(calameoUrl), "https://v.calameo.com/?bkcode=0057989615a273aaacd64&page=1");
  assert.deepEqual(getOfficialMapPresentation(calameoUrl), {
    sourceUrl: calameoUrl,
    embedUrl: "https://v.calameo.com/?bkcode=0057989615a273aaacd64&page=1",
    provider: "calameo",
  });
});

test("safe non-Calameo URLs are embedded directly", () => {
  const url = "https://example.com/official-interactive-map";
  assert.deepEqual(getOfficialMapPresentation(url), { sourceUrl: url, embedUrl: url, provider: "generic" });
  assert.equal(selectMapMode({ officialMapUrl: url }), "embed");
});

test("legacy Markdown links are normalized to their raw HTTP(S) target", () => {
  const markdownUrl = `[${calameoUrl}](${calameoUrl})`;
  assert.equal(normalizeOfficialMapUrl(markdownUrl), calameoUrl);
  assert.equal(getCalameoEmbedUrl(markdownUrl), "https://v.calameo.com/?bkcode=0057989615a273aaacd64&page=1");
});

test("official URLs from any HTTP(S) host remain raw", () => {
  for (const url of ["https://station.example.com/plan", "https://maps.station.example.com/winter"]) {
    assert.equal(normalizeOfficialMapUrl(url), url);
    assert.equal(getOfficialMapPresentation(url).sourceUrl, url);
  }
});

test("the presentation keeps an external fallback for every embeddable URL", () => {
  const url = "https://station.example/map-that-may-refuse-framing";
  assert.equal(getOfficialMapPresentation(url).sourceUrl, url);
});

test("missing and dangerous map URLs keep the existing no-map state", () => {
  assert.equal(selectMapMode({ smallMapUrl: null, largeMapUrl: null, officialMapUrl: null }), "none");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/map.pdf", "https://user:password@example.com/map"] ) {
    assert.equal(normalizeOfficialMapUrl(url), null);
    assert.equal(getSafeHttpUrl(url), null);
    assert.equal(getOfficialMapPresentation(url), null);
    assert.equal(selectMapMode({ officialMapUrl: url }), "none");
  }
});

test("lookalike and malformed Calameo URLs are not trusted as Calameo embeds", () => {
  assert.equal(getCalameoEmbedUrl("https://calameo.example/read/abc"), null);
  assert.equal(getCalameoEmbedUrl("https://www.calameo.com/read/abc<script>"), null);
  assert.equal(getCalameoEmbedUrl("https://www.calameo.com/account"), null);
});
