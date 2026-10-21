const test = require('node:test');
const assert = require('node:assert/strict');
const { hasStoredActivityContent } = require('../src/lib/activities');
const { departmentActivityConfig, resolveStationActivities, departmentActivityGaps } = require('../src/lib/departmentActivities');
const departments = require('../src/lib/departmentActivities.json');
const empty = { enabled: false, title: 'Activités à faire', items: [] };
// Synthetic IDs below are test fixtures only, never production destination mappings.
const mapping = Object.fromEntries(['73', '74'].map(code => [code, { ...departments[code], locationId: code === '73' ? '900000001' : '900000002' }]));
const blockWith = item => ({ enabled: true, title: 'Titre personnalisé', items: [{ id: 'custom', enabled: true, ...item }] });

test('stored content detection recognizes empty editor HTML and whitespace', () => {
  for (const html of [null, '', ' \n ', '<p><br></p>', '<div> &nbsp; &#160; &#xA0; \u200b</div>', '<!-- commentaire -->']) {
    for (const type of ['rich', 'embed']) assert.equal(hasStoredActivityContent(blockWith({ type, html })), false, `${type}: ${html}`);
  }
  assert.equal(hasStoredActivityContent(null), false);
  assert.equal(hasStoredActivityContent(empty), false);
});

test('custom text, image, embed and disabled saved content always suppress replacement', () => {
  for (const item of [
    { type: 'rich', html: '<p>Une randonnée</p>' },
    { type: 'rich', html: '<img src="https://partner.test/missing.png">' },
    { type: 'image', src: 'https://partner.test/missing.png', href: 'https://partner.test/', alt: '' },
    { type: 'image', src: 'broken-saved-url', href: '', alt: '' },
    { type: 'embed', html: '<script src="https://blocked.test/widget.js"></script>', origins: [] },
    { type: 'embed', html: '<iframe src="https://blocked.test/"></iframe>', origins: [] },
    { type: 'embed', html: '<div data-widget="custom"></div>', origins: [] },
    { type: 'rich', html: '<p>Inactif</p>', enabled: false },
  ]) {
    const block = blockWith(item);
    assert.equal(hasStoredActivityContent(block), true);
    assert.equal(resolveStationActivities(block, 'Savoie', true, mapping), block);
    block.enabled = false;
    assert.equal(resolveStationActivities(block, 'Savoie', true, mapping), block);
  }
  const neverRead = new Proxy({}, { get() { throw Error('replacement configuration must not be read'); } });
  const block = blockWith({ type: 'rich', html: 'Texte' });
  assert.equal(resolveStationActivities(block, '73', true, neverRead), block);
});

test('empty block uses only its own mapped department and exact centralized title', () => {
  const block = resolveStationActivities(empty, { code: '73', name: 'Ignored' }, true, mapping);
  assert.equal(block.title, 'Activité à faire en Savoie');
  assert.match(block.items[0].html, /data-gyg-location-id="900000001"/);
  assert.equal(block.items.length, 1);
  assert.equal(resolveStationActivities(null, 'Haute-Savoie', true, mapping).title, 'Activité à faire en Haute-Savoie');
  assert.equal(resolveStationActivities(blockWith({ type: 'rich', html: '<p>&nbsp;<br></p>' }), '73', true, mapping).title, 'Activité à faire en Savoie');
});

test('unavailable saved data, unknown departments and missing widgets never use a generic destination', () => {
  for (const dep of [null, undefined, '', 'Unknown', 'Courchevel', { code: '99', name: 'Savoie' }, { id: '73' }]) {
    assert.equal(resolveStationActivities(empty, dep, true, mapping), empty);
  }
  assert.equal(resolveStationActivities(empty, '73', false, mapping), empty);
  assert.equal(resolveStationActivities(empty, '73', true), empty);
  assert.deepEqual(departmentActivityGaps(['73', 'Unknown']), [
    { department: '73', code: '73', reason: 'missing_destination_id' },
    { department: 'Unknown', code: null, reason: 'unknown_department' },
  ]);
});

test('department codes and legacy names resolve without fuzzy geographic inference', () => {
  assert.equal(departmentActivityConfig(6).code, '06');
  assert.equal(departmentActivityConfig({ code: '2a' }).code, '2A');
  assert.equal(departmentActivityConfig(' Savoie ').code, '73');
  assert.equal(departmentActivityConfig({ id: 'opaque-id', name: 'Isère' }).code, '38');
  assert.equal(departmentActivityConfig('Pyre\u0301ne\u0301es-Orientales').code, '66');
  assert.equal(departmentActivityConfig('savoie-nearby'), null);
});

test('all repository departments have a locative; no provider IDs are invented', () => {
  assert.equal(Object.keys(departments).length, 96);
  for (const entry of Object.values(departments)) {
    assert.ok(entry.name && entry.locative.replace(/’/g, "'").endsWith(entry.name.replace(/’/g, "'")));
    assert.ok(entry.locationId === null || /^[1-9]\d*$/.test(entry.locationId));
  }
  for (const [code, expected] of Object.entries({ '73': 'en Savoie', '74': 'en Haute-Savoie', '06': 'dans les Alpes-Maritimes', '05': 'dans les Hautes-Alpes', '83': 'dans le Var', '38': 'dans l’Isère', '66': 'dans les Pyrénées-Orientales', '63': 'dans le Puy-de-Dôme' })) {
    assert.equal(departments[code].locative, expected);
  }
});

test('confirmed department mappings target the supplied destinations; uncertain scopes stay disabled', () => {
  const confirmed = {
    '01': '247436', '04': '247540', '06': '167019', '07': '248284',
    '09': '247575', '11': '259128', '25': '247435', '2B': '150371',
    '30': '222497', '31': '247573', '39': '247437', '64': '247572',
    '65': '247574', '66': '247576', '67': '186738', '68': '247438',
    '74': '120865', '84': '185371',
  };
  for (const [code, id] of Object.entries(confirmed)) {
    const block = resolveStationActivities(null, code, true);
    assert.equal(departments[code].locationId, id);
    assert.equal(block.title, `Activité à faire ${departments[code].locative}`);
    assert.match(block.items[0].html, new RegExp(`data-gyg-location-id="${id}"`));
    const custom = blockWith({ type: 'rich', html: '<p>Contenu conservé</p>' });
    assert.equal(resolveStationActivities(custom, code, true), custom);
  }
  for (const code of ['03', '05', '12', '15', '26', '38', '42', '43', '48', '63', '70', '73', '88', '90', '2A']) {
    assert.equal(departments[code].locationId, null);
    assert.equal(resolveStationActivities(null, code, true), null);
  }
  assert.equal(Object.values(departments).filter(entry => entry.locationId !== null).length, 18);
  assert.deepEqual(departmentActivityGaps(['Haute-Savoie', 'Savoie', 'Vosges']), [
    { department: 'Savoie', code: '73', reason: 'missing_destination_id' },
    { department: 'Vosges', code: '88', reason: 'missing_destination_id' },
  ]);
  const serialized = JSON.stringify(departments);
  assert.doesNotMatch(serialized, /173369|159731|"200"/);
});

test('supplied city widget preserves all parameters except the mapped location ID, with one loader', () => {
  const { JSDOM } = require('jsdom');
  const { widgetDocument, getYourGuideScriptUrl } = require('../src/lib/activities');
  const block = resolveStationActivities(empty, '73', true, mapping);
  const doc = new JSDOM(widgetDocument(block.items[0], 'nonce', 'token')).window.document;
  const widget = doc.querySelector('div[data-gyg-widget]');
  assert.deepEqual(Object.fromEntries([...widget.attributes].map(attr => [attr.name, attr.value])), {
    'data-gyg-href': 'https://widget.getyourguide.com/default/city.frame',
    'data-gyg-location-id': '900000001',
    'data-gyg-locale-code': 'fr-FR',
    'data-gyg-widget': 'city',
    'data-gyg-partner-id': '32QOCNG',
  });
  assert.equal(doc.querySelectorAll('script[src]').length, 1);
  assert.equal(doc.querySelector('script[src]').src, getYourGuideScriptUrl);
  assert.equal(doc.querySelector('script[src]').getAttribute('data-gyg-partner-id'), '32QOCNG');
  assert.match(doc.querySelector('[http-equiv]').content, /https:\/\/widget.getyourguide.com/);
  assert.match(doc.querySelector('[http-equiv]').content, /https:\/\/www.getyourguide.com/);
});

test('missing or malformed destination IDs cannot inject a widget or another parameter', () => {
  for (const locationId of [null, '', ' ', 0, '0', -1, '73&locale=en', '1" onclick="bad()', 'undefined']) {
    const customMapping = { '73': { ...departments['73'], locationId } };
    assert.equal(resolveStationActivities(empty, '73', true, customMapping), empty);
  }
});
