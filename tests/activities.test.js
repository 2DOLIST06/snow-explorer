const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { cleanActivityHtml, activeActivityItems, widgetDocument } = require('../src/lib/activities');
const image = { id: 'img', type: 'image', enabled: true, src: 'https://cdn.test/photo.jpg', alt: 'Photo', href: 'https://partner.test/?ref=A%2FB&x=1&x=2', newTab: true };
const rich = { id: 'rich', type: 'rich', enabled: true, html: '<p>Découvrir</p>' };
const embed = { id: 'embed', type: 'embed', enabled: true, html: '<div id="widget"></div><script src="https://partner.test/widget.js" async></script>', origins: ['https://api.partner.test'] };
test('mixed active items preserve configured order and hide empty or disabled blocks', () => {
  const block = { enabled: true, items: [embed, image, rich, { ...image, id: 'disabled', enabled: false }] };
  assert.deepEqual(activeActivityItems(block).map(item => item.id), ['embed', 'img', 'rich']);
  assert.deepEqual(activeActivityItems({ ...block, enabled: false }), []);
  assert.deepEqual(activeActivityItems({ enabled: true, items: [{ ...rich, html: '<p> &nbsp; </p>' }] }), []);
  assert.deepEqual(activeActivityItems({ enabled: true, items: [{ ...image, href: 'javascript:alert(1)' }] }), []);
});
test('rich content removes executable code and preserves tracking with sponsored safe links', () => {
  const output = cleanActivityHtml(`<a href="${image.href}" target="_blank" class="activity-button" onclick="alert(1)">Réserver</a><img src="https://cdn.test/x.png" onerror="x()"><script>bad()</script><iframe src="https://evil.test"></iframe>`);
  const doc = new JSDOM(output).window.document;
  assert.equal(doc.querySelector('a').getAttribute('href'), image.href);
  assert.equal(doc.querySelector('a').getAttribute('rel'), 'sponsored noopener noreferrer');
  assert.equal(doc.querySelector('a').className, 'activity-button');
  assert.equal(doc.querySelector('[onclick],[onerror],script,iframe'), null);
});
test('widget document supports external scripts and iframe without giving parent privileges', () => {
  const output = widgetDocument({ ...embed, html: embed.html + '<iframe src="https://frames.test/widget"></iframe><a href="https://partner.test/?ref=1&amp;x=2">Voir</a>' }, 'nonce123', 'token123');
  const doc = new JSDOM(output).window.document;
  const csp = doc.querySelector('[http-equiv]').content;
  assert.match(csp, /default-src 'none'/); assert.match(csp, /https:\/\/partner.test/); assert.match(csp, /https:\/\/api.partner.test/); assert.match(csp, /https:\/\/frames.test/);
  assert.equal(doc.querySelector('script[src]').src, 'https://partner.test/widget.js');
  assert.equal(doc.querySelector('a').rel, 'sponsored noopener noreferrer');
  assert.equal(doc.querySelector('iframe').getAttribute('referrerpolicy'), 'no-referrer');
  assert.match(output, /postMessage/);
});
test('unsaved widget preview strips inline execution and unsafe attributes', () => {
  const output = widgetDocument({ ...embed, html: '<script>alert(1)</script><img src="https://cdn.test/x" onerror="x()"><iframe srcdoc="<script>x()</script>"></iframe><base href="https://evil.test"><form></form>' }, 'n', 't');
  const doc = new JSDOM(output).window.document;
  assert.equal(doc.querySelector('script:not([nonce])'), null);
  assert.equal(doc.querySelector('[onerror],[srcdoc],base,form'), null);
});

test('GetYourGuide container bootstraps its loader once inside the isolated document', () => {
  const html = '<div data-gyg-widget="activities" data-gyg-href="https://widget.getyourguide.com/default/activities.frame" data-gyg-partner-id="32QOCNG" data-gyg-location-id="201172"></div>';
  const src = 'https://widget.getyourguide.com/dist/pa.umd.production.min.js';
  for (const code of [html, html + `<script async src="${src}"></script>`, html + `<script async src="${src}?cache=1"></script>`]) {
    const doc = new JSDOM(widgetDocument({ ...embed, html: code }, 'n', 't')).window.document;
    assert.equal(doc.querySelectorAll(`script[src^="${src}"]`).length, 1);
    assert.match(doc.querySelector('[http-equiv]').content, /https:\/\/widget.getyourguide.com/);
    assert.equal(doc.querySelector('body > script').nonce, 'n', 'error listener is installed before partner scripts');
  }
  const unknown = new JSDOM(widgetDocument({ ...embed, html: html.replace('widget.getyourguide.com/', 'evil.test/') }, 'n', 't')).window.document;
  assert.equal(unknown.querySelectorAll('script[src]').length, 0);
});
