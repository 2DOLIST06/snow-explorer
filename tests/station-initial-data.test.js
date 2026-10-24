const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loader(forecast) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/lib/api/stationInitialData.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (name === './stationPage') return { getStationApiBase: () => 'https://backend.example' };
    if (name === './weather') return { fetchWeatherForecast: forecast };
    if (name === '../stationAutomaticData') return require('../src/lib/stationAutomaticData');
    if (name === '../stationWebcams') return require('../src/lib/stationWebcams');
    throw new Error(name);
  }, module, module.exports);
  return module.exports.loadStationInitialData;
}

test('SSR isolates failed sources, uses real observation timestamps, caches only forecasts and webcam metadata', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.WEBCAMS_API_KEY;
  process.env.WEBCAMS_API_KEY = 'test-only';
  let forecasts = 0, weather = 0, cams = 0;
  const pending = [];
  const load = loader(async () => { forecasts++; return [{ date: '2026-10-24' }]; });
  global.fetch = async (url, options) => {
    assert.ok(options.signal);
    if (url.includes('windy.com')) {
      cams++;
      return { ok: true, json: async () => ({ webcams: [{ webcamId: 1, title: 'Station : Sommet', urls: { detail: 'https://www.windy.com/webcams/1' }, images: { current: { preview: 'https://images.example/1.jpg' } }, location: { latitude: 45, longitude: 6, city: 'Station' } }] }) };
    }
    weather++;
    return new Promise(resolve => pending.push(() => resolve({ ok: true, json: async () => ({ station: { slug: 'station' }, status: 'stale', observation: { temperature_c: 0, snow_depth_cm: 0, validity_time: '2026-10-23T12:00:00Z' }, source: null }) })));
  };
  try {
    const station = { slug: 'station', name: 'Station', latitude: 45, longitude: 6 };
    const first = load(station);
    await new Promise(setImmediate);
    assert.equal(cams, 1, 'webcams start before weather resolves');
    assert.equal(forecasts, 1);
    pending.shift()();
    const result = await first;
    assert.equal(result.observations.status, 'stale');
    assert.equal(result.observations.observation.snow_depth_cm, 0);
    assert.equal(result.webcams[0].link, 'https://www.windy.com/webcams/1');
    assert.doesNotMatch(JSON.stringify(result), /test-only/);
    const second = load(station);
    await new Promise(setImmediate);
    pending.shift()();
    await second;
    assert.equal(weather, 2, 'backend recalculates age for each SSR request');
    assert.equal(forecasts, 1);
    assert.equal(cams, 1);
    global.fetch = async () => { throw new Error('private provider error'); };
    const failed = await loader(async () => { throw new Error('forecast error'); })(station);
    assert.equal(failed.observations.status, 'unavailable');
    assert.deepEqual(failed.forecasts, []);
    assert.equal(failed.webcams, null);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.WEBCAMS_API_KEY;
    else process.env.WEBCAMS_API_KEY = originalKey;
  }
});
