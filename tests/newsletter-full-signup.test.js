const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),renderer=require('react-test-renderer');
const {act}=renderer;
function load(file,mocks={}){const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const mod={exports:{}};new Function('require','module','exports','React',source)(name=>{if(name in mocks)return mocks[name];if(name.endsWith('.css'))return {};if(name==='next/link')return ({children,...props})=>React.createElement('a',props,children);if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts',mocks);if(name==='./NewsletterIntentForm'||name==='./StationSubscriptionFields'||name==='./StationSubscriptionPicker'||name==='./StationSearch')return load('src/components/newsletter/'+name.slice(2)+'.tsx',mocks);if(name==='@/lib/searchNormalization')return require('../src/lib/searchNormalization');if(name==='@/lib/newsletter/i18n')return {translator:()=>key=>key};if(name==='@/lib/api/newsletter')return {newsletterApi:{listStations:async()=>[{id:'1',name:'Bonneval-sur-Arc',slug:'bonneval-sur-arc'},{id:'2',name:'La Clusaz',slug:'la-clusaz'}]}};return require(name);},mod,mod.exports,React);return mod.exports;}
const initial={stations:[{station_id:'1',station_name:'Bonneval-sur-Arc',topics:['resort_updates'],weather_frequency:'friday',newsletter_frequency:'weekly'}],consent:true,language:'fr',source:'station_page'};
const button=(root,label)=>root.root.findAllByType('button').find(b=>b.children.join('')===label);

test('before subscribing the visitor sees the shared editor, changes the preselected station and adds another station in one signup',async()=>{
 const calls=[];let entry;
 const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/router':{useRouter:()=>({push:async url=>calls.push(['navigate',url])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null,openNewsletterAccount:value=>{entry=value;}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'active',draft_token:'limited',intent:args[1].intent};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial,fullPreferences:true}));});try{
  assert.equal(root.root.findAllByType('form').length,1);assert.equal(root.root.findByProps({type:'email'}).props.required,true);
  const first=root.root.findByProps({'aria-label':'Bonneval-sur-Arc'});
  const updates=first.findAllByType('label').find(l=>l.findAllByType('span').some(s=>s.children.join('')==='Actualités de la station')).findByType('input');
  assert.equal(updates.props.checked,true);assert.equal(first.findByProps({'aria-label':'Météo et enneigement'}).props.checked,false);
  act(()=>first.findByProps({'aria-label':'Météo et enneigement'}).props.onChange({target:{checked:true}}));
  act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'new@example.com'}}));
  await act(async()=>button(root,'Ajouter des stations').props.onClick());
  const search=root.root.findAllByProps({type:'checkbox'}).find(i=>i.props.checked===false&&i.parent.findAllByType('span').some(s=>s.children.join('')==='La Clusaz'));
  act(()=>search.props.onChange({target:{checked:true}}));act(()=>button(root,'Ajouter les stations sélectionnées').props.onClick());
  const second=root.root.findByProps({'aria-label':'La Clusaz'});act(()=>second.findByProps({'aria-label':'Météo et enneigement'}).props.onChange({target:{checked:true}}));
  assert.equal(calls.length,0);assert.equal(root.root.findAllByType('form').length,1);
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(calls[0][0],'/newsletter/start');assert.equal(calls[0][1].email,'new@example.com');const selection=calls[0][1].intent;
  assert.equal(selection.stations.length,2);assert.deepEqual(selection.stations[0].topics,['resort_updates','weather','snowfall','snow_conditions']);assert.deepEqual(selection.stations[1].topics,['weather','snowfall','snow_conditions']);assert.equal(selection.consent,true);assert.equal(entry.intent.stations.length,2);assert.equal(calls.filter(c=>c[0]==='/newsletter/start').length,1);
 }finally{act(()=>root.unmount());}
});

test('signup errors keep the email and the edited preferences visible in the same form',async()=>{
 const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/router':{useRouter:()=>({push:async()=>{throw Error('must not navigate')}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null})},'@/lib/memberApi':{memberRequest:async()=>{throw Error('Serveur indisponible');}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial,fullPreferences:true}));});try{act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'new@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(root.root.findByProps({type:'email'}).props.value,'new@example.com');assert.equal(root.root.findAllByType('form').length,1);assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Serveur indisponible/);assert.ok(button(root,'Ajouter des stations'));}finally{act(()=>root.unmount());}
});

test('an existing address receives a sign-in link carrying the complete prepared selection',async()=>{
 const calls=[];const intent={...initial,stations:[...initial.stations,{...initial.stations[0],station_id:'2',station_name:'La Clusaz'}]};
 const Form=load('src/components/member/MemberAuthForm.tsx',{'next/router':{useRouter:()=>({query:{station_id:'1',station_name:'Bonneval-sur-Arc',topic:'resort_updates'}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({login(){}})},'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initialEmail:'existing@example.com',newsletterRequest:intent}));});try{await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls[0][0],'/newsletter/login-link');assert.equal(calls[0][1].intent.stations.length,2);assert.equal(calls[0][1].email,'existing@example.com');}finally{act(()=>root.unmount());}
});
