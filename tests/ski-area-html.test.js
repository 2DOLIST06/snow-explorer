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
    if (name === 'next/head') return { __esModule: true, default: () => null };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
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

test('raw domain HTML includes each station’s actual weather, snow, forecasts, webcam, access and affiliate links', () => {
  const { StationSection } = load('src/components/skiAreas/SkiAreaStationSections.tsx');
  const stations = ['alpha', 'beta'].map((slug, index) => ({
    slug, name: slug.toUpperCase(), id: slug, latitude: 44 + index, longitude: 7,
    department: 'Savoie', logo_url: null, cover_image_url: null,
  }));
  const initialDataByStation = Object.fromEntries(stations.map((station, index) => [station.slug, {
    observations: { station, status: 'available', observation: { temperature_c: 3 + index, snow_depth_cm: 57 + index, validity_time: '2026-10-28T12:00:00Z' }, source: { station_name: `Poste ${station.slug}` } },
    forecasts: [{ date: '2026-10-29', weatherCode: 0, temperatureMinC: -2, temperatureMaxC: 5, snowfallCm: 7 + index }],
    webcams: [{ id: station.slug, title: `Webcam ${station.slug}`, preview: `https://images.example/${station.slug}.jpg`, capturedAt: null, link: `https://cams.example/${station.slug}` }],
  }]));
  const html = renderToStaticMarkup(React.createElement('main', null,
    ...['weather', 'webcams', 'access'].map(section => React.createElement(StationSection, { key: section, section, label: section, domainName: "Grand Domaine", stations, initialDataByStation }))));
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelectorAll('.ski-area-station-panel').length, 6);
  for (let index = 0; index < stations.length; index++) {
    const slug = stations[index].slug;
    const panels = [...document.querySelectorAll('.ski-area-station-panel')].filter(panel => panel.id.endsWith(`-${slug}`));
    assert.match(panels[0].textContent, new RegExp(`${57 + index} cm`));
    assert.match(panels[0].textContent, new RegExp(`Poste ${slug}`));
    assert.match(panels[0].textContent, new RegExp(`${7 + index} cm`));
    assert.ok(panels[1].querySelector(`img[src="https://images.example/${slug}.jpg"]`));
    assert.ok(panels[2].querySelector('a[href*="google.com/maps/dir/"]'));
    const links = [...panels[2].querySelectorAll('a')].map(link => decodeURIComponent(decodeURIComponent(link.href)));
    assert.ok(links.some(link => link.includes('booking.com') && link.includes(stations[index].name)));
    assert.ok(links.some(link => link.includes('abritel.fr') && link.includes(stations[index].name)));
  }
  assert.equal(document.querySelectorAll('h2').length, 3, 'one domain H2 per section, no repeated station H2s');
  for (const title of document.querySelectorAll('h2')) assert.match(title.textContent, /Grand Domaine/);
  assert.equal(document.querySelectorAll('select').length, 0);
  assert.equal(document.querySelectorAll('.ski-area-station-switch button').length, 6);
  for (const button of document.querySelectorAll('.ski-area-station-switch button')) assert.ok(document.getElementById(button.getAttribute('aria-controls')));
  assert.equal(document.querySelectorAll('.ski-area-station-attribution').length, 6);
  const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length, 'shared widget headings and panels have unique IDs');
  assert.equal(document.querySelectorAll('.ski-area-station-panel[hidden]').length, 3);
});

test('domain navigation belongs to the same frame as the hero and follows its description', () => {
  const Page = load('pages/domaines-skiables/[slug].tsx').default;
  const html = renderToStaticMarkup(React.createElement(Page, {
    area: { id: 1, name: 'Grand Domaine', slug: 'grand-domaine', description: 'Description complète du domaine.' },
    stations: [], initialDataByStation: {},
  }));
  const document = new JSDOM(html).window.document;
  const frame = document.querySelector('.ski-area-masthead');
  assert.ok(frame);
  assert.ok(frame.querySelector('.ski-area-hero .ski-area-description'));
  assert.ok(frame.querySelector('.ski-area-navigation'));
  assert.equal(frame.children[0].className, 'ski-area-hero');
  assert.ok(frame.children[1].classList.contains('ski-area-navigation'));
  assert.match(frame.children[0].textContent, /Description complète/);
});

test('weather subtab is shared across stations and stays selected after revisiting a station', async () => {
  const { create, act } = require('react-test-renderer');
  const { StationSection } = load('src/components/skiAreas/SkiAreaStationSections.tsx');
  const original = global.fetch;
  global.fetch = async url => ({ ok: true, json: async () => ({ station: { slug: url.split('/').at(-2) }, status: 'unavailable', observation: null, source: null }) });
  const stations = ['alpha', 'beta'].map(slug => ({ id: slug, slug, name: slug, latitude: null, longitude: null }));
  const data = Object.fromEntries(stations.map(station => [station.slug, { observations: { station, status: 'unavailable', observation: null }, forecasts: [], webcams: [] }]));
  let view;
  try {
    await act(async () => { view = create(React.createElement(StationSection, { stations, section: 'weather', label: 'Météo et enneigement', domainName: 'Grand Domaine', initialDataByStation: data })); });
    const panel = () => view.root.findAll(node => node.type === 'div' && node.props.className === 'ski-area-station-panel' && !node.props.hidden)[0];
    const tabs = () => panel().findAllByProps({ role: 'tab' });
    const stationButtons = () => view.root.findByProps({ role: 'group' }).findAllByType('button');
    act(() => tabs()[1].props.onClick());
    assert.equal(tabs()[1].props['aria-selected'], true);
    await act(async () => stationButtons()[1].props.onClick());
    assert.equal(tabs()[1].props['aria-selected'], true, 'Prévisions stays selected for beta');
    act(() => tabs()[2].props.onClick());
    await act(async () => stationButtons()[0].props.onClick());
    assert.equal(tabs()[2].props['aria-selected'], true, 'Avalanche stays selected on return to alpha');
    await act(async () => stationButtons()[1].props.onClick());
    assert.equal(tabs()[2].props['aria-selected'], true, 'beta does not restore its previous local Prévisions state');
    act(() => tabs()[2].props.onKeyDown({ key: 'Home', preventDefault() {} }));
    await act(async () => stationButtons()[0].props.onClick());
    assert.equal(tabs()[0].props['aria-selected'], true, 'keyboard selection also persists');
  } finally { if (view) act(() => view.unmount()); global.fetch = original; }
});
