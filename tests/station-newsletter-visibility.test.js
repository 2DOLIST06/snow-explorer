const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}){
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports','React','fetch',source)(name=>name in mocks?mocks[name]:require(name),mod,mod.exports,React,async()=>({ok:true,json:async()=>null}));
 return mod.exports;
}

test('the actual SSR station projection preserves the canonical id so newsletter buttons render in the hero',async()=>{
 const station={id:'FR_LA_CLUSAZ',name:'La Clusaz',slug:'la-clusaz',is_active:true};
 const page=load('pages/stations/[slug].tsx',{
  '@/lib/api/stationInitialData':{loadStationInitialData:async()=>({})},
  '@/components/stations/StationV3Page':()=>null,
  '@/lib/api/stations':{fetchStationWidgetsConfig:async()=>null},
  '@/lib/api/resorts':{fetchActiveResortsServer:async()=>[],getDepartmentResorts:()=>[]},
  '@/lib/api/stationPage':{getStationApiBase:()=> 'https://api.example',isResortInactive:()=>false,resolveResortRegion:v=>v,loadStationPageSources:async()=>({stationResponse:{ok:true,status:200,json:async()=>station},widgets:{config:null}})},
  '@/lib/stationForfaits':{resolveStationForfaits:()=>({normalizedForfaits:null,forfaits:{enabled:false}})},
  '@/lib/stationPisteMap':{resolveStationPisteMap:()=>({enabled:false})},
 });
 const result=await page.getServerSideProps({params:{slug:'la-clusaz'}});
 assert.equal(result.props.resort.id,station.id);
 const Follow=load('src/components/newsletter/FollowStationButton.tsx',{
  'next/router':{useRouter:()=>({query:{}})},
  '@/contexts/MemberAuthContext':{useMemberAuth:()=>({status:'unauthenticated',user:null})},
  '@/lib/memberApi':{memberRequest:()=>{throw Error('Rendering must not subscribe');}},
  '@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr'},
  '@/lib/newsletter/onboarding':load('src/lib/newsletter/onboarding.ts'),
 }).default;
 const Hero=load('src/components/stations/StationLegacyHero.tsx',{
  'next/image':()=>null,'next/link':({children,...props})=>React.createElement('a',props,children),
  '@/contexts/AdminAuthContext':{useAdminAuth:()=>({status:'unauthenticated'})},
  '@/components/newsletter/FollowStationButton':Follow,
  '@/lib/regions':{regionHref:()=>null},
 }).default;
 const html=renderToStaticMarkup(React.createElement(Hero,{station:result.props.resort}));
 assert.match(html,/Voir les conditions/);
 assert.match(html,/Recevoir les informations de cette station par email/);
 assert.doesNotMatch(html,/<button[^>]*disabled/);
});
