const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
function load(path, resolve = require) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  return module.exports;
}
const lodging = load('src/lib/stationLodging.ts');
test('both affiliate links retain their own campaign and correctly encode the station destination', () => {
  for (const station of [
    { name: 'Méribel', department: { name: 'Savoie' } },
    { name: 'Les Contamines-Montjoie', department: 'Haute-Savoie' },
    { name: 'Saint-Martin & Les Alpes', region: { name: 'Auvergne-Rhône-Alpes' } },
    { name: 'L’Alpe d’Huez', region_name: 'Isère' },
    { name: '  Auron  ' },
  ]) {
    const expected = [station.name.trim(), typeof station.department === 'string' ? station.department : station.department?.name || station.region?.name || station.region_name, 'France'].filter(Boolean).join(' ');
    const booking = new URL(lodging.stationLodgingUrl(station));
    assert.equal(booking.origin + booking.pathname, 'https://www.kqzyfj.com/click-101532582-11795698');
    const bookingDestination = new URL(booking.searchParams.get('url'));
    assert.equal(bookingDestination.hostname, 'www.booking.com');
    assert.equal(bookingDestination.searchParams.get('ss'), expected);
    const abritel = lodging.stationAbritelUrl(station);
    const prefix = 'https://vrbo.prf.hn/click/camref:1011l5gxsq/destination:';
    assert.ok(abritel.startsWith(prefix));
    const destination = new URL(decodeURIComponent(abritel.slice(prefix.length)));
    assert.equal(destination.origin + destination.pathname, 'https://www.abritel.fr/search');
    assert.equal(destination.searchParams.get('destination'), expected);
    assert.equal(destination.searchParams.get('siteid'), '9003013');
    assert.equal(destination.searchParams.get('langid'), '1036');
    assert.equal(destination.searchParams.has('startDate'), false);
    assert.equal(destination.searchParams.has('endDate'), false);
  }
});
test('missing station names never produce generic affiliate destinations', () => {
  for (const name of [undefined, null, '', '  ']) {
    assert.equal(lodging.stationLodgingUrl({ name }), null);
    assert.equal(lodging.stationAbritelUrl({ name }), null);
  }
});
test('native disclosure offers two labelled sponsored links without loading external widgets', () => {
  const { default: Options } = load('src/components/stations/StationLodgingOptions.tsx', name => name === '@/lib/stationLodging' ? lodging : require(name));
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('No external request before clicking'); };
  let tree;
  try {
    renderer.act(() => { tree = renderer.create(React.createElement(Options, { station: { name: 'Méribel' } })); });
    const details = tree.root.findByType('details');
    assert.equal(details.props.open, undefined, 'collapsed by default; browser manages keyboard interaction');
    assert.match(tree.root.findByType('summary').children.filter(x => typeof x === 'string').join(''), /Voir les logements disponibles/);
    const links = tree.root.findAllByType('a');
    assert.equal(links.length, 2);
    assert.equal(links[0].props.href, lodging.stationLodgingUrl({ name: 'Méribel' }));
    assert.equal(links[1].props.href, lodging.stationAbritelUrl({ name: 'Méribel' }));
    for (const link of links) {
      assert.equal(link.props.rel, 'sponsored noopener noreferrer');
      assert.equal(link.props.target, '_blank');
    }
    assert.equal(tree.root.findAllByType('span').filter(n => n.children.includes('Lien partenaire')).length, 2);
    assert.equal(tree.root.findAllByType('iframe').length, 0);
    assert.equal(tree.root.findAllByType('script').length, 0);
    renderer.act(() => { tree.update(React.createElement(Options, { station: {} })); });
    assert.equal(tree.toJSON(), null);
  } finally {
    if (tree) renderer.act(() => tree.unmount());
    global.fetch = originalFetch;
  }
});
