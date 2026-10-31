const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const renderer = require('react-test-renderer');
const { act } = renderer;
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'React', compiled)(name => {
    if (name in mocks) return mocks[name];
    if (name === '@/lib/newsletter/onboarding') return load('src/lib/newsletter/onboarding.ts');
    return require(name);
  }, module, module.exports, React);
  return module.exports;
}
const button = (root, label) => root.root.findAllByType('button').find(item => item.children.join('') === label);

test('connected station CTA opens the account with its station and topic without writing preferences', async () => {
  const calls = [];
  const Follow = load('src/components/newsletter/FollowStationButton.tsx', {
    'next/router': { useRouter: () => ({ push: async url => calls.push(url) }) },
    '@/contexts/MemberAuthContext': { useMemberAuth: () => ({ status: 'authenticated' }) },
    '@/components/ui/Modal': () => null,
    '@/lib/newsletter/i18n': { newsletterLanguage: () => 'fr' },
    './NewsletterEnrollment': () => null,
  }).default;
  let root;
  await act(async () => { root = renderer.create(React.createElement(Follow, { stationId: 'FR_2', stationName: "Alpe d’Huez", topic: 'weather' })); });
  try {
    await act(async () => root.root.findByType('button').props.onClick());
    const url = new URL(calls[0], 'https://snow.example');
    assert.equal(url.pathname, '/mon-compte');
    assert.equal(url.searchParams.get('station_id'), 'FR_2');
    assert.equal(url.searchParams.get('topic'), 'weather');
    assert.equal(url.searchParams.get('station_name'), 'Alpe d’Huez');
    assert.equal(calls.length, 1);
  } finally { act(() => root.unmount()); }
});

test('newsletter signup redirects to the account without rendering preferences in the footer', async () => {
  const calls = []; let entry;
  const Enrollment = load('src/components/newsletter/NewsletterEnrollment.tsx', {
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    'next/router': { useRouter: () => ({ push: async url => calls.push(['navigate', url]) }) },
    '@/contexts/MemberAuthContext': { useMemberAuth: () => ({ user: null, openNewsletterAccount: value => { entry = value; } }) },
    '@/lib/memberApi': { memberRequest: async (...args) => { calls.push(args); return { status:'active',draft_token: 'draft-only' }; } },
  }).default;
  const initial = { stations: [], articles: true, consent: false, language: 'fr', source: 'footer' };
  let root; await act(async () => { root = renderer.create(React.createElement(Enrollment, { initial })); });
  try {
    assert.equal(root.root.findAllByType('input').length, 1);
    act(() => root.root.findByProps({ type: 'email' }).props.onChange({ target: { value: ' A@EXAMPLE.COM ' } }));
    await act(async () => root.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(calls[0][0], '/newsletter/start');
    assert.equal(entry.email, 'a@example.com'); assert.equal(entry.draftToken, 'draft-only');
    assert.equal(entry.intent.consent, true); assert.equal(entry.status, 'active');
    assert.ok(entry.expiresAt > Date.now());
    assert.deepEqual(calls[1], ['navigate', '/mon-compte']);
    assert.equal(root.root.findAllByType('select').length, 0);
    assert.equal(root.root.findAllByProps({role:'status'}).length, 0);
  } finally { act(() => root.unmount()); }
});

test('account intent ignores arbitrary redirects and unsupported topics', () => {
  const { loginDestination, intentFromQuery } = load('src/lib/newsletter/onboarding.ts');
  assert.equal(loginDestination({ next: 'https://evil.example' }), '/mon-compte');
  assert.equal(intentFromQuery({ station_id: 'FR_1', topic: 'unsupported' }), null);
  assert.equal(intentFromQuery({ station_id: ['FR_1', 'FR_2'], topic: 'weather' }), null);
});


test('connected newsletter signup is applied immediately before opening the account', async () => {
  const calls=[];
  const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{
    'next/link':({children,...p})=>React.createElement('a',p,children),
    'next/router':{useRouter:()=>({push:async url=>calls.push(['navigate',url])})},
    '@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:{email:'member@example.com'},openNewsletterAccount:()=>{},stageNewsletterIntent:(...args)=>calls.push(['stage',...args])})},
    '@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)},
    './NewsletterIntentForm':()=>null,
  }).default;
  const initial={stations:[],articles:true,consent:false,language:'fr',source:'footer'};
  let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
  try{assert.equal(root.root.findAllByType('input').length,0);await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls[0],['/newsletter/apply',{intent:{...initial,consent:true}},true]);assert.deepEqual(calls.at(-1),['navigate','/mon-compte']);}finally{act(()=>root.unmount());}
});
