const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, overrides = {}) {
 const source = fs.readFileSync(file, 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
 const mod = { exports: {} };
 const localRequire = name => {
  if (Object.hasOwn(overrides, name)) return overrides[name];
  if (name === 'next/head') return ({children}) => React.createElement('div', {}, children);
  if (name.startsWith('@/')) { const base = path.join(__dirname, '../src', name.slice(2)); return fs.existsSync(base + '.ts') ? load(base + '.ts') : require(base); }
  return require(name);
 };
 new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
 return mod.exports;
}
const page = load(path.join(__dirname, '../pages/regions/[slug].tsx'));
test('SSR emits editorial links before stations, custom metadata and safe breadcrumb JSON', () => {
 const html = renderToStaticMarkup(React.createElement(page.default, { region: { name: 'Alpes', slug:'alpes', meta_title:'Titre personnalisé', meta_description:'Description personnalisée', description_html:'<h2>Éditorial</h2><p><a href="https://example.com">Lien éditorial</a></p><script>evil()</script>' }, resorts:[] }));
 assert.ok(html.indexOf('Lien éditorial') < html.indexOf('region-page__stations'));
 assert.match(html, /<title>Titre personnalisé<\/title>/);
 assert.match(html, /content="Description personnalisée"/);
 assert.match(html, /href="https:\/\/www.snow-explorer.com\/regions\/alpes"/);
 assert.match(html, /BreadcrumbList/);
 assert.equal((html.match(/<h1>/g) || []).length, 1);
 assert.doesNotMatch(html, /evil\(\)/);
});
test('empty description omits editorial section and uses default metadata', () => {
 const html = renderToStaticMarkup(React.createElement(page.default, { region: { name:'Alpes', description_html:'', seo_text:'Ancien' }, resorts:[] }));
 assert.doesNotMatch(html, /region-page__seo|Ancien/);
 assert.match(html, /Stations de ski en Alpes \| Snow Explorer/);
});
test('SSR fetches canonical detail while keeping historical geography and URL', async () => {
 const original = global.fetch;
 const previousApi = process.env.API_URL; const previousPublic = process.env.NEXT_PUBLIC_API_URL;
 process.env.API_URL = "https://api.example.com"; process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
 const urls = [];
 global.fetch = async url => { urls.push(url); return { ok:true, json:async () => url.includes('/api/regions/') ? { region:{ id:'auvergne-rhone-alpes', slug:'auvergne-rhone-alpes', name:'Auvergne-Rhône-Alpes', description_html:'<p>Canonique</p>', meta_title:'Titre' } } : [{ id:'s', name:'Station', slug:'station', region:{ id:'auvergne', slug:'auvergne', name:'Auvergne' } }] }; };
 try {
  const result = await page.getServerSideProps({ params:{slug:'auvergne'} });
  assert.ok(urls.some(url => url.endsWith('/api/regions/auvergne-rhone-alpes')));
  assert.equal(result.props.region.description_html, '<p>Canonique</p>');
  assert.equal(result.props.region.slug, 'auvergne');
  assert.equal(result.props.resorts[0].region.id, 'auvergne');
 } finally { global.fetch = original; if (previousApi === undefined) delete process.env.API_URL; else process.env.API_URL = previousApi; if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = previousPublic; }
});

const renderer = require('react-test-renderer');
test('admin saves an explicitly empty description_html and retains useful errors', async () => {
 const requests = [];
 let fail = false;
 const api = { adminFetch: async (url, init = {}) => {
  requests.push({ url, init });
  if (init.method === 'PATCH') return { ok:!fail, status:fail ? 422 : 200, text:async () => 'Description invalide' };
  return { ok:true, status:200, json:async () => ({ region:{ id:'alpes', name:'Alpes', description_html:'<p>Initial</p>', seo_text:'Historique' } }) };
 } };
 const Editor = props => React.createElement('textarea', { 'data-editor':true, value:props.value, onChange:e => props.onChange(e.target.value) });
 const admin = load(path.join(__dirname, '../pages/admin/regions/[id].tsx'), {
  'next/link':({children, ...props}) => React.createElement('a', props, children),
  'next/router':{ useRouter:() => ({ query:{ id:'alpes' } }) }, '@/lib/adminApi':api, '@/components/admin/RegionHtmlEditor':Editor,
 });
 let tree;
 await renderer.act(async () => { tree = renderer.create(React.createElement(admin.default)); });
 await renderer.act(async () => { tree.root.findByProps({ 'data-editor':true }).props.onChange({ target:{ value:'' } }); });
 await renderer.act(async () => { tree.root.findAllByType('button').find(b => b.children.includes('Enregistrer')).props.onClick(); });
 const patch = requests.find(r => r.init.method === 'PATCH');
 assert.deepEqual(JSON.parse(patch.init.body), { description_html:'', meta_title:'', meta_description:'' });
 assert.match(JSON.stringify(tree.toJSON()), /Contenu SEO enregistré/);
 fail = true;
 await renderer.act(async () => { tree.root.findAllByType('button').find(b => b.children.includes('Enregistrer')).props.onClick(); });
 assert.match(JSON.stringify(tree.toJSON()), /422.*Description invalide/);
 tree.unmount();
});
