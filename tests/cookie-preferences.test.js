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
const render = async (root, publicPage = true) => { await act(async () => root.render(React.createElement(CookiePreferencesProvider, { publicPage }, React.createElement(Controls), React.createElement(Block, { block })))); await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); };

test('cookie choice only stores the preference for Snow Explorer optional cookies and expires after 180 days', () => {
  const now = Date.now(); const prefs = { optionalCookies: false };
  const cookie = preferencesCookie(prefs, true, now);
  assert.deepEqual(readCookiePreferences(cookie, now), prefs);
  assert.equal(readCookiePreferences(cookie, now + COOKIE_MAX_AGE * 1000), null);
  assert.match(cookie, /SameSite=Lax; Secure$/);
  assert.equal(readCookiePreferences(`${COOKIE_NAME}=broken`, now), null);
  assert.equal(readCookiePreferences(`${COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ version:2, savedAt:now, optionalCookies:'true' }))}`,now),null);
  assert.deepEqual(DEFAULT_PREFERENCES, { optionalCookies:false });
});
test('old partner refusals are ignored and cannot hide any integration', async () => {
  const oldCookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify({version:1,savedAt:Date.now(),externalContent:false,analytics:false}))}; Path=/`;
  assert.equal(readCookiePreferences(oldCookie),null);
  const env=setup(oldCookie);
  try { await render(env.root); assert.ok(document.querySelector('.activity-widget iframe')); assert.ok(document.querySelector('#gyg-site-analytics')); assert.ok(document.querySelector('.cookie-panel')); } finally { env.cleanup(); }
});
test('refusing own optional cookies leaves widget document, partner script, card and links unchanged even after reload', async () => {
  let env=setup(); let saved;
  try {
    await render(env.root);
    const widget=document.querySelector('.activity-widget iframe'); const originalDoc=widget.getAttribute('srcdoc');
    const sdk=document.querySelector('#gyg-site-analytics');
    await click('Tout refuser');
    assert.equal(document.querySelector('.activity-widget iframe'),widget);
    assert.equal(widget.getAttribute('srcdoc'),originalDoc);
    assert.equal(document.querySelector('#gyg-site-analytics'),sdk);
    assert.ok(document.querySelector('.activities-block')); assert.equal(document.querySelector('.cookie-panel'),null);
    saved=document.cookie; assert.deepEqual(readCookiePreferences(saved),{optionalCookies:false});
  } finally { env.cleanup(); }
  env=setup(saved);
  try { await render(env.root); assert.ok(document.querySelector('.activity-widget iframe')); assert.ok(document.querySelector('#gyg-site-analytics')); assert.equal(document.querySelector('.cookie-panel'),null); } finally { env.cleanup(); }
});
test('settings only offer own optional cookies and preserve focus without reinitializing partner scripts', async () => {
  const env=setup(preferencesCookie({optionalCookies:false},true));
  try {
    await render(env.root); const sdk=document.querySelector('#gyg-site-analytics');
    const trigger=document.querySelector('button'); trigger.focus(); await click('Gérer mes cookies');
    assert.ok(document.querySelector('[role=dialog][aria-modal=true]')); assert.equal(document.activeElement.getAttribute('aria-label'),'Fermer les préférences cookies');
    const inputs=document.querySelectorAll('.cookie-categories input'); assert.equal(inputs.length,2); assert.equal(inputs[0].disabled,true);
    assert.doesNotMatch(document.querySelector('.cookie-panel').textContent,/GetYourGuide|Contenus partenaires|conversions/);
    await act(async()=>inputs[1].click()); await click('Enregistrer mes choix');
    assert.deepEqual(readCookiePreferences(document.cookie),{optionalCookies:true}); assert.equal(document.querySelector('#gyg-site-analytics'),sdk); assert.ok(document.querySelector('.activity-widget iframe'));
    assert.equal(document.activeElement,trigger); await click('Gérer mes cookies');
    await act(async()=>document.dispatchEvent(new env.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(document.querySelector('[role=dialog]'),null); assert.equal(document.activeElement,trigger);
  } finally { env.cleanup(); }
});
test('accept and reject never duplicate partner SDK, including under Strict Mode', async () => {
  const env=setup(); let starts=0; const append=document.head.appendChild.bind(document.head);
  document.head.appendChild=(node)=>{ if(node.id==='gyg-site-analytics') starts++; return append(node); };
  try {
    await act(async()=>env.root.render(React.createElement(React.StrictMode,null,React.createElement(CookiePreferencesProvider,{publicPage:true},React.createElement(Controls),React.createElement(Block,{block})))));
    await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,5)); });
    assert.equal(starts,1); await click('Tout accepter'); await click('Gérer mes cookies'); await click('Tout refuser'); assert.equal(starts,1); assert.equal(document.querySelectorAll('#gyg-site-analytics').length,1);
  } finally { env.cleanup(); }
});
test('admin has no unsolicited banner or partner script, but settings can be opened', async () => {
  const env=setup();
  try { await render(env.root,false); assert.equal(document.querySelector('.cookie-panel'),null); assert.equal(document.querySelector('#gyg-site-analytics'),null); await click('Gérer mes cookies'); assert.ok(document.querySelector('[role=dialog]')); } finally { env.cleanup(); }
});
test('blocked cookie storage keeps the own-cookie choice in memory and does not affect affiliates', async () => {
  const env=setup();
  try {
    Object.defineProperty(document,'cookie',{configurable:true,get:()=>{throw new Error('disabled')},set:()=>{throw new Error('disabled')}});
    await render(env.root); await click('Tout refuser'); assert.ok(document.querySelector('.activity-widget iframe')); assert.ok(document.querySelector('#gyg-site-analytics')); assert.match(document.querySelector('.cookie-storage-error').textContent,/n’a pas conservé/);
  } finally { env.cleanup(); }
});
