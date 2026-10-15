const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
const { selectWebcams, captureTime, formatCapture } = require('../src/lib/stationWebcams');
const cam = (id, extra = {}) => ({ id, title: 'Méribel : Altiport', lat: 45.4, lon: 6.5, preview: 'https://images.example/cam.jpg', ...extra });
const select = list => selectWebcams(list, 'Méribel', 45.4, 6.5);
function load(file, resolve) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  return module.exports;
}
test('conservative association excludes neighbours, substrings, missing coordinates and unavailable images', () => {
  assert.deepEqual(select([
    cam('1'), cam('2', { title: 'Courchevel : Sommet', location: 'Méribel' }),
    cam('3', { title: 'Méribel Village voisin' }), cam('4', { title: 'Sommet', location: 'Méribel' }),
    cam('5', { lat: null }), cam('6', { lon: '' }), cam('7', { preview: null }),
    cam('8', { lat: 48 }), cam(null), cam('9', { status: 'inactive' }),
  ]).map(c => c.id), ['1']);
});
test('Windy IDs deduplicate, distance precedes reliable capture freshness', () => {
  const list = select([cam(1), cam('1', { lastUpdated: 1700000000 }), cam('2', { lastUpdated: 1700000001 }), cam('3', { lat: 45.41, lastUpdated: 1800000000 })]);
  assert.deepEqual(list.map(c => c.id), ['2', '1', '3']);
  assert.equal(list[1].capturedAt, 1700000000000);
});
test('missing/ambiguous/future dates stay hidden; explicit timestamps use Paris DST', () => {
  for (const value of [null, '', '2024-01-01', '2024-01-01T12:00:00', 'bad', 99999999999]) assert.equal(captureTime(value), null);
  assert.match(formatCapture(captureTime('2024-01-01T12:00:00Z')), /13:00/);
  assert.match(formatCapture(captureTime('2024-07-01T12:00:00Z')), /14:00/);
});
test('endpoint preserves only current capture metadata, never creation or daylight date', () => {
  const { mapWebcam } = load('pages/api/webcams.ts', require);
  const mapped = mapWebcam({ webcamId: 7, created: 123, images: { daylight: { preview: 'old' } }, location: { city: 'Altiport' } });
  assert.equal(mapped.lastUpdated, null);
  assert.equal(mapped.preview, null);
  assert.equal(mapped.location, 'Altiport');
  assert.equal(mapped.title, 'Webcam', 'city cannot become the webcam subject');
});
test('grid renders 0, 1, 2, 3, 4 and 5 webcams, more opens same gallery and broken images backfill', async () => {
  const oldFetch = global.fetch, oldWindow = global.window, oldDocument = global.document;
  global.window = { setInterval: () => 0, clearInterval: () => {} };
  global.document = { activeElement: null, body: { style: {} } };
  try {
    const { WebcamsAuto } = load('src/components/stations/StationLegacyWebcams.tsx', name => {
      if (name === '@/lib/stationAutomaticData') return require('../src/lib/stationAutomaticData');
      if (name === '../../lib/stationWebcams') return require('../src/lib/stationWebcams');
      return require(name);
    });
    for (const count of [0, 1, 2, 3, 4, 5]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ webcams: Array.from({ length: count }, (_, id) => cam(String(id))) }) });
      let tree;
      await renderer.act(async () => { tree = renderer.create(React.createElement(WebcamsAuto, { name: 'Méribel', lat: 45.4, lon: 6.5 })); });
      assert.equal(tree.root.findAllByType('time').length, 0, 'missing capture date is hidden');
      const cards = () => tree.root.findAll(n => n.type === 'button' && n.props.className === 'webcam-card');
      assert.equal(cards().length, Math.min(count, 4));
      const more = tree.root.findAll(n => n.type === 'button' && n.children.includes('Voir plus de webcams'));
      assert.equal(more.length, count > 4 ? 1 : 0);
      if (count === 5) {
        await renderer.act(async () => more[0].props.onClick());
        assert.equal(tree.root.findAll(n => n.props.role === 'dialog').length, 1);
        assert.equal(cards().length, 9);
        await renderer.act(async () => tree.root.findByProps({ role: 'dialog' }).props.onKeyDown({ key: 'Escape' }));
        await renderer.act(async () => tree.root.findAllByType('img')[0].props.onError());
        assert.equal(cards().length, 4);
      }
      await renderer.act(async () => tree.unmount());
    }
  } finally { global.fetch = oldFetch; global.window = oldWindow; global.document = oldDocument; }
});
test('loading and failed requests have explicit states and retry; image failure never substitutes neighbours', async () => {
  const oldFetch = global.fetch, oldWindow = global.window;
  global.window = { setInterval: () => 0, clearInterval: () => {} };
  let reject;
  global.fetch = () => new Promise((_, fail) => { reject = fail; });
  try {
    const { WebcamsAuto } = load('src/components/stations/StationLegacyWebcams.tsx', name => {
      if (name === '@/lib/stationAutomaticData') return require('../src/lib/stationAutomaticData');
      if (name === '../../lib/stationWebcams') return require('../src/lib/stationWebcams');
      return require(name);
    });
    let tree;
    await renderer.act(async () => { tree = renderer.create(React.createElement(WebcamsAuto, { name: 'Méribel', lat: 45.4, lon: 6.5 })); });
    assert.equal(tree.root.findByType('section').props['aria-busy'], true);
    await renderer.act(async () => reject(new Error('offline')));
    assert.equal(tree.root.findByType('section').props['aria-busy'], false);
    assert.equal(tree.root.findAllByType('img').length, 0);
    const retry = tree.root.findByType('button');
    assert.deepEqual(retry.children, ['Réessayer']);
    global.fetch = async () => ({ ok: true, json: async () => ({ webcams: [cam('1'), cam('2', { title: 'Courchevel : Sommet' })] }) });
    await renderer.act(async () => retry.props.onClick());
    assert.equal(tree.root.findAllByType('img').length, 1);
    await renderer.act(async () => tree.root.findByType('img').props.onError());
    assert.equal(tree.root.findAllByType('img').length, 0);
    assert.match(JSON.stringify(tree.toJSON()), /Images des webcams indisponibles/);
    await renderer.act(async () => tree.unmount());
  } finally { global.fetch = oldFetch; global.window = oldWindow; }
});
