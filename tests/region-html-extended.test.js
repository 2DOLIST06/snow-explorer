const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanRegionHtml, regionDescription: getRegionDescription, normalizeRegionLink } = require('../src/lib/regionHtml');

test('description_html is authoritative, even when deliberately cleared', () => {
  assert.equal(getRegionDescription({ description_html: '', seo_text: '<p>Old</p>' }), '');
  assert.equal(getRegionDescription({ description_html: null, seo_text: 'Old' }), '');
  assert.equal(getRegionDescription({ description_html: '<h2>New</h2>', seo_text: 'Old' }), '<h2>New</h2>');
  assert.equal(getRegionDescription({ seo_text: '<p>Legacy</p>' }), '');
});
test('allowed formatting survives cleaning and a simulated backend storage round trip', () => {
  const html = '<h2>Massifs</h2><h3>Alpes</h3><p><strong>Gras</strong> <em>Italique</em><br />Neige</p><ul><li>Une station</li></ul><ol><li>Deux</li></ol><blockquote><p>Citation</p></blockquote><p><a href="/stations/test">Station</a></p>';
  const saved = cleanRegionHtml(html);
  const backend = JSON.parse(JSON.stringify({ seo_text: saved, description_html: saved }));
  assert.equal(cleanRegionHtml(getRegionDescription(backend)), saved);
  for (const tag of ['h2', 'h3', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'blockquote', 'a']) assert.match(saved, new RegExp(`<${tag}[ >]`));
  assert.match(saved, /href="https:\/\/www.snow-explorer.com\/stations\/test"/);
});
test('HTML source and API HTML cannot execute scripts or dangerous links', () => {
  const payloads = [
    '<script>alert(1)</script><p onclick="alert(1)">Safe</p>',
    '<img src=x onerror=alert(1)><iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<a href="javascript:alert(1)">X</a><a href="java&#x73;cript:alert(1)">X</a>',
    '<a href="data:text/html,test">X</a><svg><a xlink:href="javascript:alert(1)">X</a></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
    '<p style="background:url(javascript:alert(1))" onmouseover="alert(1)">Safe</p>',
  ];
  for (const payload of payloads) {
    const safe = cleanRegionHtml(payload);
    assert.doesNotMatch(safe, /<\/?(?:script|iframe|img|svg|math|style)\b|\son\w+=|\sstyle=|href="(?:javascript|data):/i);
    assert.equal(cleanRegionHtml(safe), safe);
  }
});
test('links accept internal paths and web URLs, rejecting unsafe protocols', () => {
  assert.equal(normalizeRegionLink('/regions/alpes'), 'https://www.snow-explorer.com/regions/alpes');
  assert.equal(normalizeRegionLink('http://www.snow-explorer.com/stations/test'), 'https://www.snow-explorer.com/stations/test');
  assert.equal(normalizeRegionLink('https://example.com/page'), 'https://example.com/page');
  for (const url of ['javascript:alert(1)', 'data:text/html,a', 'https://user:pass@example.com', 'java\nscript:alert(1)', '\\evil.com', '']) assert.equal(normalizeRegionLink(url), '');
});
