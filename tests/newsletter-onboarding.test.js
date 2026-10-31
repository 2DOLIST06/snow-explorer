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
    if (name.endsWith(".module.css")) return {};
    if (name === '@/lib/newsletter/onboarding') return load('src/lib/newsletter/onboarding.ts');
    return require(name);
  }, module, module.exports, React);
  return module.exports;
}
const button = (root, label) => root.root.findAllByType('button').find(item => item.children.join('') === label);

test('connected station CTA saves and confirms on the station without navigating', async () => {
  const calls = []; let entry;
  const Follow = load('src/components/newsletter/FollowStationButton.tsx', {
    'next/router': { useRouter: () => ({ push: async url => calls.push(['navigate',url]) }) },
    '@/contexts/MemberAuthContext': { useMemberAuth: () => ({ status: 'authenticated',user:{email:'member@example.com'},stageNewsletterIntent:(...args)=>calls.push(['stage',...args]),openNewsletterAccount:value=>{entry=value;} }) },
    '@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {already_followed:false};}},
    '@/lib/newsletter/i18n': { newsletterLanguage: () => 'fr' },
  }).default;
  let root;await act(async()=>{root=renderer.create(React.createElement(Follow,{stationId:'FR_2',stationName:'Alpe d’Huez',topic:'weather'}));});
  try {
    await act(async()=>root.root.findByType('button').props.onClick());
    assert.deepEqual(calls[0],['/newsletter/follow',{station_id:'FR_2',topic:'weather',language:'fr'},true]);
    assert.equal(calls.some(call=>call[0]==='navigate'),false);
    assert.equal(entry,undefined);
    assert.match(root.root.findByProps({role:'status'}).children.join(''),/Abonnement « Météo et enneigement » ajouté pour Alpe d’Huez/);
    assert.equal(root.root.findByType('button').props.disabled,true);
    const count=calls.length;await act(async()=>root.root.findByType('button').props.onClick());assert.equal(calls.length,count);
  } finally {act(()=>root.unmount());}
});

test('anonymous station CTA opens the same account page with the station and topic and makes no write',async()=>{
 const calls=[];const Follow=load('src/components/newsletter/FollowStationButton.tsx',{'next/router':{useRouter:()=>({push:async url=>calls.push(['navigate',url])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({status:'unauthenticated',user:null,openNewsletterAccount:value=>calls.push(['entry',value])})},'@/lib/memberApi':{memberRequest:()=>{throw Error('Must not write before signup');}},'@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr'}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Follow,{stationId:'FR_1',stationName:'La Clusaz',topic:'weather'}));});
 try{await act(async()=>root.root.findByType('button').props.onClick());const url=new URL(calls.at(-1)[1],'https://snow.example');assert.equal(url.pathname,'/mon-compte');assert.equal(url.searchParams.get('station_id'),'FR_1');assert.equal(url.searchParams.get('topic'),'weather');assert.equal(root.root.findAllByType('form').length,0);assert.equal(root.root.findAllByType('dialog').length,0);}finally{act(()=>root.unmount());}
});

test('failed station CTA stays on the station and never announces a saved subscription',async()=>{
 const calls=[];const Follow=load('src/components/newsletter/FollowStationButton.tsx',{'next/router':{useRouter:()=>({push:async()=>calls.push('navigate')})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({status:'authenticated',user:{email:'member@example.com'},openNewsletterAccount:()=>calls.push('notice')})},'@/lib/memberApi':{memberRequest:async()=>{throw Error('Ajout impossible');}},'@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr'}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Follow,{stationId:'FR_1',stationName:'La Clusaz'}));});
 try{await act(async()=>root.root.findByType('button').props.onClick());assert.deepEqual(calls,[]);assert.equal(root.root.findByProps({role:'alert'}).children.join(''),'Ajout impossible');assert.equal(root.root.findByType('button').props.disabled,false);}finally{act(()=>root.unmount());}
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

test('an existing email keeps the station choice in both the account URL and the staged intent for sign-in',async()=>{
 const calls=[];let staged;const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':({children,...props})=>React.createElement('a',props,children),'next/router':{useRouter:()=>({push:async url=>calls.push(url)})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null,openNewsletterAccount(){},stageNewsletterIntent:(intent,email)=>{staged={intent,email};}})},'@/lib/memberApi':{memberRequest:async()=>({status:'already_subscribed'})}}).default;
 const initial={stations:[{station_id:'FR_2',station_name:'Alpe d’Huez',topics:['weather'],weather_frequency:'friday',newsletter_frequency:'weekly'}],consent:true,language:'fr',source:'station_page'};
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
 try{act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'member@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(staged.email,'member@example.com');assert.deepEqual(staged.intent.stations[0].topics,['weather']);const url=new URL(calls[0],'https://snow.example');assert.equal(url.pathname,'/mon-compte');assert.equal(url.searchParams.get('station_id'),'FR_2');assert.equal(url.searchParams.get('topic'),'weather');}finally{act(()=>root.unmount());}
});

test('an already followed station receives accurate feedback after the authenticated request',async()=>{
 let notice;const Follow=load('src/components/newsletter/FollowStationButton.tsx',{'next/router':{useRouter:()=>({push:async()=>{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({status:'authenticated',user:{email:'member@example.com'},stageNewsletterIntent(){},openNewsletterAccount:entry=>{notice=entry.notice;}})},'@/lib/memberApi':{memberRequest:async()=>({already_followed:true})},'@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr'}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Follow,{stationId:'FR_1',stationName:'La Clusaz',topic:'weather'}));});try{await act(async()=>root.root.findByType('button').props.onClick());const feedback=root.root.findByProps({role:'status'}).children.join('');assert.match(feedback,/déjà/);assert.doesNotMatch(feedback,/ajouté/);assert.equal(notice,undefined);}finally{act(()=>root.unmount());}
});
