const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { create, act } = require('react-test-renderer');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const resolve = (name) => {
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name.startsWith('@/') || name.startsWith('./')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name);
      const target = ['.ts', '.tsx', '.js'].map((ext) => base + ext).find(fs.existsSync);
      return load(target);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const widget = load('src/components/weather/StationWeather.tsx');
const api = load('src/lib/api/weather.ts');
const payload = (status = 'available', overrides = {}) => ({
  station: { name: 'Val Thorens', slug: 'val-thorens' }, status,
  observation: { temperature_c: 9.4, humidity_percent: 60, wind_direction_deg: 180, wind_speed: 555, wind_speed_unit: null, precipitation: 444, precipitation_unit: null, snow_depth_cm: 0, validity_time: '2026-10-13T12:36:00Z', reference_time: '2026-10-13T15:39:04Z', insert_time: '2026-10-13T16:36:46Z', ...overrides },
  source: { station_name: 'VAL THORENS_SAPC', station_altitude_m: 2277, distance_km: .472 },
});
const resource = (data) => ({ data, loading: false, error: false });
const observed = (data) => renderToStaticMarkup(React.createElement(widget.ObservedConditions, { resource: resource(data) }));
const forecastPayload = {
  daily_units: { temperature_2m_min: '°C', temperature_2m_max: '°C', snowfall_sum: 'cm', precipitation_sum: 'mm' },
  daily: { time: Array.from({ length: 7 }, (_, i) => `2026-10-${13 + i}`), temperature_2m_min: [0, null], temperature_2m_max: [10], snowfall_sum: [0, 2], precipitation_sum: [1], weather_code: [0, 71] },
};

test('available observation shows station context and true zero snow, without unitless values', () => {
  const html = observed(payload());
  for (const text of ['Conditions observées', 'Hauteur de neige au poste', '0 cm', '9,4 °C', '60 %', '180 °', 'VAL THORENS_SAPC', '2 277 m', '0,5 km', 'Source : Météo-France']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /555|444|Vitesse du vent|Précipitations observées|km\/h/);
  assert.doesNotMatch(html, /Relevé ancien|Bas station|Milieu domaine|Sommet/);
});
test('null snow and temperature stay unavailable; null humidity and direction are omitted', () => {
  const html = observed(payload('available', { snow_depth_cm: null, temperature_c: null, humidity_percent: null, wind_direction_deg: null }));
  assert.doesNotMatch(html, /0 cm|0 °C|Humidité|Direction du vent/);
  assert.equal((html.match(/Non disponible/g) || []).length, 2);
});
test('known wind and precipitation units are displayed without conversion', () => {
  const html = observed(payload('available', { wind_speed: 2, wind_speed_unit: 'm/s', precipitation: 3, precipitation_unit: 'mm', precipitation_period_minutes: 6 }));
  assert.match(html, /2 m\/s/); assert.match(html, /3 mm/); assert.match(html, /sur 6 min/);
});
test('stale uses validity_time with a visible old-reading notice and French date', () => {
  const html = observed(payload('stale'));
  assert.match(html, /Relevé ancien/); assert.match(html, /13 octobre 2026/); assert.match(html, /14:36/);
  assert.match(html, /dateTime="2026-10-13T12:36:00Z"/);
  assert.doesNotMatch(html, /15:39|16:36|17:39|18:36/);
});
test('unavailable never leaks observations, and errors expose only the public notice', () => {
  const html = observed(payload('unavailable'));
  assert.match(html, /Les observations Météo-France sont temporairement indisponibles/);
  assert.doesNotMatch(html, /9,4|0 cm|VAL THORENS_SAPC/);
  const error = renderToStaticMarkup(React.createElement(widget.ObservedConditions, { resource: { loading: false, data: null, error: true } }));
  assert.match(error, /Observations temporairement indisponibles/); assert.doesNotMatch(error, /HTTP/);
});
test('normalization preserves nulls and only uses explicit forecast units, up to seven days', () => {
  const days = api.normalizeForecast(forecastPayload);
  assert.equal(days.length, 7); assert.equal(days[0].temperatureMinC, 0); assert.equal(days[0].snowfallCm, 0);
  assert.equal(days[1].temperatureMinC, null); assert.equal(days[6].weatherCode, null);
  const unknown = api.normalizeForecast({ ...forecastPayload, daily_units: {} });
  assert.equal(unknown[0].snowfallCm, null); assert.equal(unknown[0].precipitation, null); assert.equal(unknown[0].precipitationUnit, null);
  const html = renderToStaticMarkup(React.createElement(widget.ForecastConditions, { resource: resource(days) }));
  assert.match(html, /Neige prévue/); assert.match(html, /Source : Open-Meteo/); assert.doesNotMatch(html, /Hauteur de neige|Maintenant/);
});

const flush = () => new Promise(setImmediate);
test('sources load independently; station changes reset immediately and ignore late responses', async () => {
  const original = global.fetch;
  const pending = [];
  global.fetch = (url, options) => new Promise((resolve, reject) => pending.push({ url, options, resolve, reject }));
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(widget.default, { slug: 'a', name: 'A', latitude: 45, longitude: 6 })); });
    assert.equal(pending.length, 2);
    assert.match(pending[0].url, /\/api\/stations\/a\/weather/);
    const url = new URL(pending[1].url);
    assert.equal(url.searchParams.get('forecast_days'), '7');
    assert.equal(url.searchParams.has('current_weather'), false);
    assert.doesNotMatch(url.searchParams.get('daily'), /snow_depth/);
    await act(async () => { pending[1].resolve({ ok: true, json: async () => forecastPayload }); await flush(); });
    assert.match(JSON.stringify(renderer.toJSON()), /Neige prévue/);
    assert.match(JSON.stringify(renderer.toJSON()), /Chargement des observations/);
    await act(async () => { pending[0].resolve({ ok: true, json: async () => payload() }); await flush(); });
    assert.match(JSON.stringify(renderer.toJSON()), /9,4 °C/);
    await act(async () => { renderer.update(React.createElement(widget.default, { slug: 'b', name: 'B', latitude: 46, longitude: 7 })); });
    assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /9,4 °C|Neige prévue/);
    assert.equal(pending[0].options.signal.aborted, true);
    await act(async () => { renderer.update(React.createElement(widget.default, { slug: 'c', name: 'C', latitude: 47, longitude: 8 })); });
    assert.equal(pending[2].options.signal.aborted, true);
    await act(async () => { pending[2].resolve({ ok: true, json: async () => payload('available', { temperature_c: 99 }) }); pending[3].resolve({ ok: true, json: async () => forecastPayload }); await flush(); });
    assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /99 °C|Neige prévue/);
    await act(async () => { pending[4].reject(new Error('HTTP 503')); pending[5].resolve({ ok: true, json: async () => forecastPayload }); await flush(); });
    assert.match(JSON.stringify(renderer.toJSON()), /Observations temporairement indisponibles/);
    assert.match(JSON.stringify(renderer.toJSON()), /Neige prévue/);
    assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /HTTP 503/);
  } finally { if (renderer) act(() => renderer.unmount()); global.fetch = original; }
});
test('observations remain available when forecast fails or coordinates are absent', async () => {
  const original = global.fetch;
  const urls = [];
  global.fetch = async (url) => { urls.push(url); if (url.startsWith('https:')) throw new Error('forecast failed'); return { ok: true, json: async () => payload() }; };
  let renderer;
  try {
    for (const latitude of [45, null]) {
      await act(async () => { renderer = create(React.createElement(widget.default, { slug: 'station', name: 'Station', latitude, longitude: 6 })); await flush(); });
      const html = JSON.stringify(renderer.toJSON());
      assert.match(html, /9,4 °C/); assert.match(html, /Prévisions temporairement indisponibles/);
      act(() => renderer.unmount());
    }
    assert.equal(urls.filter((url) => url.startsWith('https:')).length, 1);
  } finally { global.fetch = original; }
});
test('all three pages share the widget and retired implementations and altitude temperatures are removed', () => {
  for (const file of ['pages/meteo.tsx', 'src/components/stations/StationV3Page.tsx', 'pages/stations/[slug]/snowpark.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /<StationWeather[^>]+slug=/);
    assert.doesNotMatch(source, /api\.open-meteo|MeteoWidget|SkiWeatherWidget|StationLegacyWeather/);
  }
  for (const file of ['src/components/SkiWeatherWidget.tsx', 'src/components/stations/StationLegacyWeather.tsx', 'pages/api/ski-weather.ts']) assert.equal(fs.existsSync(file), false);
  const source = fs.readFileSync('src/components/weather/StationWeather.tsx', 'utf8');
  assert.doesNotMatch(source, /temperature\s*-\s*[36]|Bas station|Milieu domaine|Sommet/);
  const css = fs.readFileSync('src/components/weather/StationWeather.module.css', 'utf8');
  assert.match(css, /@media \(max-width: 640px\)/); assert.match(css, /overflow-x: auto/); assert.match(css, /scroll-snap-type: x mandatory/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /focus-visible/);
  assert.match(source, /aria-live="polite"/); assert.match(source, /aria-busy=/);
});
test('observation proxy uses configured backend and sanitizes upstream failures', async () => {
  const file = 'pages/api/stations/[slug]/weather.ts';
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => name === '@/lib/api/resorts' ? { getServerApiBase: () => 'https://backend.example' } : require(name), module, module.exports);
  const original = global.fetch;
  let fetched;
  global.fetch = async (url) => { fetched = url; return { ok: true, json: async () => payload() }; };
  const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, json(v) { this.body = v; return this; }, end() {} };
  try {
    await module.exports.default({ method: 'GET', query: { slug: 'val-thorens' } }, result);
    assert.equal(fetched, 'https://backend.example/api/stations/val-thorens/weather');
    assert.equal(result.body.status, 'available'); assert.equal(result.headers['Cache-Control'], 'no-store');
    global.fetch = async () => { throw new Error('private upstream HTTP failure'); };
    await module.exports.default({ method: 'GET', query: { slug: 'val-thorens' } }, result);
    assert.equal(result.code, 503); assert.deepEqual(result.body, { status: 'unavailable' });
    await module.exports.default({ method: 'POST', query: { slug: 'val-thorens' } }, result);
    assert.equal(result.code, 405); assert.equal(result.headers.Allow, 'GET');
  } finally { global.fetch = original; }
});
