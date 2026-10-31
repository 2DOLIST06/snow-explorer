const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const React=require('react');const renderer=require('react-test-renderer');const {act}=renderer;
function load(file,mocks={}){const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('require','module','exports','React',compiled)(name=>{if(name in mocks)return mocks[name];if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts');if(name.endsWith('.module.css'))return {};if(name==='./StationSearch')return load('src/components/newsletter/StationSearch.tsx',mocks);if(name==='@/lib/newsletter/i18n')return {translator:()=>key=>key};if(name==='@/lib/api/newsletter')return {newsletterApi:{listStations:async()=>[{id:'1',name:'La Clusaz',slug:'la-clusaz'},{id:'2',name:'Alpe d’Huez',slug:'alpe-d-huez'},{id:'3',name:'Méribel',slug:'meribel'}]}};if(name==='@/lib/searchNormalization')return require('../src/lib/searchNormalization');if(name.startsWith('./StationSubscription'))return load('src/components/newsletter/'+name.slice(2)+'.tsx',mocks);return require(name);},module,module.exports,React);return module.exports;}

const button=(root,text)=>root.root.findAllByType('button').find(b=>b.children.join('')===text||b.props['aria-label']===text);
test('one dropdown lists stations immediately and keeps multiple checkboxes selected across searches',async()=>{
 const added=[];const Picker=load('src/components/newsletter/StationSubscriptionPicker.tsx').default;let root;await act(async()=>{root=renderer.create(React.createElement(Picker,{followedIds:new Set(),fr:true,maxSelections:20,onAdd:rows=>added.push(rows),onClose(){}}));});try{
  assert.equal(root.root.findAllByProps({type:'checkbox'}).length,3);
  act(()=>root.root.findAllByProps({type:'checkbox'})[0].props.onChange({target:{checked:true}}));
  act(()=>root.root.findByProps({type:'search'}).props.onChange({target:{value:'meri'}}));
  assert.equal(root.root.findAllByProps({type:'checkbox'}).length,1);
  act(()=>root.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));
  act(()=>root.root.findByProps({type:'search'}).props.onChange({target:{value:''}}));
  assert.equal(root.root.findAllByProps({type:'checkbox'}).filter(c=>c.props.checked).length,2);
  act(()=>button(root,'Ajouter les stations sélectionnées').props.onClick());
  assert.deepEqual(added[0].map(s=>s.id),['2','3']);
 }finally{act(()=>root.unmount());}
});
test('batch addition uses one editor with one settings panel and one save for all choices',async()=>{
 const saves=[];const Form=load('src/components/newsletter/NewsletterIntentForm.tsx').default;let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initial:{stations:[],articles:true,consent:true,language:'fr',source:'footer'},onSave:async value=>saves.push(value)}));});try{
  await act(async()=>button(root,'+ Ajouter une station').props.onClick());
  assert.equal(button(root,'Enregistrer mes choix').props.disabled,true);
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(saves.length,0);
  const boxes=root.root.findAllByProps({type:'checkbox'}).slice(1);act(()=>{boxes[0].props.onChange({target:{checked:true}});});act(()=>{boxes[1].props.onChange({target:{checked:true}});});
  act(()=>button(root,'Ajouter les stations sélectionnées').props.onClick());
  assert.equal(root.root.findAllByProps({type:'search'}).length,0);assert.equal(root.root.findAllByProps({type:'checkbox'}).length,9);
  assert.equal(root.root.findAllByType('h4').at(-1).children.join(''),'Alpe d’Huez');
  act(()=>button(root,'Modifier La Clusaz').props.onClick());assert.equal(root.root.findAllByProps({type:'checkbox'}).length,9);
  act(()=>root.root.findByProps({'aria-label':'Fréquence des articles et guides'}).props.onChange({target:{value:'monthly'}}));
  await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(saves.length,1);assert.equal(saves[0].stations.length,2);assert.equal(saves[0].newsletter_frequency,'monthly');
 }finally{act(()=>root.unmount());}
});
test('merging a station button choice retains the existing stations and frequencies',()=>{
 const {mergeNewsletterChoice}=load('src/lib/newsletter/onboarding.ts');const old={stations:[{station_id:'1',station_name:'La Clusaz',topics:['weather'],weather_frequency:'daily',newsletter_frequency:'monthly'}],articles:false,consent:true,language:'fr',source:'member-account'};
 const next=mergeNewsletterChoice(old,{stations:[{station_id:'2',station_name:'Alpe d’Huez',topics:['snowfall'],weather_frequency:'friday',newsletter_frequency:'weekly'}],consent:true,language:'fr',source:'station_page'});
 assert.equal(next.stations.length,2);assert.equal(next.stations[0].weather_frequency,'daily');assert.equal(next.articles,false);assert.equal(old.stations.length,1);
});
test('station picker lists all stations immediately and keeps checked selections across filters',async()=>{
 const all=Array.from({length:30},(_,i)=>({id:String(i),name:'Val A'+i,slug:'val-a'+i}));all.push({id:'thorens',name:'Val Thorens',slug:'val-thorens'},{id:'meribel',name:'Méribel',slug:'meribel'});
 let loads=0;let selected=[];const Picker=load('src/components/newsletter/StationSearch.tsx',{'@/lib/api/newsletter':{newsletterApi:{listStations:async()=>{loads++;return all;}}},'@/lib/searchNormalization':require('../src/lib/searchNormalization'),'./StationNewsletterEditor.module.css':{}}).default;
 const followedIds=new Set(['0']);function Harness(){const [value,setValue]=React.useState([]);selected=value;return React.createElement(Picker,{followedIds,selected:value,onChange:setValue,t:key=>key});}
 let root;await act(async()=>{root=renderer.create(React.createElement(Harness));});try{
 const boxes=()=>root.root.findAllByProps({type:'checkbox'});const search=()=>root.root.findByProps({type:'search'});const label=name=>root.root.findAllByType('label').find(item=>item.findAllByType('span').some(span=>span.children.join('')===name));
 assert.equal(boxes().length,31);assert.equal(loads,1);
 act(()=>search().props.onChange({target:{value:'Val'}}));assert.equal(boxes().length,30);assert.ok(label('Val Thorens'));
 act(()=>label('Val Thorens').findByType('input').props.onChange({target:{checked:true}}));
 act(()=>search().props.onChange({target:{value:'meri'}}));assert.equal(boxes().length,1);
 act(()=>label('Méribel').findByType('input').props.onChange({target:{checked:true}}));assert.equal(selected.length,2);
 act(()=>search().props.onChange({target:{value:'v'}}));assert.equal(label('Val Thorens').findByType('input').props.checked,true);
 act(()=>label('Val Thorens').findByType('input').props.onChange({target:{checked:false}}));assert.deepEqual(selected.map(item=>item.id),['meribel']);
 act(()=>search().props.onChange({target:{value:''}}));assert.equal(boxes().length,31);assert.equal(label('Méribel').findByType('input').props.checked,true);assert.equal(loads,1);
 }finally{act(()=>root.unmount());}
});

test('newsletter catalogue requests every active resort without an autocomplete limit',async()=>{
 const previous=global.fetch;const calls=[];global.fetch=async(url)=>{calls.push(url);return {ok:true,json:async()=>[{id:'1',name:'Val Thorens',slug:'val-thorens',is_active:true},{id:'2',name:'Hidden',slug:'hidden',is_active:false},{id:'3',name:'No slug',slug:' ',is_active:true}]};};
 try{const {newsletterApi}=load('src/lib/api/newsletter.ts',{'@/lib/adminApi':{ADMIN_API_BASE:'https://api.example.test'}});assert.deepEqual(await newsletterApi.listStations(),[{id:'1',name:'Val Thorens',slug:'val-thorens'}]);assert.deepEqual(calls,['https://api.example.test/api/resorts/?active=true']);}finally{global.fetch=previous;}
});
