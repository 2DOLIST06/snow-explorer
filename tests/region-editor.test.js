const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const React = require('react');
const { act } = React;
const { TextSelection } = require('@tiptap/pm/state');

function load(file, stubs = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const loadedModule = new Module(filename, module);
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
  loadedModule.require = (name) => name in stubs ? stubs[name] : name.startsWith('@/') ? require(path.resolve(__dirname, '../src', name.slice(2))) : require(name);
  loadedModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return loadedModule.exports;
}
function domSetup() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://www.snow-explorer.com' });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'getComputedStyle']) global[key] = key === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key];
  dom.window.scrollBy = () => {};
  global.requestAnimationFrame = callback => setTimeout(callback, 0);
  global.cancelAnimationFrame = clearTimeout;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  for (const proto of [dom.window.HTMLElement.prototype, dom.window.Range.prototype]) {
    proto.getClientRects = () => [];
    proto.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20 });
  }
  return dom;
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); }
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(item => item.textContent === label);
  assert.ok(button, label); assert.equal(button.disabled, false, `${label} enabled`);
  await act(async () => { button.click(); }); await flush();
}

test('actual WYSIWYG toolbar formats text, handles links, history and source mode', async () => {
  const dom = domSetup();
  let realEditor;
  const tiptap = require('@tiptap/react');
  const Editor = load('src/components/admin/RegionHtmlEditor.tsx', { '@tiptap/react': { ...tiptap, useEditor: (...args) => { realEditor = tiptap.useEditor(...args); return realEditor; } } }).default;
  let html = '<p>Alpes</p>';
  let disabled = false;
  function Harness() { const [value, setValue] = React.useState(html); return React.createElement(Editor, { value, disabled, onChange: next => { html = next; setValue(next); } }); }
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Harness))); await flush();
  const view = () => realEditor.view;
  const select = async () => { await act(async () => { const current = view(); current.dispatch(current.state.tr.setSelection(TextSelection.create(current.state.doc, 1, current.state.doc.content.size - 1))); }); };
  await select(); await click('Gras'); assert.match(html, /<strong>Alpes<\/strong>/);
  await click('Italique'); assert.match(html, /<em>/);
  await click('H2'); assert.match(html, /<h2>/);
  await click('H3'); assert.match(html, /<h3>/);
  await click('Paragraphe'); assert.match(html, /<p>/);
  await click('Puces'); assert.match(html, /<ul>/); await click('Puces');
  await click('Liste numérotée'); assert.match(html, /<ol>/); await click('Liste numérotée');
  await click('Citation'); assert.match(html, /<blockquote>/); await click('Citation');
  await click('Lien');
  // React was imported before DOM setup; use the input's React event handler directly.
  const change = async (element, value) => { const key = Object.keys(element).find(key => key.startsWith('__reactProps')); await act(async () => element[key].onChange({ target: { value } })); };
  await change(document.getElementById('region-link'), '/stations/test'); await click('Appliquer le lien');
  assert.match(html, /href="https:\/\/www.snow-explorer.com\/stations\/test"/);
  await click('Lien'); await change(document.getElementById('region-link'), 'https://example.com'); await click('Appliquer le lien'); assert.match(html, /https:\/\/example.com\//);
  await click('Supprimer le lien'); assert.doesNotMatch(html, /<a /);
  await click('Annuler'); assert.match(html, /<a /); await click('Rétablir'); assert.doesNotMatch(html, /<a /);
  await click('Effacer le formatage'); assert.equal(html, '<p>Alpes</p>');
  await click('Saut de ligne'); assert.match(html, /<br/);
  await click('HTML source'); await change(document.querySelector('textarea'), '<h2>Source</h2><script>alert(1)</script><p><a href="/regions/test">Lien</a></p>');
  const sourceBeforeSaving = html;
  disabled = true; await act(async () => root.render(React.createElement(Harness))); await flush();
  assert.equal(html, sourceBeforeSaving, 'disabling during save must not emit stale visual HTML');
  disabled = false; await act(async () => root.render(React.createElement(Harness))); await flush();
  assert.equal(html, sourceBeforeSaving, 're-enabling must not overwrite HTML source');
  await click('Éditeur visuel'); assert.match(html, /<h2>Source<\/h2>/); assert.doesNotMatch(html, /script/); assert.match(html, /https:\/\/www.snow-explorer.com\/regions\/test/);
  await act(async () => { realEditor.commands.setContent('<p>Avant Après</p>'); realEditor.commands.setTextSelection(7); });
  await click('Insérer les stations');
  assert.match(html, /REGION_STATIONS/);
  assert.match(document.querySelector('.region-stations-placeholder').textContent, /Liste automatique des stations/);
  assert.equal(realEditor.state.doc.content.content.filter(node => node.type.name === 'regionStations').length, 1);
  await click('HTML source'); await click('Éditeur visuel');
  assert.equal(document.querySelectorAll('.region-stations-placeholder').length, 1);
  await click('Supprimer'); assert.doesNotMatch(html, /REGION_STATIONS/);
  await click('Insérer les stations');
  const marker = realEditor.state.doc.content.content.find(node => node.type.name === 'regionStations');
  assert.equal(marker.type.spec.draggable, true);
  await act(async () => {
    let position;
    realEditor.state.doc.forEach((node, offset) => { if (node.type.name === 'regionStations') position = offset; });
    realEditor.commands.deleteRange({ from: position, to: position + 1 });
    realEditor.commands.insertContentAt(realEditor.state.doc.content.size, { type: 'regionStations' });
  });
  assert.equal((html.match(/REGION_STATIONS/g) || []).length, 1);
  assert.ok(html.indexOf('Après') < html.indexOf('REGION_STATIONS'));
  await click('HTML source'); await change(document.querySelector('textarea'), ''); await click('Éditeur visuel'); assert.equal(html, '');
  await act(async () => root.unmount()); dom.window.close();
});

test('public region SSR retains SEO and renders safe HTML before stations, including empty descriptions', async () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const regions = load('src/lib/regions.ts');
  const page = load('pages/regions/[slug].tsx', {
    '@/lib/regions': regions,
    '@/lib/api/regions': { fetchRegionDetailServer: async () => ({ description_html: '<h2>Massifs</h2><p><a href="https://www.snow-explorer.com/stations/test">Station</a></p><script>alert(1)</script>' }) },
    '@/lib/api/resorts': { getServerApiBases: () => ['https://backend.test'], getServerResortsApiUrls: () => ['https://backend.test/api/resorts/'], parseResortsPayload: payload => payload },
    'next/head': { __esModule: true, default: ({ children }) => React.createElement(React.Fragment, null, children) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const region = { id: 'alpes', slug: 'alpes', name: 'Alpes', meta_title: 'Titre personnalisé', meta_description: 'Description personnalisée', description_html: '<h2>Massifs</h2><p><a href="/stations/test">Station</a></p><script>alert(1)</script>', seo_text: 'Obsolète' };
  const resorts = [{ id: 'test', name: 'Station test', slug: 'test', is_active: true, region }];
  const originalFetch = global.fetch;
  try {
    global.fetch = async url => ({ ok: true, json: async () => String(url).includes('/resorts') ? resorts : [region] });
    const result = await page.getServerSideProps({ params: { slug: 'alpes' } });
    const html = renderToStaticMarkup(React.createElement(page.default, result.props));
    assert.ok(html.indexOf('<h2>Massifs</h2>') < html.indexOf('region-page__stations'));
    assert.match(html, /<title>Titre personnalisé<\/title>/);
    assert.match(html, /<meta name="description" content="Description personnalisée"/);
    assert.match(html, /<h1>Alpes<\/h1>/);
    assert.match(html, /href="https:\/\/www.snow-explorer.com\/regions\/alpes"/);
    assert.match(html, /aria-label="Fil d’Ariane"/);
    assert.match(html, /href="https:\/\/www.snow-explorer.com\/stations\/test"/);
    assert.doesNotMatch(html, /<script>|Obsolète/);
    const empty = renderToStaticMarkup(React.createElement(page.default, { ...result.props, region: { ...region, description_html: '' } }));
    assert.doesNotMatch(empty, /region-page__seo|Obsolète|Massifs/);
  } finally { global.fetch = originalFetch; }
});
