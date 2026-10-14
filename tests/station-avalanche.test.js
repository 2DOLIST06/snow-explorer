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
const widget = load('src/components/avalanche/StationAvalancheRisk.tsx');
const api = load('src/lib/api/avalanche.ts');
const weather = load('src/components/weather/StationWeather.tsx');
const payload = (overrides = {}) => ({
  station: { slug: 'isola-2000', name: 'Isola 2000' },
  status: 'unavailable', mapping_status: 'confirmed',
  massif: { id: 23, name: 'Mercantour', mapping_method: 'automatic' },
  risk: { level: null, label: null, valid_from: null, valid_until: null, issued_at: null, summary: null },
  source: { provider: 'Météo-France', label: 'Bulletin Risque Avalanche Météo-France', scope: 'massif' },
  assets: { bulletin_pdf_available: true, risk_image_available: true, current: false },
  unavailable_reason: 'season_ended', display: {},
  ...overrides,
});
const active = (overrides = {}) => payload({
  status: 'available', unavailable_reason: null,
  risk: { level: 3, label: 'Libellé du backend', valid_from: '2026-10-13T08:00:00Z', valid_until: '2026-10-14T08:00:00Z', issued_at: '2026-10-13T07:00:00Z', summary: 'Résumé du bulletin.' },
  assets: { bulletin_pdf_available: true, risk_image_available: true, current: true }, ...overrides,
});
const html = (data) => renderToStaticMarkup(React.createElement(widget.AvalancheRiskPanel, {
  slug: 'isola-2000', resource: { data: api.normalizeAvalancheRisk(data), loading: false, error: false },
}));
const flush = () => new Promise(setImmediate);

test('off-season shows massif, visible disclaimer and source without invented risk, image or PDF', () => {
  const rendered = html(payload());
  for (const text of ['Risque d’avalanche — massif : Mercantour', 'actuellement indisponible pour ce massif', 'Source : Météo-France', 'Il ne constitue pas une évaluation du risque propre à la station', 'Les conditions peuvent varier localement']) assert.ok(rendered.includes(text), text);
  assert.doesNotMatch(rendered, /[0-5]\s*\/\s*5|Faible|<img|<a|en cours de validité|tooltip|<details|hidden/);
  assert.doesNotMatch(rendered, /Risque d’avalanche à|Risque de la station|Votre risque d’avalanche|Risque sur les pistes|Risque sur le domaine/);
});
test('unmapped and ambiguous responses never appear, even with a massif and active risk', () => {
  for (const mapping_status of ['unmapped', 'ambiguous']) assert.equal(html(active({ mapping_status })), '');
  for (const unavailable_reason of ['no_massif', 'ambiguous_massif']) assert.equal(html(active({ unavailable_reason })), '');
  assert.equal(html(active({ massif: null })), '');
});
test('active risk uses the supplied label and French validity, summary and current PDF', () => {
  const rendered = html(active());
  for (const text of ['3 / 5', 'Libellé du backend', 'en cours de validité', '13 octobre 2026', '14 octobre 2026', 'Publié le', 'Résumé du bulletin.', 'Consulter le bulletin complet Météo-France']) assert.ok(rendered.includes(text), text);
  assert.doesNotMatch(rendered, /Marqué|<img/);
  assert.match(rendered, /href="\/api\/stations\/isola-2000\/avalanche-risk\/pdf"/);
  assert.match(rendered, /target="_blank" rel="noopener noreferrer"/);
});
test('invalid level, missing label and unknown status fail closed without validity, PDF or summary', () => {
  for (const level of [null, 0, 6, -1, 2.5, '3', NaN]) {
    const rendered = html(active({ risk: { ...active().risk, level } }));
    assert.match(rendered, /actuellement indisponible/);
    assert.doesNotMatch(rendered, /\/ 5|en cours de validité|<a|Résumé du bulletin/);
  }
  for (const label of [null, '', ' ', 3]) assert.doesNotMatch(html(active({ risk: { ...active().risk, label } })), /\/ 5|<a|en cours de validité/);
  for (const status of ['future', null, true]) assert.doesNotMatch(html(active({ status })), /\/ 5|<a|en cours de validité/);
});
test('PDF requires available risk, strict PDF flag and current flag', () => {
  for (const status of ['available', 'unavailable']) for (const pdf of [true, false, 'true']) for (const current of [true, false, 'true']) {
    const rendered = html(active({ status, assets: { bulletin_pdf_available: pdf, current } }));
    assert.equal(rendered.includes('<a'), status === 'available' && pdf === true && current === true);
  }
});
test('backend disclaimer is used only when nonempty; invalid dates are omitted', () => {
  assert.match(html(payload({ display: { disclaimer: 'Avertissement du massif fourni.' } })), /Avertissement du massif fourni/);
  for (const disclaimer of ['', ' ', null]) assert.match(html(payload({ display: { disclaimer } })), /Les conditions peuvent varier localement/);
  assert.doesNotMatch(html(active({ risk: { ...active().risk, valid_from: 'invalid', issued_at: null, valid_until: null } })), /Invalid Date|<time/);
});
test('service calls same-origin with AbortSignal and rejects mismatched stations and network failures', async () => {
  const original = global.fetch;
  const controller = new AbortController();
  let request;
  try {
    global.fetch = async (url, options) => { request = { url, options }; return { ok: true, json: async () => payload() }; };
    await api.fetchStationAvalancheRisk('isola-2000', controller.signal);
    assert.equal(request.url, '/api/stations/isola-2000/avalanche-risk');
    assert.equal(request.options.signal, controller.signal);
    assert.equal(request.options.cache, 'no-store');
    await assert.rejects(api.fetchStationAvalancheRisk('other'), /Bulletin indisponible/);
    global.fetch = async () => ({ ok: false });
    await assert.rejects(api.fetchStationAvalancheRisk('isola-2000'), /Bulletin indisponible/);
    global.fetch = async () => { throw new Error('network'); };
    await assert.rejects(api.fetchStationAvalancheRisk('isola-2000'));
  } finally { global.fetch = original; }
});
test('rapid station changes reset immediately, abort and ignore late responses; errors stay silent', async () => {
  const original = global.fetch;
  const pending = [];
  global.fetch = (url, options) => new Promise((resolve, reject) => pending.push({ url, options, resolve, reject }));
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(widget.default, { slug: 'isola-2000' })); });
    assert.equal(renderer.toJSON(), null);
    await act(async () => { pending[0].resolve({ ok: true, json: async () => payload() }); await flush(); });
    assert.match(JSON.stringify(renderer.toJSON()), /Mercantour/);
    await act(async () => { renderer.update(React.createElement(widget.default, { slug: 'b' })); });
    assert.equal(renderer.toJSON(), null);
    assert.equal(pending[0].options.signal.aborted, true);
    await act(async () => { renderer.update(React.createElement(widget.default, { slug: 'c' })); });
    assert.equal(pending[1].options.signal.aborted, true);
    await act(async () => { pending[1].resolve({ ok: true, json: async () => payload({ station: { slug: 'b' } }) }); await flush(); });
    assert.equal(renderer.toJSON(), null);
    await act(async () => { pending[2].reject(new Error('HTTP 401 private API')); await flush(); });
    assert.equal(renderer.toJSON(), null);
  } finally { if (renderer) act(() => renderer.unmount()); global.fetch = original; }
});
test('avalanche and both weather resources remain independent in either failure direction', async () => {
  const original = global.fetch;
  let renderer;
  try {
    for (const failed of ['avalanche', 'weather', 'forecast']) {
      global.fetch = async (url) => {
        if (url.endsWith('/avalanche-risk')) { if (failed === 'avalanche') throw new Error('DPBRA'); return { ok: true, json: async () => active() }; }
        if (url.endsWith('/weather')) { if (failed === 'weather') throw new Error('DPObs'); return { ok: true, json: async () => ({ status: 'available', observation: { temperature_c: 8, snow_depth_cm: 0 }, source: {} }) }; }
        if (failed === 'forecast') throw new Error('Open-Meteo');
        return { ok: true, json: async () => ({ daily_units: { snowfall_sum: 'cm' }, daily: { time: ['2026-10-13'], snowfall_sum: [2] } }) };
      };
      await act(async () => { renderer = create(React.createElement(React.Fragment, null,
        React.createElement(weather.default, { slug: 'isola-2000', latitude: 44, longitude: 7 }),
        React.createElement(widget.default, { slug: 'isola-2000' }))); await flush(); });
      const rendered = JSON.stringify(renderer.toJSON());
      assert.equal(rendered.includes('Libellé du backend'), failed !== 'avalanche');
      assert.equal(rendered.includes('8 °C'), failed !== 'weather');
      assert.equal(rendered.includes('Neige prévue'), failed !== 'forecast');
      act(() => renderer.unmount());
    }
  } finally { global.fetch = original; }
});

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, json(v) { this.body = v; return this; }, send(v) { this.body = v; return this; }, end() {} };
}
test('JSON proxy uses configured backend, no-store, GET only and safe errors', async () => {
  const handler = load('pages/api/stations/[slug]/avalanche-risk.ts', true).default;
  const original = global.fetch;
  const result = response();
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://backend.example/api/stations/isola-2000/avalanche-risk');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, json: async () => payload() };
    };
    await handler({ method: 'GET', query: { slug: 'isola-2000' } }, result);
    assert.equal(result.code, 200);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    for (const fetcher of [async () => { throw new Error('private 403'); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => { throw new Error('schema'); } })]) {
      global.fetch = fetcher;
      await handler({ method: 'GET', query: { slug: 'isola-2000' } }, result);
      assert.equal(result.code, 503); assert.deepEqual(result.body, { status: 'unavailable' });
    }
    await handler({ method: 'POST', query: {} }, result);
    assert.equal(result.code, 405); assert.equal(result.headers.Allow, 'GET');
    await handler({ method: 'GET', query: { slug: ['x'] } }, result);
    assert.equal(result.code, 400);
  } finally { global.fetch = original; }
});
test('PDF proxy rechecks current bulletin and does not serve stale assets or upstream errors', async () => {
  const handler = load('pages/api/stations/[slug]/avalanche-risk/pdf.ts', true).default;
  const original = global.fetch;
  try {
    for (const bulletin of [payload(), active({ assets: { bulletin_pdf_available: true, current: false } }), active({ mapping_status: 'ambiguous' })]) {
      const requests = [];
      global.fetch = async (url) => { requests.push(url); return { ok: true, json: async () => bulletin }; };
      const result = response();
      await handler({ method: 'GET', query: { slug: 'isola-2000' } }, result);
      assert.equal(result.code, 404); assert.equal(requests.length, 1);
    }
    for (const contentType of ['application/pdf', 'text/html']) {
      global.fetch = async (url) => url.endsWith('/pdf') ? {
        ok: true, headers: new Headers({ 'content-type': contentType }), arrayBuffer: async () => Buffer.from('%PDF-1.4'),
      } : { ok: true, json: async () => active() };
      const result = response();
      await handler({ method: 'GET', query: { slug: 'isola-2000' } }, result);
      assert.equal(result.code, contentType === 'application/pdf' ? 200 : 503);
      assert.equal(result.headers['Cache-Control'], 'no-store');
      if (result.code === 200) assert.equal(result.body.toString(), '%PDF-1.4');
    }
    global.fetch = async () => { throw new Error('private upstream'); };
    const result = response();
    await handler({ method: 'GET', query: { slug: 'isola-2000' } }, result);
    assert.deepEqual(result.body, { status: 'unavailable' });
  } finally { global.fetch = original; }
});
test('integration is V3 only, separate from weather, with no direct provider calls or credentials', () => {
  const page = fs.readFileSync('src/components/stations/StationV3Page.tsx', 'utf8');
  assert.match(page, /<StationWeatherTabs/);
  assert.match(fs.readFileSync('src/components/weather/StationWeatherTabs.tsx', 'utf8'), /<StationAvalancheRisk/);
  for (const file of ['pages/meteo.tsx', 'pages/stations/[slug]/snowpark.tsx', 'src/components/weather/StationWeather.tsx']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /StationAvalancheRisk|DPBRA/);
  for (const file of ['src/lib/api/avalanche.ts', 'src/components/avalanche/StationAvalancheRisk.tsx', 'pages/api/stations/[slug]/avalanche-risk.ts', 'pages/api/stations/[slug]/avalanche-risk/pdf.ts']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /public-api\.meteofrance\.fr|apikey|METEOFRANCE.*KEY|\bany\b/);
  const forecast = fs.readFileSync('src/lib/api/weather.ts', 'utf8');
  assert.match(forecast, /api\.open-meteo\.com/);
  assert.match(forecast, /forecast_days: '7'/);
  assert.doesNotMatch(forecast, /current_weather|snow_depth/);
  assert.match(fs.readFileSync('src/components/weather/StationWeather.tsx', 'utf8'), /Hauteur de neige au poste/);
});
