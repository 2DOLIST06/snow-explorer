const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

const compiled = ts.transpileModule(fs.readFileSync('src/components/admin/SkiPassEditor.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

test('saving an older displayed season submits visibility and retains selection after reload', async () => {
  let seasons = [
    { id: 2, season: '2026-2027', is_active: true, currency: 'EUR', periods: [], passes: [] },
    { id: 1, season: '2025-2026', is_active: false, currency: 'EUR', periods: [], passes: [] },
  ];
  let submitted;
  const api = {
    getAdminSkiPasses: async () => ({ seasons: structuredClone(seasons) }),
    saveAdminSkiPassSeason: async (_, season) => {
      submitted = structuredClone(season);
      seasons = seasons.map(item => ({ ...item, is_active: item.id === season.id }));
    },
  };
  const mod = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(mod.exports, name => {
    if (name === 'react') return React;
    if (name === './ForfaitsJsonImport') return () => null;
    if (name === '@/lib/api/skiPasses') return api;
    throw new Error(name);
  }, mod);
  let renderer;
  await act(async () => { renderer = create(React.createElement(mod.exports.default, { stationSlug: 'le-granier' })); });
  await act(async () => renderer.root.findAllByType('select')[0].props.onChange({ target: { value: '1' } }));
  await act(async () => renderer.root.findAllByType('button').find(button => button.children.includes('Enregistrer les forfaits')).props.onClick());
  assert.equal(submitted.id, 1);
  assert.equal(submitted.is_active, true);
  assert.equal(renderer.root.findAllByType('select')[0].props.value, 1);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(React.createElement(mod.exports.default, { stationSlug: 'le-granier' })); });
  assert.equal(renderer.root.findAllByType('select')[0].props.value, 1);
  await act(async () => renderer.unmount());
});
