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

test("opening both real plan modals unlocks review and station preview", async () => {
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
    const open = station => view.root.findAllByType("button").find(button => button.props["aria-label"]?.startsWith("Voir le plan") && button.props["aria-label"].includes(station));
    assert.equal(checkbox().props.disabled, true);
    renderer.act(() => open("first").props.onClick());
    assert.equal(checkbox().props.disabled, true);
    const statuses = view.root.findAllByProps({ role: "status" }).map(item => item.children.join(""));
    assert.ok(statuses.some(text => text.includes("second") && !text.includes("first")));
    renderer.act(() => view.root.findByProps({ "aria-label": "Fermer le plan des pistes" }).props.onClick());
    renderer.act(() => open("second").props.onClick());
    assert.equal(checkbox().props.disabled, false);
    renderer.act(() => view.root.findByProps({ "aria-label": "Fermer le plan des pistes" }).props.onClick());
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
