const test = require('node:test'); const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const renderer=require('react-test-renderer');const {act}=renderer;
function load(file,mocks={}){const out=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('require','module','exports','React',out)(name=>{if(name in mocks)return mocks[name];if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts');if(name==='./StationSubscriptionFields')return load('src/components/newsletter/StationSubscriptionFields.tsx');if(name.endsWith('.css'))return {};return require(name);},module,module.exports,React);return module.exports;}
const button=(root,label)=>root.root.findAllByType('button').find(b=>b.props['aria-label']===label||b.children.join('')===label);
const initial={stations:[{station_id:'1',station_name:'Albiez-Montrond',topics:['weather'],weather_frequency:'friday',newsletter_frequency:'weekly'},{station_id:'2',station_name:'Auris-en-Oisans',topics:['resort_updates'],weather_frequency:'friday',newsletter_frequency:'weekly'}],articles:true,consent:true,language:'fr',source:'footer'};

test('each station keeps all its controls directly below its own name before and after saving',async()=>{
 const saves=[];const Form=load('src/components/newsletter/NewsletterIntentForm.tsx',{'./StationSubscriptionPicker':({onAdd})=>React.createElement('button',{type:'button',onClick:()=>onAdd([{id:'3',name:'La Clusaz'}])},'Choisir La Clusaz')}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initial,onSave:async data=>saves.push(data)}));});
 try{
  const station=name=>root.root.findByProps({'aria-label':name});
  assert.equal(station('Albiez-Montrond').findAllByProps({type:'checkbox'}).length,6);
  assert.equal(station('Auris-en-Oisans').findAllByProps({type:'checkbox'}).length,6);
  assert.equal(button(root,'Modifier'),undefined);assert.equal(button(root,'En cours'),undefined);
  const weather=station('Auris-en-Oisans').findByProps({'aria-label':'Météo et enneigement'});
  act(()=>weather.props.onChange({target:{checked:true}}));
  assert.equal(station('Albiez-Montrond').findByProps({'aria-label':'Fréquence météo et neige'}).props.value,'friday');
  act(()=>button(root,'Ajouter des stations').props.onClick());act(()=>button(root,'Choisir La Clusaz').props.onClick());
  assert.deepEqual(root.root.findAllByType('h4').map(h=>h.children.join('')),['Albiez-Montrond','Auris-en-Oisans','La Clusaz']);
  assert.equal(station('La Clusaz').findAllByProps({type:'checkbox'}).length,6);
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.deepEqual(saves[0].stations[1].topics,['resort_updates','weather','snowfall','snow_conditions']);
  assert.equal(station('Auris-en-Oisans').findAllByProps({type:'checkbox'}).length,6);
  act(()=>button(root,'Retirer Auris-en-Oisans').props.onClick());
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(saves[1].stations.map(s=>s.station_id),['1','3']);
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
  assert.equal(cta.children.join(''),'Recevoir la météo et l’enneigement de cette station par email');
 }finally{act(()=>root.unmount());global.window=previous;}
});

test('new signup and active or unsubscribed accounts render the exact same preferences form',async()=>{
 const Fields=load('src/components/newsletter/StationSubscriptionFields.tsx').default;
 const Editor=load('src/components/newsletter/NewsletterIntentForm.tsx',{'./StationSubscriptionPicker':()=>null,'./StationSubscriptionFields':Fields}).default;
 const shape=instance=>({labels:instance.findAllByType('label').map(label=>label.findAllByType('span').map(s=>s.children.join('')).join('')),buttons:instance.findAllByType('button').map(b=>b.children.join('')),checkboxes:instance.findAllByProps({type:'checkbox'}).map(c=>c.props.checked),selects:instance.findAllByType('select').map(s=>s.props.value)});
 let reference;
 for(const status of ['not_subscribed','active','unsubscribed']){
  const Panel=load('src/components/member/MemberNewsletter.tsx',{'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:{id:1,email:'member@example.com'},stageNewsletterIntent(){}})},'../newsletter/NewsletterIntentForm':Editor,'@/lib/memberApi':{memberRequest:async path=>path==='/newsletter/request'?{intent:null}:{data:{status,intent:initial}}}}).default;
  let root;await act(async()=>{root=renderer.create(React.createElement(Panel));});try{if(status==='unsubscribed')act(()=>button(root,'Réactiver mes abonnements').props.onClick());const view=shape(root.root.findByType(Editor));if(reference)assert.deepEqual(view,reference);else reference=view;assert.equal(root.root.findAllByType(Editor).length,1);}finally{act(()=>root.unmount());}
 }
 const signup={email:'new@example.com',intent:initial,draftToken:'new-signup-only',status:'active',expiresAt:Date.now()+900000};
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null,openNewsletterAccount(){}})},'../newsletter/NewsletterIntentForm':Editor,'@/lib/memberApi':{memberRequest:async()=>{throw Error('No account fetch before authentication');}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Panel,{signup}));});try{assert.deepEqual(shape(root.root.findByType(Editor)),reference);assert.equal(root.root.findAllByType(Editor).length,1);}finally{act(()=>root.unmount());}
});

test('weather observations forecasts and avalanche share one subscription CTA outside the tabs',()=>{
 const tabs=fs.readFileSync(path.join(__dirname,'../src/components/weather/StationWeatherTabs.tsx'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'../src/components/stations/StationV3Page.tsx'),'utf8');
 const weather=page.slice(page.indexOf('export function Weather('),page.indexOf('export function Webcams('));
 assert.doesNotMatch(tabs,/FollowStationButton|Recevoir les informations d’enneigement|Recevoir les prévisions de neige/);
 assert.equal((weather.match(/<FollowStationButton /g)||[]).length,1);
 assert.match(weather,/topic="weather" label="Recevoir la météo et l’enneigement de cette station par email"/);
 assert.ok(weather.indexOf('<FollowStationButton ')<weather.indexOf('<StationWeatherTabs '));
});

test('grouped weather controls enable and disable all weather and snow preferences together',async()=>{
 const Fields=load('src/components/newsletter/StationSubscriptionFields.tsx').default;let current={...initial.stations[0],topics:[]};
 function Harness(){const [value,setValue]=React.useState(current);current=value;return React.createElement(Fields,{value,onChange:setValue,fr:true});}
 let root;await act(async()=>{root=renderer.create(React.createElement(Harness));});try{act(()=>root.root.findByProps({'aria-label':'Météo et enneigement'}).props.onChange({target:{checked:true}}));assert.deepEqual(current.topics,['weather','snowfall','snow_conditions']);act(()=>root.root.findByProps({'aria-label':'Météo et enneigement'}).props.onChange({target:{checked:false}}));assert.deepEqual(current.topics,[]);}finally{act(()=>root.unmount());}
});

test('a failed save retains each station and its visible unsaved settings',async()=>{
 const Form=load('src/components/newsletter/NewsletterIntentForm.tsx',{'./StationSubscriptionPicker':()=>null}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initial,onSave:async()=>{throw Error('Enregistrement impossible');}}));});try{
  const station=root.root.findByProps({'aria-label':'Albiez-Montrond'});
  act(()=>station.findByProps({'aria-label':'Fréquence météo et neige'}).props.onChange({target:{value:'daily'}}));
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(root.root.findByProps({'aria-label':'Albiez-Montrond'}).findByProps({'aria-label':'Fréquence météo et neige'}).props.value,'daily');
  assert.equal(root.root.findAllByType('h4').length,2);assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Enregistrement impossible/);
 }finally{act(()=>root.unmount());}
});
