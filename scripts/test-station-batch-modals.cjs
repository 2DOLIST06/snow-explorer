/* Render the real public component in Chromium, without station writes.
 * node scripts/test-station-batch-modals.cjs batch.json /tmp/modal-results
 * Requires Playwright (or PLAYWRIGHT_MODULE pointing to its installed module).
 * Cross-origin viewers require visual inspection of the generated screenshots.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const output = path.resolve(process.argv[3] || '/tmp/snow-modal-tests');
fs.mkdirSync(output, { recursive: true });
const component = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/stations/StationPisteMap.tsx'), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const modules = {
  '@/lib/stationName': fs.readFileSync(path.join(root, 'src/lib/stationName.js'), 'utf8'),
  '@/lib/officialMap': fs.readFileSync(path.join(root, 'src/lib/officialMap.js'), 'utf8'),
  component,
};
const bundle = Object.entries(modules).map(([name, code]) => `factories[${JSON.stringify(name)}]=function(module,exports,require){${code}\n};`).join('\n');
const assets = {
  '/react.js': fs.readFileSync(path.join(path.dirname(require.resolve('react/package.json')), 'umd/react.development.js')),
  '/react-dom.js': fs.readFileSync(path.join(path.dirname(require.resolve('react-dom/package.json')), 'umd/react-dom.development.js')),
  '/app.js': `const factories={},cache={react:{exports:React}};${bundle}
    function require(name){if(cache[name])return cache[name].exports;const m={exports:{}};cache[name]=m;factories[name](m,m.exports,require);return m.exports;}
    const view=ReactDOM.createRoot(document.getElementById('root'));
    window.showPlan=(name,url)=>view.render(React.createElement(require('component').PlanPistesFigure,{key:name,name,officialUrl:url}));`,
};
const html = '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/app.js"></script>';
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8');
  res.end(assets[req.url] || html);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    for (const asset of batch.media.filter(m => m.role === 'piste_map' && m.status === 'found')) {
      const result = { station_slug: asset.station_slug, url: asset.source_url, environment: 'local public component; production origin not tested', modal_opened: false, image_loaded: false, viewer_requires_visual_review: false };
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.evaluate(({ name, url }) => window.showPlan(name, url), { name: asset.station_slug, url: asset.source_url });
        await page.getByRole('button', { name: /Agrandir le plan|Voir le plan/ }).click();
        const modal = page.getByRole('dialog');
        await modal.waitFor();
        result.modal_opened = true;
        if (await modal.locator('img').count()) {
          await modal.locator('img').evaluate(img => new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Image load timed out')), 20000);
            const check = () => { clearTimeout(timer); img.naturalWidth > 0 ? resolve(true) : reject(new Error('Image unavailable')); };
            if (img.complete) check(); else { img.onload = check; img.onerror = () => reject(new Error('Image failed')); }
          }));
          result.image_loaded = true;
        } else {
          result.viewer_requires_visual_review = true;
          const frame = modal.locator('iframe');
          await frame.waitFor();
          await page.waitForTimeout(5000);
          result.frame_url = await frame.getAttribute('src');
          result.frame_diagnostics = [];
          for (const child of page.frames().slice(1)) {
            try {
              result.frame_diagnostics.push(await child.evaluate(() => ({ url: location.href, title: document.title, text: document.body?.innerText.slice(0, 800), images: document.images.length, canvases: document.querySelectorAll('canvas').length })));
            } catch (error) { result.frame_diagnostics.push({ error: error.message }); }
          }
        }
        result.screenshot = path.join(output, asset.station_slug.replace(/[^a-z0-9-]/gi, '_') + '.png');
        await page.screenshot({ path: result.screenshot });
      } catch (error) { result.error = error.message; }
      results.push(result);
      fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    }
    console.log(JSON.stringify(results, null, 2));
    if (results.some(r => r.error)) process.exitCode = 1;
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
