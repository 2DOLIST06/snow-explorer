const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
const { matchesSearch } = require('../src/lib/searchNormalization');
function load(file, resolve) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText)(resolve, module, module.exports);
  return module.exports;
}
const stations = [
  { id: '1', slug: 'meribel', name: 'Méribel', is_active: true, region: { name: 'Alpes' }, department: { name: 'Savoie' } },
  { id: '2', slug: 'auron', name: 'Auron', is_active: true, region: { name: 'Sud' }, department: { name: 'Alpes-Maritimes' } },
];
test('webcam routes resolve active stations, unknown slugs and catalogue failures without Windy SSR calls', async () => {
  let catalogue = stations, calls = 0;
  const { getWebcamsPageProps } = load('src/lib/webcamPages.ts', name => {
    assert.equal(name, '@/lib/api/resorts');
    return { fetchActiveResortsServer: async () => { calls++; return catalogue; } };
  });
  const headers = {};
  const res = { setHeader: (key, value) => { headers[key] = value; } };
  assert.equal((await getWebcamsPageProps({ res })).props.station, null);
  assert.equal((await getWebcamsPageProps({ res, params: { slug: 'meribel' } })).props.station.name, 'Méribel');
  assert.deepEqual(await getWebcamsPageProps({ res, params: { slug: 'unknown' } }), { notFound: true });
  catalogue = [];
  const empty = await getWebcamsPageProps({ res, params: { slug: 'meribel' } });
  assert.equal(res.statusCode, 503);
  assert.equal(headers['Retry-After'], '300');
  assert.equal(empty.props.unavailable, true);
  assert.equal(calls, 4);
});
test('directory uses existing search, dedicated links and shared grid once; details stay noindex', async () => {
  const oldWindow = global.window;
  global.window = { matchMedia: () => ({ matches: false }), requestAnimationFrame: callback => callback() };
  const SharedGrid = () => null;
  try {
    const Page = load('src/components/webcams/WebcamsDirectory.tsx', name => {
      if (name === 'next/head') return { __esModule: true, default: ({ children }) => React.createElement('head', null, children) };
      if (name === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) };
      if (name === '@/lib/searchNormalization') return require('../src/lib/searchNormalization');
      if (name === '@/components/stations/StationLegacyWebcams') return { WebcamsAuto: SharedGrid };
      return require(name);
    }).default;
    let tree;
    await renderer.act(async () => { tree = renderer.create(React.createElement(Page, { initialStations: stations, station: null })); });
    assert.equal(tree.root.findAllByType(SharedGrid).length, 0);
    const input = tree.root.findByType('input');
    for (const query of ['meribel', 'Savoie', 'sud', 'introuvable']) {
      await renderer.act(async () => input.props.onChange({ target: { value: query } }));
      const links = tree.root.findAllByType('a').filter(link => link.props.href.startsWith('/webcams/'));
      assert.equal(links.length, query === 'introuvable' ? 0 : 1);
    }
    await renderer.act(async () => tree.update(React.createElement(Page, { initialStations: stations, station: stations[0] })));
    assert.equal(tree.root.findAllByType(SharedGrid).length, 1);
    assert.equal(tree.root.findByProps({ name: 'robots' }).props.content, 'noindex,follow');
    assert.equal(tree.root.findByProps({ rel: 'canonical' }).props.href, 'https://www.snow-explorer.com/webcams/meribel');
    assert.equal(tree.root.findByType('h1').children.join(''), 'Webcams Méribel');
    const stationLink = tree.root.findAllByType('a').find(link => link.props.href === '/stations/meribel');
    assert.ok(stationLink);
    assert.equal(stationLink.children.filter(child => typeof child === 'string').join('').trim(), 'Voir la station de ski Méribel');
    assert.ok(tree.root.findAllByType('a').some(link => link.props.href === '/webcams'));
    assert.ok(matchesSearch('Méribel Savoie', 'meribel'));
    await renderer.act(async () => tree.unmount());
  } finally { global.window = oldWindow; }
});

test('both webcam landing routes render SEO in initial HTML before any selection', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const { JSDOM } = require('jsdom');
  const resolve = name => {
    if (name === 'next/head') return { __esModule: true, default: ({ children }) => React.createElement('head', null, children) };
    if (name === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) };
    if (name === '@/lib/searchNormalization') return require('../src/lib/searchNormalization');
    if (name === '@/components/stations/StationLegacyWebcams') return { WebcamsAuto: () => null };
    if (name === '@/components/webcams/WebcamsDirectory') return load('src/components/webcams/WebcamsDirectory.tsx', resolve);
    if (name === '@/lib/webcamPages') return { getWebcamsPageProps: () => null };
    if (name === '../webcam') return load('pages/webcam.tsx', resolve);
    return require(name);
  };
  for (const route of ['pages/webcam.tsx', 'pages/webcams/index.tsx']) {
    const Page = load(route, resolve).default;
    for (const initialStations of [stations, []]) {
      const html = renderToStaticMarkup(React.createElement(Page, { initialStations, station: null }));
      const doc = new JSDOM(html).window.document;
      assert.equal(doc.querySelectorAll('h1').length, 1);
      assert.equal(doc.querySelector('h1').textContent, 'Webcams des stations de ski en France');
      assert.equal(doc.querySelector('title').textContent, 'Webcams stations de ski en France : neige et pistes');
      assert.equal(doc.querySelector('meta[name="description"]').content, "Consultez les webcams des stations de ski en France. Observez l'enneigement, la visibilité et les pistes dans les Alpes, les Pyrénées et les autres massifs.");
      assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://www.snow-explorer.com/webcam');
      assert.equal(doc.querySelectorAll('article h2').length, 4);
      assert.equal(doc.querySelectorAll('article h3').length, 5);
      assert.equal(doc.querySelectorAll('article a').length, 1);
      assert.equal(doc.querySelector('article a').getAttribute('href'), '/meteo');
      assert.equal(doc.querySelector('article a').textContent, 'prévisions météo');
      assert.ok(html.indexOf('weather-layout') < html.indexOf('<article'));
      assert.ok(doc.querySelector('article').textContent.includes('Les images restent néanmoins une indication visuelle ponctuelle.'));
    }
  }
});
