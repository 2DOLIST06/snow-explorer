const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const resolver = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === 'next/head') return { __esModule: true, default: ({ children }) => React.createElement(React.Fragment, null, children) };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
    if (name === '@/components/stations/StationLegacyHero') return { __esModule: true, default: ({ station }) => React.createElement('h1', null, station.name) };
    if (name === '@/components/maps/StationMapCard') return {
      __esModule: true, default: () => null,
      stationDirectionsUrl: station => `https://www.google.com/maps/dir/?destination=${station.latitude},${station.longitude}`,
    };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = [base, ...['.ts', '.tsx', '.js'].map(ext => base + ext)].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      return load(resolved);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(resolver, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}


const TestRenderer = require('react-test-renderer');

test('station HTML contains every mobile panel before any interaction', () => {
  const StationPage = load('src/components/stations/StationV3Page.tsx').default;
  const html = renderToStaticMarkup(React.createElement(StationPage, {
    station: { slug: 'test', name: 'Station Test', v2_weather_snow_html: '<p>Météo complète conservée</p>', v2_webcam_html: '<p>Webcams complètes conservées</p>' }, widgets: null,
    initialData: { observations: null, forecasts: [], webcams: [] },
  }));
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('.v3-floor-slot').length, 6);
  assert.equal(document.querySelectorAll('.v3-floor-slot[data-mobile-active=true]').length, 1);
  assert.ok(document.querySelector('#station-section-apercu[data-mobile-active=true]'));
  assert.match(document.querySelector('#station-section-meteo-neige').textContent, /Météo complète conservée/);
  assert.match(document.querySelector('#station-section-webcams').textContent, /Webcams complètes conservées/);
  for (const button of document.querySelectorAll('.v3-navigation button')) assert.ok(document.getElementById(button.getAttribute('aria-controls')));
});

test('domain section switching retains every panel and scrolls below the sticky navigation', () => {
  const Sections = load('src/components/skiAreas/SkiAreaSections.tsx').default;
  const scrolls = [];
  global.ResizeObserver = class { observe() {} disconnect() {} };
  global.document = { documentElement: {} };
  global.getComputedStyle = () => ({ getPropertyValue: () => '80px' });
  global.window = { matchMedia: query => ({ matches: query.includes('max-width') }), requestAnimationFrame: callback => callback(), scrollY: 0, scrollTo: options => scrolls.push(options) };
  const sections = ['apercu', 'meteo', 'webcams'].map(id => ({ id, label: id, content: React.createElement('p', null, 'Contenu intégral ' + id) }));
  let tree;
  try {
    TestRenderer.act(() => { tree = TestRenderer.create(React.createElement(Sections, { sections }), { createNodeMock: element => {
      if (element.type === 'nav') return { scrollLeft: 0, clientWidth: 390, scrollWidth: 390, addEventListener() {}, removeEventListener() {}, querySelector: () => null, parentElement: { getBoundingClientRect: () => ({ height: 110 }) } };
      if (element.props.id?.startsWith('domaine-')) return { getBoundingClientRect: () => ({ top: 350 }) };
      return null;
    } }); });
    const before = tree.root.findAll(node => node.props.id?.startsWith('domaine-'));
    assert.equal(before.length, 3);
    assert.equal(before.filter(node => node.props['data-mobile-active']).length, 1);
    TestRenderer.act(() => tree.root.findAllByType('button').find(button => button.props['data-section'] === 'webcams').props.onClick());
    const after = tree.root.findAll(node => node.props.id?.startsWith('domaine-'));
    assert.equal(after.length, 3);
    assert.equal(after.find(node => node.props['data-mobile-active']).props.id, 'domaine-webcams');
    assert.equal(scrolls[0].top, 160);
    for (const id of ['apercu', 'meteo', 'webcams']) assert.ok(JSON.stringify(tree.toJSON()).includes('Contenu intégral ' + id));
  } finally {
    if (tree) TestRenderer.act(() => tree.unmount());
    delete global.window; delete global.document; delete global.getComputedStyle; delete global.ResizeObserver;
  }
});

test('read more preserves the full initial description and only changes its expanded class', () => {
  const Description = load('src/components/skiAreas/MobileDescription.tsx').default;
  const text = 'Texte intégral du domaine. '.repeat(30);
  const html = renderToStaticMarkup(React.createElement(Description, { text }));
  assert.equal(new JSDOM(html).window.document.querySelector('p').textContent, text);
  let tree;
  TestRenderer.act(() => { tree = TestRenderer.create(React.createElement(Description, { text })); });
  TestRenderer.act(() => tree.root.findByType('button').props.onClick());
  assert.equal(tree.root.findByType('button').props['aria-expanded'], true);
  assert.match(tree.root.findByType('p').props.className, /is-expanded/);
  assert.equal(tree.root.findByType('p').children[0], text);
  TestRenderer.act(() => tree.unmount());
});
