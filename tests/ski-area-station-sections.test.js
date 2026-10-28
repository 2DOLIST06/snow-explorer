const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

function load(file, overrides = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => overrides[name] || require(name), module, module.exports);
  return module.exports;
}
const member = slug => ({ id: slug, slug, name: slug.toUpperCase(), logo_url: null, cover_image_url: null });
const blocks = Object.fromEntries(['Weather', 'Webcams', 'LocationAccess'].map(name => [name,
  props => React.createElement('article', { 'data-block': name, ...props }),
]));
const Sections = load('src/components/skiAreas/SkiAreaStationSections.tsx', {
  '@/components/stations/StationV3Page': { ...blocks, StationV3Styles: () => null },
}).default;

test('each selector switches only its block and never passes another station’s initial resources', () => {
  const stations = [member('alpha'), member('beta')];
  const initialData = { observations: { station: { slug: 'alpha' } }, forecasts: [], webcams: [] };
  let view;
  act(() => { view = create(React.createElement(Sections, { stations, initialData })); });
  const rendered = () => view.root.findAllByType('article');
  assert.equal(view.root.findAllByType('select').length, 3);
  assert.deepEqual(rendered().map(block => block.props.station.slug), ['alpha', 'alpha', 'alpha']);
  assert.equal(rendered()[0].props.initialData, initialData);
  for (let index = 0; index < 3; index++) {
    act(() => view.root.findAllByType('select')[index].props.onChange({ target: { value: 'beta' } }));
    assert.equal(rendered()[index].props.station.slug, 'beta');
    assert.equal(rendered()[index].props.initialData, undefined);
    assert.deepEqual(rendered().map(block => block.props.station.slug),
      [0, 1, 2].map(i => i <= index ? 'beta' : 'alpha'));
  }
  act(() => view.root.findAllByType('select')[0].props.onChange({ target: { value: 'alpha' } }));
  assert.equal(rendered()[0].props.initialData, initialData);
  act(() => view.unmount());
});

test('empty and single station domains have no invalid selection', () => {
  let view;
  act(() => { view = create(React.createElement(Sections, { stations: [] })); });
  assert.equal(view.root.findAllByType('select').length, 0);
  assert.match(JSON.stringify(view.toJSON()), /aucune station active/);
  act(() => view.update(React.createElement(Sections, { stations: [member('alpha')] })));
  for (const select of view.root.findAllByType('select')) {
    assert.equal(select.props.value, 'alpha');
    assert.equal(select.findAllByType('option').length, 1);
    assert.ok(view.root.findAllByType('label').some(label => label.props.htmlFor === select.props.id));
  }
  act(() => view.unmount());
});

test('loader verifies membership and activity, deduplicates, tolerates missing stations and omits unrelated fields', async () => {
  const original = global.fetch;
  const requests = [];
  const { loadSkiAreaStations } = load('src/lib/api/skiAreaStations.ts', {
    './stationPage': { ...require('../src/lib/api/stationPage'), getStationApiBase: () => 'https://backend.example' },
    '../stationContent': load('src/lib/stationContent.ts'),
  });
  global.fetch = async url => {
    const slug = url.split('/').pop();
    requests.push(slug);
    if (slug === 'missing') return { ok: false };
    return { ok: true, json: async () => ({
      ...member(slug), is_active: slug !== 'inactive-detail', latitude: 44, longitude: 7,
      region_name: 'Alpes', ski_pass: { private: true }, admin_notes: 'never serialize',
      v2_weather_snow_html: '<p>Neige</p>',
    }) };
  };
  try {
    const result = await loadSkiAreaStations([
      member('alpha'), member('alpha'), { ...member('inactive-member'), is_active: false },
      member('inactive-detail'), member('missing'), member('beta'),
    ]);
    assert.deepEqual(requests, ['alpha', 'inactive-detail', 'missing', 'beta']);
    assert.deepEqual(result.map(station => station.slug), ['alpha', 'beta']);
    assert.equal(result[0].latitude, 44);
    assert.equal(result[0].region.name, 'Alpes');
    assert.equal(result[0].v2_weather_snow_html, '<p>Neige</p>');
    assert.equal(result[0].ski_pass, undefined);
    assert.equal(result[0].admin_notes, undefined);
  } finally { global.fetch = original; }
});
