const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),renderer=require('react-test-renderer');
const {act}=renderer;
function load(file,mocks={}){const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const mod={exports:{}};new Function('require','module','exports','React',source)(name=>{if(name in mocks)return mocks[name];if(name.endsWith('.css'))return {};if(name==='next/link')return ({children,...props})=>React.createElement('a',props,children);if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts',mocks);if(name==='../newsletter/NewsletterIntentForm')return load('src/components/newsletter/NewsletterIntentForm.tsx',mocks);if(name==='./NewsletterIntentForm'||name==='./StationSubscriptionFields'||name==='./StationSubscriptionPicker'||name==='./StationSearch')return load('src/components/newsletter/'+name.slice(2)+'.tsx',mocks);if(name==='@/lib/searchNormalization')return require('../src/lib/searchNormalization');if(name==='@/lib/newsletter/i18n')return {translator:()=>key=>key};if(name==='@/lib/api/newsletter')return {newsletterApi:{listStations:async()=>[{id:'1',name:'Bonneval-sur-Arc',slug:'bonneval-sur-arc'},{id:'2',name:'La Clusaz',slug:'la-clusaz'}]}};return require(name);},mod,mod.exports,React);return mod.exports;}
const initial={stations:[{station_id:'1',station_name:'Bonneval-sur-Arc',topics:['resort_updates'],weather_frequency:'friday',newsletter_frequency:'weekly'}],consent:true,language:'fr',source:'station_page'};
const button=(root,label)=>root.root.findAllByType('button').find(b=>b.children.join('')===label);

test('email validation subscribes first then reveals the same account editor with the requested topic selected',async()=>{
 const calls=[];let auth;const newUser={id:42,email:'new@example.com',password_set:false};let saved=initial;
 const router={query:{station_id:'1',station_name:'Bonneval-sur-Arc',topic:'resort_updates'},push:async url=>calls.push(['navigate',url]),replace:async()=>{}};
 const mocks={'next/router':{useRouter:()=>router},'next/head':({children})=>React.createElement(React.Fragment,null,children),'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);if(args[0]==='/newsletter/start'){saved=args[1].intent;return {status:'active',authenticated:true,user:newUser,csrf_token:'csrf',intent:saved};}if(args[0]==='/newsletter/settings'){if(args[1])saved=args[1].intent;return {data:{status:'active',intent:saved}};}return {};}}};
 mocks['@/components/newsletter/NewsletterEnrollment']=load('src/components/newsletter/NewsletterEnrollment.tsx',mocks).default;
 mocks['@/components/member/MemberNewsletter']=load('src/components/member/MemberNewsletter.tsx',mocks).default;
 mocks['@/components/member/MemberAuthForm']=()=>null;
 const Page=load('pages/mon-compte.tsx',mocks).default;
 function Harness(){const [entry,setEntry]=React.useState(null);const [user,setUser]=React.useState(null);auth={status:user?'authenticated':'unauthenticated',user,completeSignup:setUser,newsletterEntry:entry,openNewsletterAccount:setEntry,stageNewsletterIntent(){}};return React.createElement(Page);}
 let root;await act(async()=>{root=renderer.create(React.createElement(Harness));});try{
  assert.equal(root.root.findAllByType('form').length,1);assert.equal(root.root.findByProps({type:'email'}).props.required,true);
  assert.equal(root.root.findAllByProps({type:'checkbox'}).length,0);assert.equal(root.root.findAllByType('select').length,0);assert.equal(button(root,'Ajouter des stations'),undefined);assert.ok(button(root,'Valider'));
  assert.ok(root.root.findAllByType('a').some(a=>a.children.join('')==='Déjà un compte ? Se connecter'));
  act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'new@example.com'}}));
  assert.equal(root.root.findAllByProps({type:'checkbox'}).length,0);
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(calls[0][0],'/newsletter/start');assert.equal(calls[0][1].email,'new@example.com');assert.deepEqual(calls[0][1].intent.stations[0].topics,['resort_updates']);assert.equal(calls.filter(c=>c[0]==='/newsletter/start').length,1);
  assert.deepEqual(auth.user,newUser);assert.equal(auth.status,'authenticated');assert.ok(calls.some(c=>c[0]==='/newsletter/settings'&&!c[1]));assert.equal(calls.some(c=>c[0]==='/newsletter/draft'),false);
  const first=root.root.findByProps({'aria-label':'Bonneval-sur-Arc'});
  const updates=first.findAllByType('label').find(l=>l.findAllByType('span').some(span=>span.children.join('')==='Actualités de la station')).findByType('input');assert.equal(updates.props.checked,true);
  assert.equal(first.findByProps({'aria-label':'Météo et enneigement'}).props.checked,false);
  const order=root.root.findAllByType('button').map(b=>b.props['aria-label']||b.children.join(''));assert.ok(order.indexOf('Retirer Bonneval-sur-Arc')<order.indexOf('Ajouter des stations'));
  act(()=>first.findByProps({'aria-label':'Météo et enneigement'}).props.onChange({target:{checked:true}}));
  await act(async()=>button(root,'Ajouter des stations').props.onClick());
  const search=root.root.findAllByProps({type:'checkbox'}).find(i=>i.props.checked===false&&i.parent.findAllByType('span').some(span=>span.children.join('')==='La Clusaz'));
  act(()=>search.props.onChange({target:{checked:true}}));act(()=>button(root,'Ajouter les stations sélectionnées').props.onClick());
  assert.equal(root.root.findAllByType('h4').length,2);
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  const save=calls.find(c=>c[0]==='/newsletter/settings'&&c[1]);assert.ok(save);assert.equal(save[2],true);assert.equal(save[1].intent.stations.length,2);assert.ok(save[1].intent.stations[0].topics.includes('weather'));assert.equal(calls.filter(c=>c[0]==='/newsletter/start').length,1);
 }finally{act(()=>root.unmount());}
});

test('failed email validation keeps preferences hidden and preserves the email for retry',async()=>{
 const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/router':{useRouter:()=>({push:async()=>{throw Error('must not navigate')}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null})},'@/lib/memberApi':{memberRequest:async()=>{throw Error('Serveur indisponible');}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial,fullPreferences:true}));});try{act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'new@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(root.root.findByProps({type:'email'}).props.value,'new@example.com');assert.equal(root.root.findAllByType('form').length,1);assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Serveur indisponible/);assert.equal(button(root,'Ajouter des stations'),undefined);assert.equal(root.root.findAllByProps({type:'checkbox'}).length,0);}finally{act(()=>root.unmount());}
});

test('an existing address receives a sign-in link carrying the complete prepared selection',async()=>{
 const calls=[];const intent={...initial,stations:[...initial.stations,{...initial.stations[0],station_id:'2',station_name:'La Clusaz'}]};
 const Form=load('src/components/member/MemberAuthForm.tsx',{'next/router':{useRouter:()=>({query:{station_id:'1',station_name:'Bonneval-sur-Arc',topic:'resort_updates'}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({login(){}})},'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initialEmail:'existing@example.com',newsletterRequest:intent}));});try{await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls[0][0],'/newsletter/login-link');assert.equal(calls[0][1].intent.stations.length,2);assert.equal(calls[0][1].email,'existing@example.com');}finally{act(()=>root.unmount());}
});
