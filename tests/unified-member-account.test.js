const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),renderer=require('react-test-renderer');
const {act}=renderer;
function load(file,mocks={}){const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const mod={exports:{}};new Function('require','module','exports','React',source)(name=>{if(name in mocks)return mocks[name];if(name==='@/lib/newsletter/onboarding')return load('src/lib/newsletter/onboarding.ts');if(name.endsWith('.css'))return {};return require(name);},mod,mod.exports,React);return mod.exports;}
const Link=({children,...props})=>React.createElement('a',props,children);
const Head=({children})=>React.createElement(React.Fragment,null,children);
const button=(root,text)=>root.root.findAllByType('button').find(item=>item.children.join('')===text);
const initial={stations:[],articles:true,consent:false,language:'fr',source:'footer'};
class ApiError extends Error{constructor(code){super(code);this.code=code;}}

test('newsletter result can switch to a blank email without modifying the first subscription',async()=>{
 const calls=[];const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':Link,'next/router':{useRouter:()=>({})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user:null})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'already_subscribed'}}},'./NewsletterIntentForm':()=>null}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
 try{act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'first@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(root.root.findAllByType('strong').some(x=>x.children.join('')==='first@example.com'));act(()=>button(root,'Inscrire une autre adresse email').props.onClick());assert.equal(root.root.findByProps({type:'email'}).props.value,'');assert.equal(root.root.findAllByProps({role:'status'}).length,0);act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'second@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls.map(c=>c[1].email),['first@example.com','second@example.com']);assert.deepEqual(calls.map(c=>c[0]),['/newsletter/start','/newsletter/start']);}finally{act(()=>root.unmount());}
});

test('a connected person can subscribe another email without changing or logging out their account',async()=>{
 const calls=[];const user={email:'owner@example.com'};const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':Link,'next/router':{useRouter:()=>({push:async()=>calls.push(['navigate'])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({user,logout:()=>{throw Error('must not logout')},stageNewsletterIntent:()=>calls.push(['stage'])})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {status:'active'}}},'./NewsletterIntentForm':()=>null}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Enrollment,{initial}));});
 try{act(()=>button(root,'Utiliser une autre adresse email').props.onClick());act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:'other@example.com'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls[0][0],'/newsletter/start');assert.equal(calls[0][1].email,'other@example.com');assert.equal(calls.length,1);assert.equal(user.email,'owner@example.com');assert.ok(root.root.findAllByType('a').some(a=>a.props.href.includes('autre=1')));}finally{act(()=>root.unmount());}
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
