const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeRegionHtml, absoluteRegionLink, regionDescription, hasRegionContent } = require('../src/lib/regionHtml');
test('preserves all supported editorial tags and absolute links', () => {
 const html = '<h2>Titre</h2><h3>Détail</h3><p><strong>Gras</strong><em>Italique</em><br /><a href="https://example.com/page">Lien</a></p><ul><li>A</li></ul><ol><li>B</li></ol><blockquote>Citation</blockquote>';
 assert.equal(sanitizeRegionHtml(html), html);
});
test('removes active content, attributes, unsupported formats and unsafe links', () => {
 const html = sanitizeRegionHtml('<script>alert(1)</script><h1>X</h1><p onclick="evil()"><u>U</u><s>S</s><img src=x onerror=evil()><a href="javascript:evil()">J</a><a href="//evil.com">P</a><a href="/relative">R</a></p>');
 assert.equal(html, 'X<p>US<a>J</a><a>P</a><a>R</a></p>');
 assert.equal(sanitizeRegionHtml('<a href="java&#x73;cript:alert(1)">X</a>'), '<a>X</a>');
});
test('explicit empty description never falls back to seo_text', () => {
 assert.equal(regionDescription({ description_html: '', seo_text: '<p>Ancien</p>' }), '');
 assert.equal(regionDescription({ seo_text: '<p>Ancien</p>' }), '');
 assert.equal(hasRegionContent('<p><br /></p>'), false);
 assert.equal(hasRegionContent('<p>&nbsp;</p>'), false);
 assert.equal(hasRegionContent('<h2>Région</h2>'), true);
});
test('internal links become absolute, unsafe schemes are rejected', () => {
 assert.equal(absoluteRegionLink('/stations/test'), 'https://www.snow-explorer.com/stations/test');
 for (const href of ['javascript:alert(1)', '//evil.com', 'data:text/html,x', '', 'relative']) assert.equal(absoluteRegionLink(href), null);
 assert.equal(absoluteRegionLink('https://example.com'), 'https://example.com/');
});
