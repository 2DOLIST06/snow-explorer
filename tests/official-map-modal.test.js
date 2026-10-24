const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const renderer = require("react-test-renderer");
const { JSDOM } = require("jsdom");

function publicComponent() {
  const filename = path.resolve(__dirname, "../src/components/stations/StationPisteMap.tsx");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const standardRequire = loaded.require.bind(loaded);
  loaded.require = name => name.startsWith("@/lib/") ? require("../src/lib/" + name.slice(6)) : standardRequire(name);
  loaded._compile(compiled, filename);
  return loaded.exports.PlanPistesFigure;
}

test("official image plans load only after opening the modal", () => {
  const previous = global.document;
  const dom = new JSDOM("<!doctype html><body></body>");
  global.document = dom.window.document;
  let view;
  try {
    const Plan = publicComponent();
    const url = "https://example.com/plan-des-pistes.jpg";
    renderer.act(() => { view = renderer.create(React.createElement(Plan, { name: "Station", officialUrl: url })); });
    assert.equal(view.root.findAllByType("img").length, 0);
    assert.equal(view.root.findAllByType("iframe").length, 0);
    const open = view.root.findAllByType("button").find(button => button.props["aria-label"]?.startsWith("Voir le plan"));
    assert.ok(open);
    renderer.act(() => open.props.onClick());
    assert.equal(view.root.findByProps({ role: "dialog" }).props["aria-modal"], "true");
    assert.equal(view.root.findByType("img").props.src, url);
    renderer.act(() => view.root.findByProps({ "aria-label": "Fermer le plan des pistes" }).props.onClick());
    assert.equal(view.root.findAllByType("img").length, 0);
  } finally {
    if (view) renderer.act(() => view.unmount());
    global.document = previous;
    dom.window.close();
  }
});
