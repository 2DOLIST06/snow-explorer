const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const renderer = require("react-test-renderer");
const { JSDOM } = require("jsdom");

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
    const batch = { batch_version: "1.0" };
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
    assert.equal(assembled[0][0], batch);
    assert.equal(assembled[0][1].length, 6);
    assert.equal(previews.length, 1);
  } finally {
    if (view) renderer.act(() => view.unmount());
    global.document = previous;
    dom.window.close();
  }
});
