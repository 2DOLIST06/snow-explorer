const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, stubs = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name in stubs ? stubs[name] : name.startsWith('@/') ? require(path.resolve('src', name.slice(2))) : require(name), module, module.exports);
  return module.exports;
}
let preferenceState = { ready: true, preferences: { externalContent: true, analytics: false } };
const Block = load('src/components/activities/ActivitiesBlock.tsx', { '@/contexts/CookiePreferencesContext': { useCookiePreferences: () => preferenceState } }).default;
const block = { enabled: true, title: 'Découvrir la montagne', items: [
  { id: 'image', enabled: true, type: 'image', src: 'https://cdn.test/photo.png', alt: 'Montagne', href: 'https://partner.test/?x=1&ref=A%2FB', newTab: true },
  { id: 'rich', enabled: true, type: 'rich', html: '<h3>Randonnée</h3>' },
  { id: 'embed', enabled: true, type: 'embed', html: '<div id="partner"></div><script src="https://partner.test/widget.js"></script>', origins: [] },
] };
test('public SSR contains ordered safe content without an inline consent prompt', () => {
  const html = renderToStaticMarkup(React.createElement(Block, { block }));
  assert.ok(html.indexOf('alt="Montagne"') < html.indexOf('<h3>Randonnée</h3>'));
  assert.match(html, /rel="sponsored noopener noreferrer"/); assert.doesNotMatch(html, /<iframe|<script/);
  assert.equal(renderToStaticMarkup(React.createElement(Block, { block: { ...block, enabled: false } })), '');
  assert.equal(renderToStaticMarkup(React.createElement(Block, { block: { ...block, items: [] } })), '');
});
test('widget loads directly and global refusal or unmount cleans document and listener', () => {
  const previous = global.window; const listeners = new Set();
  global.window = { addEventListener: (_name, cb) => listeners.add(cb), removeEventListener: (_name, cb) => listeners.delete(cb) };
  let view;
  try {
    preferenceState = { ready: true, preferences: { externalContent: true, analytics: false } };
    act(() => { view = create(React.createElement(Block, { block })); });
    assert.equal(view.root.findAllByType('button').length, 0);
    assert.equal(view.root.findByType('iframe').props.sandbox, 'allow-scripts allow-popups'); assert.equal(listeners.size, 1);
    assert.match(view.root.findByType('iframe').props.srcDoc, /https:\/\/partner.test\/widget.js/);
    preferenceState = { ready: true, preferences: { externalContent: false, analytics: false } };
    act(() => view.update(React.createElement(Block, { block })));
    assert.equal(view.root.findAllByType('iframe').length, 0); assert.equal(listeners.size, 0);
    preferenceState = { ready: true, preferences: { externalContent: true, analytics: false } };
    act(() => view.update(React.createElement(Block, { block })));
    assert.equal(listeners.size, 1);
    act(() => view.unmount()); assert.equal(listeners.size, 0);
  } finally { if (view) act(() => view.unmount()); global.window = previous; }
});
test('reloaded pending batch retains explicit initial launch and replacement wording', async () => {
  for (const mode of ['add', 'replace']) {
    const router = { query: { lot: 'batch' }, pathname: '/admin/activites', replace: async () => {} };
    const batch = { id: 'batch', plan: { mode, template_name: 'Modèle', stations: [{ id: '0', name: 'Station', action: mode === 'add' ? 'added' : 'replaced' }] }, items: [{ id: '0', name: 'Station', action: mode === 'add' ? 'added' : 'replaced', status: 'pending' }], pending: 1 };
    const Page = load('pages/admin/activites.tsx', {
      'next/router': { useRouter: () => router }, '@/components/admin/ActivitiesEditor': { __esModule: true, default: () => null },
      '@/lib/adminActivitiesApi': { activitiesApi: async name => name.startsWith('activity-batches') ? batch : { items: [], pages: 0 } },
      '@/types/activities': { emptyActivities: () => ({ enabled: false, title: 'Activités à faire', items: [] }) },
    }).default;
    let view;
    await act(async () => { view = create(React.createElement(Page)); });
    const buttons = view.root.findAllByType('button').map(node => node.children.join(''));
    assert.ok(buttons.includes(mode === 'add' ? 'Lancer les ajouts' : 'Confirmer et appliquer les remplacements'));
    assert.ok(!buttons.includes('Reprendre les stations en attente ou en erreur'));
    act(() => view.unmount());
  }
});
