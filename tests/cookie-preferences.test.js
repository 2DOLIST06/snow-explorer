const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { COOKIE_NAME, COOKIE_MAX_AGE, DEFAULT_PREFERENCES, preferencesCookie, readCookiePreferences } = require('../src/lib/cookiePreferences');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (!name.startsWith('@/')) return require(name);
    const base = path.resolve('src', name.slice(2));
    return load(['.js', '.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync));
  }, module, module.exports);
  cache.set(file, module.exports); return module.exports;
}
const { CookiePreferencesProvider, useCookiePreferences } = load('src/contexts/CookiePreferencesContext.tsx');
const Block = load('src/components/activities/ActivitiesBlock.tsx').default;
const block = { enabled: true, title: 'Activités', items: [{ id: 'e', enabled: true, type: 'embed', html: '<iframe src="https://partner.test/frame"></iframe>', origins: [] }] };
function Controls() { const { openSettings } = useCookiePreferences(); return React.createElement('button', { onClick: openSettings }, 'Gérer mes cookies'); }
function setup(cookie) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://www.snow-explorer.com' });
  const previous = {};
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node']) { previous[key] = global[key]; global[key] = dom.window[key]; }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (cookie) document.cookie = cookie;
  const root = createRoot(document.getElementById('root'));
  return { root, dom, cleanup: () => { act(() => root.unmount()); dom.window.close(); for (const [key, value] of Object.entries(previous)) global[key] = value; } };
}
const click = async label => { const button = [...document.querySelectorAll('button')].find(el => el.textContent === label); assert.ok(button, label); await act(async () => button.click()); };
const render = async (root, publicPage = true) => act(async () => root.render(React.createElement(CookiePreferencesProvider, { publicPage }, React.createElement(Controls), React.createElement(Block, { block }))));

test('preference cookie validates schema, expires after 180 days and contains no credentials', () => {
  const now = Date.now(); const prefs = { externalContent: false, analytics: true };
  const cookie = preferencesCookie(prefs, true, now);
  assert.deepEqual(readCookiePreferences(cookie, now), prefs);
  assert.equal(readCookiePreferences(cookie, now + COOKIE_MAX_AGE * 1000), null);
  assert.match(cookie, /SameSite=Lax; Secure$/); assert.match(cookie, /Path=\//);
  assert.equal(readCookiePreferences(`${COOKIE_NAME}=broken`, now), null);
  assert.equal(readCookiePreferences(`${COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ version:1, savedAt:now, externalContent:'true', analytics:false }))}`, now), null);
  assert.deepEqual(DEFAULT_PREFERENCES, { externalContent: true, analytics: false });
});
test('first visit loads widgets directly, banners can refuse and saved refusal prevents loading on return', async () => {
  let env = setup(); let saved;
  try {
    await render(env.root);
    assert.ok(document.querySelector('.activity-widget iframe'));
    assert.ok(document.querySelector('.cookie-panel'));
    assert.equal(document.querySelector('#gyg-site-analytics'), null);
    assert.doesNotMatch(document.body.textContent, /Accepter et charger ce contenu/);
    await click('Tout refuser');
    assert.equal(document.querySelector('.activity-widget iframe'), null);
    assert.equal(document.querySelector('.activities-block'), null);
    assert.equal(document.querySelector('.cookie-panel'), null);
    saved = document.cookie; assert.equal(readCookiePreferences(saved).externalContent, false);
  } finally { env.cleanup(); }
  env = setup(saved);
  try { await render(env.root); assert.equal(document.querySelector('iframe'), null); assert.equal(document.querySelector('.cookie-panel'), null); } finally { env.cleanup(); }
});
test('settings restore focus, distinguish categories and enable partner widgets without site analytics', async () => {
  const env = setup(preferencesCookie({ externalContent:false, analytics:false }, true));
  try {
    await render(env.root);
    const trigger = document.querySelector('button'); trigger.focus();
    await click('Gérer mes cookies');
    assert.ok(document.querySelector('[role=dialog][aria-modal=true]'));
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Fermer les préférences cookies');
    const inputs = document.querySelectorAll('.cookie-categories input');
    assert.equal(inputs[0].disabled, true);
    await act(async () => inputs[1].click());
    await click('Enregistrer mes choix');
    assert.ok(document.querySelector('.activity-widget iframe'));
    assert.equal(document.querySelector('#gyg-site-analytics'), null);
    assert.equal(document.activeElement, trigger);
    await click('Gérer mes cookies');
    await act(async () => document.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key:'Escape', bubbles:true })));
    assert.equal(document.querySelector('[role=dialog]'), null);
    assert.equal(document.activeElement, trigger);
  } finally { env.cleanup(); }
});
test('accepting enables site analytics once and public route changes do not duplicate it', async () => {
  const env = setup();
  try {
    await render(env.root); await click('Tout accepter');
    assert.equal(document.querySelectorAll('#gyg-site-analytics').length, 1);
    await render(env.root); assert.equal(document.querySelectorAll('#gyg-site-analytics').length, 1);
    assert.equal(readCookiePreferences(document.cookie).analytics, true);
  } finally { env.cleanup(); }
});
test('admin pages have no unsolicited banner or analytics, but preferences can be opened explicitly', async () => {
  const env = setup();
  try {
    await render(env.root, false); assert.equal(document.querySelector('.cookie-panel'), null); assert.equal(document.querySelector('#gyg-site-analytics'), null);
    await click('Gérer mes cookies'); assert.ok(document.querySelector('[role=dialog]'));
  } finally { env.cleanup(); }
});
test('unavailable cookie storage keeps refusal in memory and reports that it was not saved', async () => {
  const env = setup();
  try {
    Object.defineProperty(document, 'cookie', { configurable:true, get:()=>{ throw new Error('cookie access disabled'); }, set:()=>{ throw new Error('cookie access disabled'); } });
    await render(env.root); await click('Tout refuser');
    assert.equal(document.querySelector('.activity-widget iframe'), null);
    assert.match(document.querySelector('.cookie-storage-error').textContent, /n’a pas conservé/);
  } finally { env.cleanup(); }
});
