const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const automatic = require('../src/lib/stationAutomaticData');
const { normalizeAdminStation, normalizeAdminWidgets } = require('../src/lib/adminStation');
const { getStationOverviewScope } = require('../src/lib/stationOverview');

function load(file, resolve) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  return module.exports;
}

test('coordinates reject absent, boolean, nonnumeric and out-of-range values but preserve explicit zero', () => {
  for (const value of [null, undefined, '', ' ', '\t', true, false, {}, [], 'bad', NaN, Infinity]) {
    assert.equal(automatic.parseCoordinate(value, 90), null);
  }
  for (const value of [0, '0', ' 0 ', -90, 90, '45.5']) {
    assert.equal(automatic.parseCoordinate(value, 90), Number(value));
  }
  assert.equal(automatic.parseCoordinate(90.01, 90), null);
  assert.equal(automatic.parseCoordinate(-180.01, 180), null);
  assert.equal(automatic.parseCoordinate(180, 180), 180);
});


const stubs = new Map();
const StationPage = load('src/components/stations/StationV3Page.tsx', (name) => {
  if (name === 'react') return { ...React, useState: (v) => [v, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) };
  if (name === '@/lib/stationOverview') return require('../src/lib/stationOverview');
  if (name === '@/lib/stationPisteMap') return require('../src/lib/stationPisteMap');
  if (name === '@/components/stations/StationForfaitsBlocks') return { __esModule: true, hasStationForfaits: () => false, default: () => null };
  if (name === '@/components/maps/StationMapCard') return { __esModule: true, stationDirectionsUrl: () => null, default: () => null };
  if (name === '@/lib/activities') return require('../src/lib/activities');
  if (name === '@/lib/stationName') return require('../src/lib/stationName');
  if (name === '@/lib/stationAutomaticData') return automatic;
  if (name === '@/lib/stationContent') return { SECTION_LABELS: {}, stationLocation: () => '', getStationEditorialContent: () => '', getStationSectionData: () => ({}) };
  if (name === 'react/jsx-runtime') return require(name);
  const stub = () => null;
  stubs.set(name, stub);
  if (name.includes('StationLegacyWebcams')) return { WebcamsAuto: stub };
  return { __esModule: true, default: stub };
}).default;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test('station sections select automatic components despite disabled widgets and manual camel/snake/V2 lists', () => {
  for (const items of [[{ imageUrl: 'manual.jpg' }], [{ image_url: 'snake.jpg', iframe_url: 'old.html' }]]) {
    const station = { name: 'Station', slug: 'station', latitude: null, longitude: null, webcams: items, v2: { webcams: { items } } };
    const widgets = { webcams: { enabled: false, items }, meteo: { enabled: true, iframeUrl: 'old-weather' }, snow: { enabled: true, iframeUrl: 'old-snow' } };
    const tree = StationPage({ station, widgets });
    const cams = find(tree, (n) => n.type?.name === 'Webcams');
    const camTree = cams.type(cams.props);
    assert.ok(find(camTree, (n) => n.type === stubs.get('@/components/stations/StationLegacyWebcams')));
    assert.equal(find(camTree, (n) => n.type === 'iframe'), null);
    const weather = find(tree, (n) => n.type?.name === 'Weather');
    const weatherTree = weather.type(weather.props);
    const auto = find(weatherTree, (n) => n.type === stubs.get('@/components/weather/StationWeatherTabs'));
    assert.equal(auto.props.latitude, null);
    assert.equal(auto.props.longitude, null);
    assert.equal(find(weatherTree, (n) => n.type === 'iframe'), null);
  }
});

test('Windy effects make no request for invalid coordinates and use explicit zero', async () => {
  const originalFetch = global.fetch;
  try {
    for (const [file, exportName] of [['StationLegacyWebcams', 'WebcamsAuto']]) {
      for (const lat of [null, undefined, '', ' ', false, true, 91, 0, '0']) {
        const effects = [];
        const requests = [];
        global.fetch = async (url) => { requests.push(url); return { ok: true, json: async () => ({ webcams: [], daily: {} }) }; };
        const component = load(`src/components/stations/${file}.tsx`, (name) => {
          if (name === 'react') return { ...React, useRef: () => ({ current: null }), useEffect: (effect) => effects.push(effect), useState: (value) => [value, () => {}] };
          if (name === '@/lib/stationName') return require('../src/lib/stationName');
          if (name === '@/lib/stationAutomaticData') return automatic;
          if (name === '../../lib/stationWebcams') return require('../src/lib/stationWebcams');
          return require(name);
        })[exportName];
        component({ name: 'Station', lat, lon: 0 });
        const oldWindow = global.window;
        global.window = { setInterval: () => 0, clearInterval: () => {} };
        effects.forEach((effect) => effect());
        global.window = oldWindow;
        await new Promise(setImmediate);
        assert.equal(requests.length, lat === 0 || lat === '0' ? 1 : 0, `${file}: ${String(lat)}`);
        if (requests.length) assert.match(requests[0], file.includes('Webcams') ? /lat=0&lon=0&radiusKm=30/ : /latitude=0&longitude=0/);
      }
    }
  } finally { global.fetch = originalFetch; }
});

test('station H2s retain natural geographic context only where useful', () => {
  const station = { name: 'Le Lac Blanc', slug: 'le-lac-blanc' };
  const tree = StationPage({ station, widgets: null });
  const titles = {};
  for (const type of ['Overview', 'Weather', 'Webcams', 'SkiPasses', 'PisteMap', 'LocationAccess']) {
    const section = find(tree, node => node.type?.name === type);
    const sectionTree = section.type(section.props);
    titles[type] = find(sectionTree, node => node.type?.name === 'SectionHeading').props.title;
  }
  assert.deepEqual(titles, {
    Overview: 'Présentation',
    Weather: 'Météo et enneigement au Lac Blanc',
    Webcams: 'Webcams du Lac Blanc',
    SkiPasses: 'Forfaits de ski',
    PisteMap: 'Plan des pistes du Lac Blanc',
    LocationAccess: 'Localisation, accès et hébergement',
  });
});
