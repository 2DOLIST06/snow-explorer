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
    ...['weather', 'webcams', 'access'].map(section => React.createElement(StationSection, { key: section, section, label: section, stations, initialDataByStation }))));
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
  const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length, 'shared widget headings and panels have unique IDs');
  assert.equal(document.querySelectorAll('.ski-area-station-panel[hidden]').length, 3);
});
