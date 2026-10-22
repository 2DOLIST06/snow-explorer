const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
const { act } = renderer;
function load(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'React', compiled)(name => name in mocks ? mocks[name] : require(name), module, module.exports, React);
  return module.exports;
}
const component = tag => ({ children, ...props }) => React.createElement(tag, props, children);

test('recovery page removes URL fragment, waits for a click, then refreshes the session', async () => {
  const original = global.window;
  const calls = [];
  global.window = { location: { hash: '#'+ 'a'.repeat(64), pathname: '/admin/login-link' }, history: { replaceState: (...args) => calls.push(['history', ...args]) } };
  const Page = load('pages/admin/login-link.tsx', {
    'next/head': component('div'), 'next/link': component('a'),
    'next/router': { useRouter: () => ({ replace: async value => calls.push(['redirect', value]) }) },
    '@/contexts/AdminAuthContext': { useAdminAuth: () => ({ refreshSession: async () => { calls.push(['refresh']); return 'csrf'; } }) },
    '@/lib/adminRecovery': { recoveryRequest: async (...args) => calls.push(['consume', ...args]) },
  }).default;
  let root;
  try {
    await act(async () => { root = renderer.create(React.createElement(Page)); });
    assert.equal(calls.filter(c => c[0] === 'consume').length, 0);
    assert.equal(calls[0][3], '/admin/login-link');
    await act(async () => { await root.root.findByType('button').props.onClick(); });
    assert.deepEqual(calls.find(c => c[0] === 'consume'), ['consume', 'login-link/consume', { token: 'a'.repeat(64) }]);
    assert.deepEqual(calls.slice(-2), [['refresh'], ['redirect', '/admin/account']]);
  } finally { if(root) act(() => root.unmount()); global.window = original; }
});

test('recovery client keeps cookies and displays explicit unknown-address errors', async () => {
  const original = global.fetch;
  let call;
  global.fetch = async (...args) => { call = args; return { ok: false, json: async () => ({ error: 'account_not_found' }) }; };
  try {
    const api = load('src/lib/adminRecovery.ts', { './adminApi': { ADMIN_API_BASE: 'https://api.example' } });
    await assert.rejects(api.recoveryRequest('login-link', { email: 'missing@example.com' }), /Aucun compte/);
    assert.equal(call[0], 'https://api.example/api/admin/auth/login-link');
    assert.equal(call[1].credentials, 'include');
    assert.equal(call[1].method, 'POST');
  } finally { global.fetch = original; }
});
