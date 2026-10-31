const test = require('node:test'); const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const renderer=require('react-test-renderer');const {act}=renderer;
function load(file,mocks={}){const out=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('require','module','exports','React',out)(name=>{if(name in mocks)return mocks[name];if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts');if(name==='./StationSubscriptionFields')return load('src/components/newsletter/StationSubscriptionFields.tsx');if(name.endsWith('.css'))return {};return require(name);},module,module.exports,React);return module.exports;}
const button=(root,label)=>root.root.findAllByType('button').find(b=>b.props['aria-label']===label||b.children.join('')===label);
const initial={stations:[{station_id:'1',station_name:'Albiez-Montrond',topics:['weather'],weather_frequency:'friday',newsletter_frequency:'weekly'},{station_id:'2',station_name:'Auris-en-Oisans',topics:['resort_updates'],weather_frequency:'friday',newsletter_frequency:'weekly'}],articles:true,consent:true,language:'fr',source:'footer'};

test('optional preferences show one named editor and the picker closes after one station choice',async()=>{
 const saves=[];const Form=load('src/components/newsletter/NewsletterIntentForm.tsx',{'./StationSubscriptionPicker':({onPick})=>React.createElement('button',{type:'button',onClick:()=>onPick({id:'3',name:'La Clusaz'})},'Choisir La Clusaz')}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initial,onSave:async data=>saves.push(data)}));});
 try{
  assert.equal(root.root.findAllByType('input').length,9); // General articles + eight topics, regardless of station count.
  assert.equal(root.root.findAllByType('h4').at(-1).children.join(''),'Albiez-Montrond');
  act(()=>button(root,'Modifier Auris-en-Oisans').props.onClick());
  assert.equal(root.root.findAllByType('h4').at(-1).children.join(''),'Auris-en-Oisans');
  assert.equal(root.root.findAllByType('input').length,9);
  act(()=>button(root,'+ Ajouter une station').props.onClick());
  assert.equal(root.root.findAllByType('input').length,1); // No editor behind the picker.
  act(()=>button(root,'Choisir La Clusaz').props.onClick());
  assert.equal(button(root,'Choisir La Clusaz'),undefined);
  assert.equal(root.root.findAllByType('h4').at(-1).children.join(''),'La Clusaz');
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.match(root.root.findByProps({role:'alert'}).children.join(''),/La Clusaz/);assert.equal(saves.length,0);
  const weather=root.root.findAllByType('label').find(l=>l.findAllByType('span').some(s=>s.children.join('')==='Météo')).findByType('input');
  act(()=>weather.props.onChange({target:{checked:true}}));
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(saves[0].stations.length,3);assert.deepEqual(saves[0].stations[2].topics,['weather']);
  assert.equal(root.root.findAllByType('input').length,1);
  act(()=>button(root,'Retirer Auris-en-Oisans').props.onClick());
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.deepEqual(saves[1].stations.map(s=>s.station_id),['1','3']);
 }finally{act(()=>root.unmount());}
});

test('already subscribed email is acknowledged without restarting preferences or sending a login link',async()=>{
 const calls=[];const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/router':{useRouter:()=>({})},'next/link':({children,...p})=>React.createElement('a',p,children),'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'already_subscribed'}}},'./NewsletterIntentForm':()=>{throw Error('Duplicate must not open onboarding')}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial:{...initial,stations:[]}}));});
 try{
  assert.equal(root.root.findAllByType('input').length,1);
  act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'same@example.com'}}));
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.match(root.root.findByProps({role:'status'}).children.join(''),/déjà inscrite/);
  assert.deepEqual(calls.map(c=>c[0]),['/newsletter/start']);
  await act(async()=>button(root,'Recevoir un lien pour gérer mes abonnements').props.onClick());
  assert.deepEqual(calls.map(c=>c[0]),['/newsletter/start','/newsletter/login-link']);
 }finally{act(()=>root.unmount());}
});

test('weather directory exposes email subscription for the currently selected station above its weather',async()=>{
 const previous=global.window;global.window={matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>fn()};
 const page=load('pages/meteo.tsx',{'next/head':({children})=>React.createElement(React.Fragment,null,children),'next/link':({children,...p})=>React.createElement('a',p,children),'@/lib/stationName':{stationNameAt:n=>'à '+n},'@/lib/stationAutomaticData':{parseCoordinate:n=>n??null},'@/lib/api/resorts':{},'@/lib/searchNormalization':require('../src/lib/searchNormalization'),'@/components/weather/StationWeather':()=>React.createElement('div',{'data-weather':true}),'@/components/newsletter/FollowStationButton':props=>React.createElement('button',{'data-subscription':true,...props},props.label)}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(page,{initialStations:[{id:'1',slug:'la-clusaz',name:'La Clusaz'},{id:'2',slug:'alpe-d-huez',name:'Alpe d’Huez'}]}));});
 try{
  assert.equal(root.root.findAllByProps({'data-subscription':true}).length,0);
  act(()=>root.root.findAllByProps({role:'option'})[1].props.onClick());
  const cta=root.root.findByProps({'data-subscription':true});
  assert.equal(cta.props.stationId,'2');assert.equal(cta.props.topic,'weather');
  assert.equal(cta.children.join(''),'Recevoir la météo de cette station');
 }finally{act(()=>root.unmount());global.window=previous;}
});
