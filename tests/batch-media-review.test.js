const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const renderer = require("react-test-renderer");
const { JSDOM } = require("jsdom");
const { completeBatch } = require('./complete-station-batch.test');

function loadComponent(relativePath, overrides = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const standardRequire = loaded.require.bind(loaded);
  loaded.require = name => {
    if (overrides[name]) return overrides[name];
    if (name === "./BatchCorrectionEditor") return loadComponent("src/components/admin/imports/BatchCorrectionEditor.tsx");
    if (name === "@/components/stations/StationPisteMap") return loadComponent("src/components/stations/StationPisteMap.tsx");
    if (name.startsWith("@/lib/")) return require("../src/lib/" + name.slice(6));
    return standardRequire(name);
  };
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  loaded._compile(compiled, filename);
  return loaded.exports;
}

test("manual media confirmation does not require opening plan modals", async () => {
  const previous = global.document;
  const dom = new JSDOM("<!doctype html><body></body>");
  global.document = dom.window.document;
  let view;
  const assets = ["first", "second"].flatMap(station => ["cover", "logo", "piste_map"].map(role => ({
    station_slug: station, role, job_token: `${station}:${role}`, receipt: `${station}:${role}`,
    url: `https://example.com/${station}/${role}.${station === "first" && role === "piste_map" ? "html" : "webp"}`,
    render_mode: station === "first" && role === "piste_map" ? "interactive" : "image",
    linked_image: role === "piste_map", width: 200, height: 100, size_bytes: 1000,
  })));
  const assembled = [];
  const previews = [];
  const api = {
    resolveStationBatch: async () => ({ jobs: assets, warnings: [] }),
    prepareStationBatchMedia: async token => assets.find(asset => asset.job_token === token),
    assembleStationBatch: async (...args) => { assembled.push(args); return { document: { schema_version: "1.0", stations: [] } }; },
  };
  try {
    const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api }).default;
    const batch = completeBatch();
    await renderer.act(async () => {
      view = renderer.create(React.createElement(Batch, { batch, onBusy: () => {}, onPrepared: async document => { previews.push(document); } }));
    });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    renderer.act(() => {
      for (const image of view.root.findAllByType("img")) image.props.onLoad?.({ currentTarget: { naturalWidth: 200 } });
    });
    const checkbox = () => view.root.findByProps({ type: "checkbox" });
    assert.equal(checkbox().props.disabled, false);
    assert.equal(view.root.findByProps({ className: "btn btn--primary" }).props.disabled, true);
    assert.equal(view.root.findAllByProps({ role: "dialog" }).length, 0);
    assert.ok(!JSON.stringify(view.toJSON()).includes("Plans restant à ouvrir"));
    renderer.act(() => checkbox().props.onChange({ target: { checked: true } }));
    const preview = view.root.findByProps({ className: "btn btn--primary" });
    assert.equal(preview.props.disabled, false);
    await renderer.act(async () => { preview.props.onClick(); });
    assert.equal(assembled.length, 1);
    assert.deepEqual(assembled[0][0], batch);
    assert.equal(assembled[0][1].length, 6);
    assert.equal(previews.length, 1);
  } finally {
    if (view) renderer.act(() => view.unmount());
    global.document = previous;
    dom.window.close();
  }
});

test("an entirely incomplete batch reports exclusions without starting media preparation", async () => {
  let calls = 0, view;
  const api = { resolveStationBatch: async () => { calls++; throw new Error('must not be called'); } };
  const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api }).default;
  const batch = completeBatch();
  delete batch.document.stations[0].forfaits_avances;
  try {
    await renderer.act(async () => {
      view = renderer.create(React.createElement(Batch, { batch, onBusy: () => {}, onPrepared: async () => {} }));
    });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    assert.equal(calls, 0);
    assert.equal(view.root.findAllByProps({ type: 'checkbox' }).length, 0);
    assert.ok(JSON.stringify(view.toJSON()).includes('forfaits_avances.seasons'));
    assert.ok(JSON.stringify(view.toJSON()).includes('Aucune station complète'));
  } finally { if (view) renderer.act(() => view.unmount()); }
});


test("interrupted preparation identifies the media and resumes without repeating completed jobs", async () => {
  let view, resolved = 0;
  const calls = [];
  let fail = true;
  const jobs = ["cover", "logo", "piste_map"].map(role => ({ station_slug: "first", role, job_token: role }));
  const api = {
    resolveStationBatch: async () => { resolved++; return { jobs, warnings: [] }; },
    prepareStationBatchMedia: async token => {
      calls.push(token);
      if (token === "logo" && fail) { fail = false; throw new Error("Connexion interrompue"); }
      return { ...jobs.find(job => job.job_token === token), receipt: token, url: "https://example.org/map.webp", render_mode: "image", width: 20, height: 20, size_bytes: 50 };
    },
  };
  const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api });
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Batch.default, { batch: completeBatch(), onBusy: () => {}, onPrepared: async () => {} })); });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    assert.match(view.root.findByProps({ role: "alert" }).children.join(""), /first : logo.*Connexion interrompue/);
    assert.equal(view.root.findAllByType("article").length, 1);
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    assert.deepEqual(calls, ["cover", "logo", "logo", "piste_map"]);
    assert.equal(resolved, 1);
    assert.equal(view.root.findAllByType("article").length, 3);
  } finally { if (view) renderer.act(() => view.unmount()); }
});

test("stopping an unanswered request preserves progress and ignores its late response", async () => {
  let view, late;
  const jobs = [{ station_slug: "first", role: "cover", job_token: "cover" }];
  const api = {
    resolveStationBatch: async () => ({ jobs, warnings: [] }),
    prepareStationBatchMedia: () => new Promise(resolve => { late = resolve; }),
  };
  const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api }).default;
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Batch, { batch: completeBatch(), onBusy: () => {}, onPrepared: async () => {} })); });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    const stop = view.root.findAllByType("button").find(button => button.children.join("") === "Arrêter l’attente");
    await renderer.act(async () => { stop.props.onClick(); });
    assert.match(view.root.findByProps({ role: "alert" }).children.join(""), /first : cover.*Attente arrêtée/);
    await renderer.act(async () => { late({ ...jobs[0], receipt: "late", url: "https://example.org/late.webp" }); });
    assert.equal(view.root.findAllByType("article").length, 0);
    assert.equal(view.root.findByProps({ className: "btn btn--secondary" }).props.disabled, false);
  } finally { if (view) renderer.act(() => view.unmount()); }
});

test("an unanswered step times out with an explicit message and unlocks retry", async () => {
  const original = global.setTimeout;
  let expire, view;
  global.setTimeout = (callback, delay, ...args) => {
    if (delay === 75000) { expire = callback; return original(() => {}, 100000); }
    return original(callback, delay, ...args);
  };
  const api = { resolveStationBatch: () => new Promise(() => {}) };
  const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api }).default;
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Batch, { batch: completeBatch(), onBusy: () => {}, onPrepared: async () => {} })); });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    assert.equal(typeof expire, "function");
    await renderer.act(async () => { expire(); });
    assert.match(view.root.findByProps({ role: "alert" }).children.join(""), /Vérification des sources.*75 s/);
    assert.equal(view.root.findByProps({ className: "btn btn--secondary" }).props.disabled, false);
  } finally { global.setTimeout = original; if (view) renderer.act(() => view.unmount()); }
});

test("a failed PDF can be replaced in the editor and retested without redoing prepared media", async () => {
  let view, revision;
  const jobs = ["cover", "logo", "piste_map"].map(role => ({ station_slug: "first", role, job_token: role, source_url: `https://example.org/${role}.pdf` }));
  const prepared = [];
  const calls = [];
  const api = {
    resolveStationBatch: async () => ({ jobs, warnings: [] }),
    prepareStationBatchMedia: async token => {
      calls.push(token);
      if (token === "piste_map") throw new Error("Le fournisseur interdit l’intégration du PDF.");
      const job = token === "new-map" ? { ...jobs[2], job_token: token } : jobs.find(item => item.job_token === token);
      const asset = { ...job, receipt: token, url: "https://example.org/public/" + token, render_mode: "interactive", width: 200, height: 100, size_bytes: 1000 };
      prepared.push(asset);
      return asset;
    },
    reviseStationBatch: async (batch, receipts) => {
      revision = { batch, receipts };
      return { jobs: [...jobs.slice(0, 2), { ...jobs[2], job_token: "new-map" }], warnings: [], prepared: prepared.slice() };
    },
  };
  const Batch = loadComponent("src/components/admin/imports/BatchMediaPreparation.tsx", { "@/lib/api/stationImports": api }).default;
  const source = completeBatch();
  source.document.stations[0].station.slug = "first";
  source.media.forEach(media => { media.station_slug = "first"; });
  source.media.find(item => item.role === "piste_map").source_url = "https://example.org/blocked.pdf";
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Batch, { batch: source, onBusy: () => {}, onPrepared: async () => {} })); });
    await renderer.act(async () => { view.root.findByProps({ className: "btn btn--secondary" }).props.onClick(); });
    renderer.act(() => view.root.findAllByType("button").find(button => button.children.join("") === "Corriger le média en erreur").props.onClick());
    renderer.act(() => view.root.findByProps({ "aria-label": "Nouveau lien du plan" }).props.onChange({ target: { value: "https://www.calameo.com/read/1234" } }));
    await renderer.act(async () => { view.root.findAllByType("button").find(button => button.children.join("") === "Appliquer la correction et reprendre les tests").props.onClick(); });
    assert.equal(revision.batch.media.find(item => item.role === "piste_map").source_url, "https://www.calameo.com/read/1234");
    assert.equal(revision.batch.media.find(item => item.role === "piste_map").format, "interactive");
    assert.deepEqual(revision.receipts, ["cover", "logo"]);
    assert.deepEqual(calls, ["cover", "logo", "piste_map", "new-map"]);
    assert.equal(source.media.find(item => item.role === "piste_map").source_url, "https://example.org/blocked.pdf");
    assert.equal(view.root.findAllByType("article").length, 3);
    assert.equal(view.root.findByProps({ type: "checkbox" }).props.disabled, false);
    assert.equal(view.root.findByProps({ type: "checkbox" }).props.checked, false);
  } finally { if (view) renderer.act(() => view.unmount()); }
});

test("the correction editor validates input, preserves unrelated media and can exclude one station", async () => {
  const Editor = loadComponent("src/components/admin/imports/BatchCorrectionEditor.tsx").default;
  const batch = completeBatch();
  batch.document.stations[0].station.slug = "first";
  batch.media.forEach(media => { media.station_slug = "first"; });
  batch.document.stations.push(JSON.parse(JSON.stringify(batch.document.stations[0])));
  batch.document.stations[1].station.slug = "second";
  batch.media.push(...batch.media.map(media => ({ ...media, station_slug: "second" })));
  batch.research = [{ station_slug: "first" }, { station_slug: "second" }];
  const applied = [];
  let view;
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Editor, { batch, target: { station_slug: "first", role: "piste_map" }, busy: false, onApply: async value => { applied.push(value); }, onClose: () => {} })); });
    renderer.act(() => view.root.findByProps({ "aria-label": "Nouveau lien du plan" }).props.onChange({ target: { value: "http://example.org/unsafe.pdf" } }));
    await renderer.act(async () => { view.root.findAllByType("button").find(button => button.children.join("") === "Appliquer la correction et reprendre les tests").props.onClick(); });
    assert.equal(applied.length, 0);
    assert.match(view.root.findByProps({ role: "alert" }).children.join(""), /HTTPS/);
    await renderer.act(async () => { view.root.findAllByType("button").find(button => button.children.join("") === "Écarter cette station du lot").props.onClick(); });
    assert.deepEqual(applied[0].document.stations.map(item => item.station.slug), ["second"]);
    assert.equal(applied[0].media.length, 3);
    assert.deepEqual(applied[0].research, [{ station_slug: "second" }]);
    assert.equal(batch.document.stations.length, 2);
  } finally { if (view) renderer.act(() => view.unmount()); }
});

test("station data can be corrected without changing the source media", async () => {
  const Editor = loadComponent("src/components/admin/imports/BatchCorrectionEditor.tsx").default;
  const batch = completeBatch(), slug = batch.document.stations[0].station.slug;
  let view, corrected;
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Editor, { batch, target: { station_slug: slug, role: "piste_map" }, busy: false, onApply: async value => { corrected = value; }, onClose: () => {} })); });
    renderer.act(() => view.root.findByProps({ type: "checkbox" }).props.onChange({ target: { checked: true } }));
    const record = JSON.parse(JSON.stringify(batch.document.stations[0]));
    record.station.altitude_min_m = 1300;
    renderer.act(() => view.root.findByProps({ "aria-label": "Données de la station" }).props.onChange({ target: { value: JSON.stringify(record) } }));
    await renderer.act(async () => { view.root.findAllByType("button").find(button => button.children.join("") === "Appliquer la correction et reprendre les tests").props.onClick(); });
    assert.equal(corrected.document.stations[0].station.altitude_min_m, 1300);
    assert.deepEqual(corrected.media, batch.media);
  } finally { if (view) renderer.act(() => view.unmount()); }
});

test("logo replacements enforce the file limit and are sent as explicit generated WebP", async () => {
  const Editor = loadComponent("src/components/admin/imports/BatchCorrectionEditor.tsx").default;
  const batch = completeBatch(), slug = batch.document.stations[0].station.slug;
  let view, corrected;
  const submit = () => view.root.findAllByType("button").find(button => button.children.join("") === "Appliquer la correction et reprendre les tests").props.onClick();
  try {
    await renderer.act(async () => { view = renderer.create(React.createElement(Editor, { batch, target: { station_slug: slug, role: "logo" }, busy: false, onApply: async value => { corrected = value; }, onClose: () => {} })); });
    renderer.act(() => view.root.findByProps({ "aria-label": "Fichier WebP de remplacement" }).props.onChange({ target: { files: [{ size: 40961 }] } }));
    await renderer.act(async () => submit());
    assert.equal(corrected, undefined);
    assert.match(view.root.findByProps({ role: "alert" }).children.join(""), /40 Ko/);
    const bytes = Uint8Array.from(Buffer.from("RIFFxxxxWEBPtest"));
    renderer.act(() => view.root.findByProps({ "aria-label": "Fichier WebP de remplacement" }).props.onChange({ target: { files: [{ size: bytes.length, arrayBuffer: async () => bytes.buffer }] } }));
    await renderer.act(async () => submit());
    const logo = corrected.media.find(item => item.role === "logo");
    assert.equal(logo.source_selection, "manual");
    assert.equal(logo.source_kind, "generated");
    assert.equal(logo.data_base64, Buffer.from(bytes).toString("base64"));
    assert.equal(logo.source_url, undefined);
  } finally { if (view) renderer.act(() => view.unmount()); }
});
