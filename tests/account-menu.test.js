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
const Link = ({children,...props}) => React.createElement('a',props,children);
const button = (root, text) => root.root.findAllByType('button').find(b => b.children.join('') === text);
function fixture(initial = 'unauthenticated', request = async () => ({})) {
  const calls=[]; let status=initial;
  const Menu=load('src/components/layout/AccountMenu.tsx', {
    'next/link':Link, './AccountMenu.module.css':{menu:'menu',form:'form',error:'error',wrap:'wrap'},
    '@/contexts/AdminAuthContext':{useAdminAuth:()=>({status,user:status==='authenticated'?{email:'admin@example.com'}:null,login:async(...args)=>calls.push(['login',...args]),logout:async()=>calls.push(['logout'])})},
    '@/lib/adminRecovery':{recoveryRequest:async(...args)=>{calls.push(['recovery',...args]);return request(...args);}},
  }).default;
  let root; act(()=>{root=renderer.create(React.createElement(Menu,{onClose:()=>calls.push(['close'])}));});
  return {root,calls,update:value=>{status=value;act(()=>root.update(React.createElement(Menu,{onClose:()=>calls.push(['close'])})));}};
}
test('anonymous header account menu logs in with entered credentials and only then shows a real account link',async()=>{
  const {root,calls,update}=fixture();
  try {
    assert.equal(root.root.findAllByType('a').length,0);
    act(()=>root.root.findByProps({id:'header-account-email'}).props.onChange({target:{value:' admin@example.com '}}));
    act(()=>root.root.findByProps({id:'header-account-password'}).props.onChange({target:{value:'my password'}}));
    await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
    assert.deepEqual(calls,[['login','admin@example.com','my password'],['close']]);
    update('authenticated');
    assert.equal(root.root.findAllByType('form').length,0);
    assert.equal(root.root.findByType('a').props.href,'/admin/account');
    assert.ok(button(root,'Se déconnecter'));
  } finally {act(()=>root.unmount());}
});
test('forgotten password in the public menu sends an email link and displays unknown-address errors',async()=>{
  const {root,calls}=fixture('unauthenticated',async()=>{throw new Error('Aucun compte avec cette adresse e-mail.');});
  try {
    act(()=>button(root,'Mot de passe oublié ? Recevoir un lien de connexion').props.onClick());
    assert.equal(root.root.findAllByProps({type:'password'}).length,0);
    act(()=>root.root.findByProps({id:'header-account-email'}).props.onChange({target:{value:'missing@example.com'}}));
    await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
    assert.deepEqual(calls,[['recovery','login-link',{email:'missing@example.com'}]]);
    assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Aucun compte/);
    assert.equal(root.root.findAllByType('a').length,0);
  } finally {act(()=>root.unmount());}
});
test('successful recovery displays confirmation; loading never exposes an account link',async()=>{
  const {root}=fixture();
  try {
    act(()=>button(root,'Mot de passe oublié ? Recevoir un lien de connexion').props.onClick());
    act(()=>root.root.findByProps({id:'header-account-email'}).props.onChange({target:{value:'admin@example.com'}}));
    await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
    assert.match(root.root.findByProps({role:'status'}).children.join(''),/Un lien de connexion a été envoyé/);
  } finally {act(()=>root.unmount());}
  const loading=fixture('loading');
  try {assert.equal(loading.root.root.findAllByType('a').length,0);assert.equal(loading.root.root.findAllByType('form').length,0);}
  finally {act(()=>loading.root.unmount());}
});
test('public header and pages both receive the authentication provider and old account URL redirects',async()=>{
  const Context=React.createContext(false);
  const Provider=({children})=>React.createElement(Context.Provider,{value:true},children);
  const Header=()=>{assert.equal(React.useContext(Context),true);return React.createElement('header');};
  const Page=()=>{assert.equal(React.useContext(Context),true);return React.createElement('main');};
  const passthrough=({children})=>React.createElement(React.Fragment,null,children);
  const App=load('pages/_app.tsx',{
    '@/contexts/CookiePreferencesContext':{CookiePreferencesProvider:passthrough},
    '@/components/layout/Footer':()=>null,'@/components/layout/ProHeader':Header,'@/styles/globals.css':{},
    'next/router':{useRouter:()=>({pathname:'/'})},'@/contexts/AdminAuthContext':{AdminAuthProvider:Provider,AdminRoute:passthrough},'@/components/admin/AdminBar':()=>null,
  }).default;
  let root;act(()=>{root=renderer.create(React.createElement(App,{Component:Page,pageProps:{}}));});act(()=>root.unmount());
  const redirect=load('pages/mon-compte.tsx',{});
  assert.deepEqual(await redirect.getServerSideProps(),{redirect:{destination:'/admin/account',permanent:false}});
});
