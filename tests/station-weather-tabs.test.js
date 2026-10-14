const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { create, act } = require('react-test-renderer');
const cache = new Map();
function load(file, backend = false) {
  file = path.resolve(file);
  if (!backend && cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const resolve = (name) => {
    if (backend && name === '@/lib/api/resorts') return { getServerApiBase: () => 'https://backend.example' };
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name.startsWith('@/') || name.startsWith('./')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(['.ts', '.tsx', '.js'].map((ext) => base + ext).find(fs.existsSync));
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  if (!backend) cache.set(file, module.exports);
  return module.exports;
}
const Tabs = load('src/components/weather/StationWeatherTabs.tsx').default;
const props = { slug: 'isola-2000', name: 'Isola 2000', latitude: 44, longitude: 7, headingLevel: 'h3' };
const flush = () => new Promise(setImmediate);
const observation = { station: { slug: props.slug }, status: 'available', observation: { temperature_c: 8, snow_depth_cm: 0 }, source: { station_name: 'POSTE ISOLA' } };
const forecast = { daily_units: { snowfall_sum: 'cm' }, daily: { time: ['2026-10-14'], snowfall_sum: [2] } };
const avalanche = { station: { slug: props.slug }, status: 'unavailable', mapping_status: 'confirmed', massif: { id: 23, name: 'Mercantour' }, risk: {}, assets: {}, display: {} };
const visible = (renderer) => renderer.root.findAllByProps({ role: 'tabpanel' }).filter((panel) => !panel.props.hidden);
const buttons = (renderer) => renderer.root.findAllByProps({ role: 'tab' });
const contents = (panel) => panel.findAll((node) => typeof node.type === 'string')
  .flatMap((node) => node.children.filter((child) => typeof child === 'string')).join(' ');
const click = (renderer, index) => act(() => buttons(renderer)[index].props.onClick());

test('accessible tabs default to observations and preserve all three loaded resources without refetch', async () => {
  const original = global.fetch;
  const requests = [];
  let renderer;
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/weather') ? observation : url.endsWith('/avalanche-risk') ? avalanche : forecast };
  };
  try {
    await act(async () => { renderer = create(React.createElement(Tabs, props)); await flush(); });
    assert.equal(renderer.root.findAllByProps({ role: 'tablist' }).length, 1);
    assert.deepEqual(buttons(renderer).map((tab) => tab.props.children), ['Observations', 'Prévisions', 'Avalanche']);
    assert.deepEqual(buttons(renderer).map((tab) => tab.props['aria-selected']), [true, false, false]);
    assert.deepEqual(buttons(renderer).map((tab) => tab.props.tabIndex), [0, -1, -1]);
    assert.equal(requests.length, 3);
    for (let index of [0, 1, 2, 0, 2, 1, 0]) {
      click(renderer, index);
      assert.equal(visible(renderer).length, 1);
      const panel = visible(renderer)[0];
      assert.equal(panel.props['aria-labelledby'], buttons(renderer)[index].props.id);
      assert.equal(panel.props.id, buttons(renderer)[index].props['aria-controls']);
      assert.match(contents(panel), [
        /Hauteur de neige au poste/, /Neige prévue/, /Les conditions peuvent varier localement/,
      ][index]);
      assert.equal(buttons(renderer)[index].props['aria-selected'], true);
      assert.equal(requests.length, 3);
    }
  } finally { if (renderer) act(() => renderer.unmount()); global.fetch = original; }
});

test('keyboard arrows wrap, Home and End select and focus, Tab remains normal', async () => {
  const original = global.fetch;
  global.fetch = async () => { throw new Error('offline'); };
  const focused = [];
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Tabs, props), { createNodeMock: (node) =>
      node.type === 'button' ? { focus: () => focused.push(node.props.children) } : null }); await flush(); });
    for (const [from, key, expected] of [[0, 'ArrowLeft', 2], [2, 'ArrowRight', 0], [0, 'End', 2], [2, 'Home', 0]]) {
      let prevented = false;
      act(() => buttons(renderer)[from].props.onKeyDown({ key, preventDefault() { prevented = true; } }));
      assert.equal(prevented, true);
      assert.equal(buttons(renderer)[expected].props['aria-selected'], true);
      assert.equal(focused.at(-1), ['Observations', 'Prévisions', 'Avalanche'][expected]);
    }
    let prevented = false;
    act(() => buttons(renderer)[0].props.onKeyDown({ key: 'Tab', preventDefault() { prevented = true; } }));
    assert.equal(prevented, false);
  } finally { if (renderer) act(() => renderer.unmount()); global.fetch = original; }
});

test('station change resets selection, aborts old sources and cannot flash stale data', async () => {
  const original = global.fetch;
  const requests = [];
  global.fetch = (url, options) => new Promise((resolve) => requests.push({ url, options, resolve }));
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Tabs, props)); });
    await act(async () => {
      for (const request of requests) request.resolve({ ok: true, json: async () =>
        request.url.endsWith('/weather') ? observation : request.url.endsWith('/avalanche-risk') ? avalanche : forecast });
      await flush();
    });
    click(renderer, 2);
    assert.match(JSON.stringify(renderer.toJSON()), /Mercantour/);
    await act(async () => { renderer.update(React.createElement(Tabs, { ...props, slug: 'b', name: 'B' })); });
    assert.equal(buttons(renderer)[0].props['aria-selected'], true);
    assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /Mercantour|POSTE ISOLA|8 °C/);
    assert.ok(requests.slice(0, 3).every((request) => request.options.signal.aborted));
    await act(async () => { renderer.update(React.createElement(Tabs, { ...props, slug: 'c', name: 'C' })); });
    await act(async () => {
      requests[3].resolve({ ok: true, json: async () => observation });
      requests[4].resolve({ ok: true, json: async () => forecast });
      requests[5].resolve({ ok: true, json: async () => avalanche }); await flush();
    });
    assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /Mercantour|POSTE ISOLA|8 °C/);
    assert.equal(requests.length, 9);
  } finally { if (renderer) act(() => renderer.unmount()); global.fetch = original; }
});

test('failed sources do not block other tab contents', async () => {
  const original = global.fetch;
  let renderer;
  try {
    for (const failed of ['weather', 'forecast', 'avalanche']) {
      global.fetch = async (url) => {
        const kind = url.endsWith('/weather') ? 'weather' : url.endsWith('/avalanche-risk') ? 'avalanche' : 'forecast';
        if (kind === failed) throw new Error('HTTP 503 private API');
        return { ok: true, json: async () => kind === 'weather' ? observation : kind === 'avalanche' ? avalanche : forecast };
      };
      await act(async () => { renderer = create(React.createElement(Tabs, props)); await flush(); });
      for (const [index, kind, pattern] of [[0, 'weather', /8 °C/], [1, 'forecast', /Neige prévue/], [2, 'avalanche', /Mercantour/]]) {
        click(renderer, index);
        assert.equal(pattern.test(contents(visible(renderer)[0])), kind !== failed);
      }
      assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /HTTP 503|private API/);
      act(() => renderer.unmount());
    }
  } finally { global.fetch = original; }
});

test('tabs scroll locally, stay nonsticky and are used only on V3', () => {
  const css = fs.readFileSync('src/components/weather/StationWeatherTabs.module.css', 'utf8');
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /flex-wrap: nowrap/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\[hidden\] \{ display: none/);
  assert.doesNotMatch(css, /sticky|position: fixed/);
  for (const file of ['pages/meteo.tsx', 'pages/stations/[slug]/snowpark.tsx']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /StationWeatherTabs/);
});
