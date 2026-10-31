const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),renderer=require('react-test-renderer');
const {act}=renderer;
function load(file,mocks={}){const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const mod={exports:{}};new Function('require','module','exports','React',source)(name=>{if(name in mocks)return mocks[name];if(name==='./NewsletterIntentForm')return ()=>null;if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts');if(name.endsWith('.css'))return {};return require(name);},mod,mod.exports,React);return mod.exports;}
const Link=({children,...props})=>React.createElement('a',props,children);
const Head=({children})=>React.createElement(React.Fragment,null,children);
const button=(root,text)=>root.root.findAllByType('button').find(item=>item.children.join('')===text);
const initial={stations:[],articles:true,consent:false,language:'fr',source:'footer'};
class ApiError extends Error{constructor(code){super(code);this.code=code;}}

test('existing email opens the account without requesting a login email or exposing saved preferences',async()=>{
 const calls=[];let entry;const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':Link,'next/router':{useRouter:()=>({push:async url=>calls.push(['navigate',url])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null,stageNewsletterIntent(){},openNewsletterAccount:value=>{entry=value;}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'already_subscribed'}}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
 try{act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'first@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(entry.email,'first@example.com');assert.equal(entry.draftToken,null);assert.equal(entry.status,'already_subscribed');assert.deepEqual(calls.map(c=>c[0]),['/newsletter/start','navigate']);assert.equal(calls[1][1],'/mon-compte');}finally{act(()=>root.unmount());}
});

test('a connected person can subscribe another email and reach its account page without changing their authenticated identity',async()=>{
 const calls=[];let entry;const user={email:'owner@example.com'};const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':Link,'next/router':{useRouter:()=>({push:async url=>calls.push(['navigate',url])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user,logout:()=>{throw Error('must not logout')},openNewsletterAccount:value=>{entry=value;}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'active',draft_token:'limited'}}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
 try{act(()=>button(root,'Utiliser une autre adresse email').props.onClick());act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'other@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls[0][0],'/newsletter/start');assert.equal(entry.email,'other@example.com');assert.equal(calls[1][1],'/mon-compte');assert.equal(user.email,'owner@example.com');}finally{act(()=>root.unmount());}
});

async function mountLink(request){const calls=[];const previous=global.window;global.window={location:{hash:'#'+'a'.repeat(64)+'~resend-capability',pathname:'/connexion/lien'},history:{replaceState:()=>calls.push(['clear'])}};const Page=load('pages/connexion/lien.tsx',{'next/head':Head,'next/link':Link,'next/router':{useRouter:()=>({replace:async url=>calls.push(['navigate',url])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({refresh:async()=>({email:'member@example.com'}),stageNewsletterIntent:()=>{}})},'@/lib/memberApi':{MemberApiError:ApiError,memberRequest:async(...args)=>{calls.push(args);return request(...args)}}}).default;let root;await act(async()=>{root=renderer.create(React.createElement(Page));});return {root,calls,close(){act(()=>root.unmount());global.window=previous;}};}

test('expired link button sends a new email on the same page and reports only confirmed success',async()=>{
 const f=await mountLink(async p=>{if(p==='/login-link/consume')throw new ApiError('invalid_or_expired_link');return {ok:true}});
 try{assert.deepEqual(f.calls,[['clear']]);await act(async()=>button(f.root,'Me connecter').props.onClick());assert.equal(f.root.root.findAllByProps({role:'status'}).length,0);await act(async()=>button(f.root,'Recevoir un nouveau lien').props.onClick());assert.deepEqual(f.calls.map(c=>c[0]),['clear','/login-link/consume','/login-link/resend']);assert.match(f.root.root.findByProps({role:'status'}).children.join(''),/a été envoyé/);assert.equal(f.calls.some(c=>c[0]==='navigate'),false);}finally{f.close();}
});

test('failed email resend shows an error without claiming that a message was sent',async()=>{
 const f=await mountLink(async()=>{throw new ApiError('email_delivery_failed')});
 try{await act(async()=>button(f.root,'Recevoir un nouveau lien').props.onClick());assert.equal(f.root.root.findAllByProps({role:'status'}).length,0);assert.match(f.root.root.findByProps({role:'alert'}).children.join(''),/email_delivery_failed/);}finally{f.close();}
});

test('an unidentifiable old link asks for an email then sends the link without another redirect',async()=>{
 const f=await mountLink(async p=>{if(p==='/login-link/resend')throw new ApiError('resend_email_required');return {ok:true}});
 try{await act(async()=>button(f.root,'Recevoir un nouveau lien').props.onClick());assert.equal(f.root.root.findAllByProps({role:'status'}).length,0);act(()=>f.root.root.findByProps({type:'email'}).props.onChange({target:{value:'member@example.com'}}));await act(async()=>f.root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(f.calls.at(-1),['/login-link',{email:'member@example.com'}]);assert.match(f.root.root.findByProps({role:'status'}).children.join(''),/a été envoyé/);}finally{f.close();}
});

test('old newsletter preference page points to the shared account and keeps unsubscribe separate',async()=>{
 const calls=[];const Page=load('src/components/newsletter/NewsletterPreferences.tsx',{'next/head':Head,'next/link':Link,'next/router':{useRouter:()=>({query:{}})},'@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr',translator:()=>key=>key},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {ok:true}}},'@/lib/api/newsletter':{newsletterApi:{preferences:async()=>({status:'active',unsubscribed:false})},NewsletterApiError:ApiError}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Page,{token:'legacy-newsletter-token'}));});
 try{assert.equal(root.root.findAllByType('select').length,0);await act(async()=>button(root,'Recevoir un lien pour accéder à mon compte').props.onClick());assert.deepEqual(calls,[['/newsletter/account-link',{token:'legacy-newsletter-token'}]]);assert.match(root.root.findByProps({role:'status'}).children.join(''),/compte/);}finally{act(()=>root.unmount());}
});

function accountFixture({user=null,entry=null,query={}}={}) {
 const calls=[];let auth={status:user?'authenticated':'unauthenticated',user,newsletterEntry:entry,openNewsletterAccount:value=>{calls.push(['entry',value]);auth.newsletterEntry=value;},stageNewsletterIntent(){}};
 const Editor=({initial,onSave})=>React.createElement('form',{'data-shared-editor':true,onSubmit:()=>onSave({...initial,articles:false})},React.createElement('button',{type:'submit'},'Enregistrer mes choix'));
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'../newsletter/NewsletterIntentForm':Editor,'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return args[0]==='/newsletter/request'?{intent:null}:{data:{status:'active',intent:initial}};}}}).default;
 const Page=load('pages/mon-compte.tsx',{'next/router':{useRouter:()=>({query})},'next/head':Head,'next/link':Link,'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'@/components/member/MemberNewsletter':Panel,'@/components/member/MemberAuthForm':({initialEmail})=>React.createElement('input',{'data-login':true,type:'email',value:initialEmail}),'@/components/newsletter/NewsletterEnrollment':({forceOtherEmail,initial,fullPreferences})=>React.createElement('input',{'data-signup':true,type:'email',value:'',forceOtherEmail,'data-intent':initial,'data-full-preferences':fullPreferences}),'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)}}).default;
 return {Page,calls,update(root){root.update(React.createElement(Page));}};
}

test('new signup lands in the account with the green message and saves only through its limited capability',async()=>{
 const entry={email:'new@example.com',intent:{...initial,consent:true},draftToken:'limited-signup',status:'active',expiresAt:Date.now()+900000};
 const f=accountFixture({entry});let root;await act(async()=>{root=renderer.create(React.createElement(f.Page));});
 try{
  assert.equal(root.root.findByType('h1').children.join(''),'Mon compte');
  assert.equal(root.root.findByProps({role:'status'}).children.join(''),'Votre inscription a bien été prise en compte. Vous pouvez modifier vos préférences.');
  assert.match(root.root.findByProps({role:'status'}).props.className,/success/);
  assert.equal(root.root.findAllByProps({'data-shared-editor':true}).length,1);assert.equal(f.calls.length,0);
  await act(async()=>root.root.findByType('form').props.onSubmit());
  assert.equal(f.calls[0][0],'/newsletter/draft');assert.equal(f.calls[0][1].draft_token,'limited-signup');assert.equal(f.calls[0][1].intent.articles,false);
  assert.equal(f.calls.some(c=>c[0]==='/password'||c[0]==='/newsletter/settings'),false);
  act(()=>button(root,'Définir un mot de passe').props.onClick());assert.equal(root.root.findAllByProps({type:'password'}).length,0);assert.equal(root.root.findByProps({'data-login':true}).props.value,'new@example.com');
  act(()=>button(root,'Inscrire une autre adresse email').props.onClick());act(()=>f.update(root));assert.equal(root.root.findByProps({'data-signup':true}).props.value,'');assert.equal(root.root.findByProps({'data-signup':true}).props.forceOtherEmail,true);
 }finally{act(()=>root.unmount());}
});

test('an existing email is prefilled on the same account page without reading or overwriting its subscriptions',async()=>{
 const f=accountFixture({entry:{email:'existing@example.com',intent:initial,draftToken:null,status:'already_subscribed',expiresAt:Date.now()+900000}});let root;await act(async()=>{root=renderer.create(React.createElement(f.Page));});
 try{assert.equal(root.root.findByType('h1').children.join(''),'Mon compte');assert.equal(root.root.findByProps({'data-login':true}).props.value,'existing@example.com');assert.equal(root.root.findAllByType('form').length,0);assert.equal(f.calls.length,0);}finally{act(()=>root.unmount());}
});

test('a temporary signup for another email never exposes the currently signed-in account settings',async()=>{
 const f=accountFixture({user:{id:1,email:'owner@example.com',password_set:true},entry:{email:'other@example.com',intent:initial,draftToken:'limited',status:'active',expiresAt:Date.now()+900000}});let root;await act(async()=>{root=renderer.create(React.createElement(f.Page));});
 try{assert.equal(f.calls.length,0);assert.equal(root.root.findAllByProps({'data-shared-editor':true}).length,1);act(()=>button(root,'Définir un mot de passe').props.onClick());assert.equal(root.root.findAllByProps({type:'password'}).length,0);assert.equal(root.root.findByProps({'data-login':true}).props.value,'other@example.com');}finally{act(()=>root.unmount());}
});

test('the account page does not repeat the newsletter signup in the footer',()=>{
 const Signup=load('src/components/newsletter/NewsletterSignup.tsx',{'next/router':{useRouter:()=>({pathname:'/mon-compte'})},'@/lib/newsletter/i18n':{newsletterLanguage:()=> 'fr'},'./NewsletterEnrollment':()=>{throw Error('No footer enrollment in account')}}).default;
 let root;act(()=>{root=renderer.create(React.createElement(Signup,{source:'footer'}));});try{assert.equal(root.toJSON(),null);}finally{act(()=>root.unmount());}
});


test('anonymous weather CTA uses the account email signup with exactly its station and weather topic preselected',async()=>{
 const f=accountFixture({query:{station_id:'FR_2',station_name:'Alpe d’Huez',topic:'weather'}});let root;await act(async()=>{root=renderer.create(React.createElement(f.Page));});
 try{const signup=root.root.findByProps({'data-signup':true});assert.equal(signup.props['data-full-preferences'],true);assert.equal(signup.props.value,'');assert.equal(signup.props['data-intent'].stations[0].station_id,'FR_2');assert.deepEqual(signup.props['data-intent'].stations[0].topics,['weather','snowfall','snow_conditions']);assert.equal(root.root.findAllByProps({'data-login':true}).length,0);assert.equal(f.calls.length,0);}finally{act(()=>root.unmount());}
});

test('the account displays the successful station-click notice instead of a generic signup notice',async()=>{
 const f=accountFixture({user:{id:1,email:'member@example.com'},entry:{email:'member@example.com',intent:initial,draftToken:null,status:'active',notice:'Abonnement « Météo » ajouté pour La Clusaz.',expiresAt:Date.now()+900000}});let root;await act(async()=>{root=renderer.create(React.createElement(f.Page));});
 try{assert.equal(root.root.findByProps({role:'status'}).children.join(''),'Abonnement « Météo » ajouté pour La Clusaz.');assert.equal(root.root.findAllByProps({'data-shared-editor':true}).length,1);}finally{act(()=>root.unmount());}
});
