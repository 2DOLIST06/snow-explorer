const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
const { renderToStaticMarkup } = require('react-dom/server');

function load() {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/components/stations/StationV3Page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const stub = ({ children }) => React.createElement('div', null, children);
  new Function('require', 'module', 'exports', code)(name => {
    if (name.startsWith('react')) return require(name);
    if (name === '@/lib/stationOverview') return require('../src/lib/stationOverview');
    if (name === '@/lib/stationPisteMap') return require('../src/lib/stationPisteMap');
    if (name === '@/lib/stationContent') return { SECTION_LABELS: {}, getStationEditorialContent: () => '' };
    if (name === '@/lib/stationName') return { stationNameOf: name => name };
    if (name === '@/components/stations/StationPisteMap') return { PlanPistesFigure: props => React.createElement('figure', { 'data-map': props.large || props.small || props.officialUrl }, props.caption) };
    if (name === 'lucide-react') return { Check: () => React.createElement('svg', { 'data-check': 'green' }), MapPin: stub };
    return { __esModule: true, default: stub };
  }, module, module.exports);
  return module.exports;
}
const { Overview, PisteMap } = load();
const station = { slug: 'mixed', name: 'Mixed', ski_area_km: 10, pistes_count: 5, pistes_large_map_url: 'https://example.test/alpine.jpg' };
const widgets = { nordique: { enabled: true, ski_area_km: 35, pistes_count: 8, classic: true, large_map_url: 'https://example.test/nordic.jpg' } };

test('all Alpine and Nordic indicators are in server HTML and switching only hides the panel', () => {
  const html = renderToStaticMarkup(React.createElement(Overview, { station, widgets }));
  assert.match(html, /Kilomètres de ski alpin/);
  assert.match(html, /Kilomètres nordiques/);
  assert.match(html, /Techniques de ski/);
  assert.match(html, /Classique/);
  assert.doesNotMatch(html, />Skating</);
  let view;
  renderer.act(() => { view = renderer.create(React.createElement(Overview, { station, widgets })); });
  const click = label => renderer.act(() => view.root.findAllByType('button').find(b => b.children.includes(label)).props.onClick());
  assert.equal(view.root.findByProps({ 'aria-label': 'Ski alpin' }).props.hidden, true);
  assert.equal(view.root.findAllByType('button').find(b => b.children.includes('Nordique')).props['aria-pressed'], true);
  click('Nordique');
  assert.equal(view.root.findByProps({ 'aria-label': 'Ski alpin' }).props.hidden, true);
  assert.equal(view.root.findByProps({ 'aria-label': 'Ski nordique' }).props.hidden, false);
  assert.match(JSON.stringify(view.toJSON()), /Kilomètres de ski alpin/);
  click('Alpin');
  assert.equal(view.root.findByProps({ 'aria-label': 'Ski nordique' }).props.hidden, true);
  click('Tout le domaine');
  assert.equal(view.root.findByProps({ 'aria-label': 'Ski nordique' }).props.hidden, false);
  view.unmount();
});

test('single-discipline stations have no discipline selector or negative technique badges', () => {
  const nordic = renderToStaticMarkup(React.createElement(Overview, { station: { name: 'Nordic' }, widgets }));
  assert.doesNotMatch(nordic, /Discipline affichée|Ski alpin|>Skating</);
  const alpine = renderToStaticMarkup(React.createElement(Overview, { station, widgets: null }));
  assert.doesNotMatch(alpine, /Discipline affichée|Ski nordique/);
});

test('maps switch exclusively and the Nordic-only map needs no Alpine map', () => {
  let view;
  renderer.act(() => { view = renderer.create(React.createElement(PisteMap, { station, widgets })); });
  assert.equal(view.root.findByType('figure').props['data-map'], station.pistes_large_map_url);
  renderer.act(() => view.root.findAllByType('button').find(b => b.children.includes('Domaine nordique')).props.onClick());
  assert.equal(view.root.findAllByType('figure').length, 1);
  assert.equal(view.root.findByType('figure').props['data-map'], widgets.nordique.large_map_url);
  assert.doesNotMatch(JSON.stringify(view.toJSON()), /Remontées/);
  view.unmount();
  const html = renderToStaticMarkup(React.createElement(PisteMap, { station: { name: 'Nordic' }, widgets }));
  assert.match(html, /nordic.jpg/);
  assert.doesNotMatch(html, /Plan des pistes affiché|alpine.jpg/);
});

test('server HTML selects Alpine above 20 km even with a longer Nordic network', () => {
  const html = renderToStaticMarkup(React.createElement(Overview, { station: { ...station, ski_area_km: 21 }, widgets }));
  assert.match(html, /aria-label="Ski nordique" hidden=""/);
  assert.doesNotMatch(html, /aria-label="Ski alpin" hidden/);
  assert.match(html, /Kilomètres nordiques/);
  const boundary = renderToStaticMarkup(React.createElement(Overview, { station: { ...station, ski_area_km: 20 }, widgets }));
  assert.match(boundary, /aria-label="Ski alpin" hidden=""/);
  assert.match(boundary, /Kilomètres de ski alpin/);
});
