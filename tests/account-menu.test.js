const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const ts=require('typescript'); const React=require('react'); const renderer=require('react-test-renderer'); const {act}=renderer;
function load(file,mocks){ const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8'); const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('require','module','exports','React',compiled)(name=>name in mocks?mocks[name]:name.endsWith('.module.css')?{}:name==='@/lib/newsletter/onboarding'?load('src/lib/newsletter/onboarding.ts',{}):name==='next/router'?{useRouter:()=>({query:{}})}:name==='../newsletter/NewsletterIntentForm'?({onSave,initial})=>React.createElement('button',{onClick:()=>onSave(initial)},'Enregistrer mes choix'):require(name),module,module.exports,React);return module.exports; }
const Link=({children,...props})=>React.createElement('a',props,children); const css={menu:'menu',form:'form',error:'error',wrap:'wrap'};
const button=(root,text)=>root.root.findAllByType('button').find(b=>b.children.join('')===text);
const user={id:1,email:'member@example.com',password_set:false};
const auth={status:'authenticated',user,refresh:async()=>user,login:async()=>{},logout:async()=>{}};

test('member signup asks for email only, sends verification and never logs in before confirmation',async()=>{
 const calls=[]; const Form=load('src/components/member/MemberAuthForm.tsx',{'next/link':Link,'next/router':{useRouter:()=>({query:{},push:async v=>calls.push(['navigate',v])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,login:async()=>calls.push(['login'])})},'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)},'../layout/AccountMenu.module.css':css}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{mode:'register'}));});
 try{assert.equal(root.root.findAllByProps({type:'password'}).length,0);act(()=>root.root.findByType('input').props.onChange({target:{value:' MEMBER@EXAMPLE.COM '}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls,[['/register',{email:'member@example.com'}]]);assert.match(root.root.findByProps({role:'status'}).children.join(''),/lien d’accès/);assert.equal(root.root.findByType('a').props.href,'/connexion?method=password');}finally{act(()=>root.unmount());}
});
test('member login and mail recovery stay on public routes',async()=>{
 const calls=[];const Form=load('src/components/member/MemberAuthForm.tsx',{'next/link':Link,'next/router':{useRouter:()=>({query:{method:"password"},push:async v=>calls.push(['navigate',v])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,login:async(...args)=>calls.push(['login',...args])})},'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)},'../layout/AccountMenu.module.css':css}).default;
 let root;act(()=>{root=renderer.create(React.createElement(Form));});
 try{assert.equal(root.root.findByType('a').props.href,'/inscription');act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:user.email}}));act(()=>root.root.findByProps({type:'password'}).props.onChange({target:{value:'password value'}}));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls,[['login',user.email,'password value'],['navigate','/mon-compte']]);act(()=>button(root,'Recevoir un lien de connexion par email').props.onClick());assert.equal(root.root.findAllByProps({type:'password'}).length,0);await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls.at(-1),['/login-link',{email:user.email}]);}finally{act(()=>root.unmount());}
});
test('header menu uses member state and sends connected users to public account',()=>{
 let state={...auth,status:'unauthenticated',user:null};const Menu=load('src/components/layout/AccountMenu.tsx',{'next/link':Link,'@/contexts/MemberAuthContext':{useMemberAuth:()=>state},'../member/MemberAuthForm':()=>React.createElement('form'), './AccountMenu.module.css':css}).default;
 let root;act(()=>{root=renderer.create(React.createElement(Menu,{onClose(){}}));});try{assert.equal(root.root.findAllByType('a').length,0);state=auth;act(()=>root.update(React.createElement(Menu,{onClose(){}})));assert.equal(root.root.findByType('a').props.href,'/mon-compte');assert.equal(root.root.findAllByType('form').length,0);}finally{act(()=>root.unmount());}
});
test('account has exactly newsletter and password tabs and changes password without the old one',async()=>{
 const calls=[];const Page=load('pages/mon-compte.tsx',{'next/head':({children})=>React.createElement('div',null,children),'next/link':Link,'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,refresh:async()=>{calls.push(['refresh']);return user;}})},'@/lib/memberApi':{memberRequest:async(...args)=>calls.push(args)},'@/components/member/MemberAuthForm':()=>null,'@/components/newsletter/NewsletterEnrollment':()=>null,'@/components/member/MemberNewsletter':()=>React.createElement('section',{'data-newsletter':true})}).default;
 let root;act(()=>{root=renderer.create(React.createElement(Page));});try{assert.deepEqual(root.root.findAllByProps({role:'tab'}).map(t=>t.children.join('')),['Mes abonnements','Définir un mot de passe']);act(()=>button(root,'Définir un mot de passe').props.onClick());const inputs=root.root.findAllByType('input');assert.equal(inputs.length,2);act(()=>inputs.forEach(i=>i.props.onChange({target:{value:'a secure password'}})));await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(calls,[['/password',{password:'a secure password'},true],['refresh']]);assert.match(root.root.findByProps({role:'status'}).children.join(''),/modifié/);}finally{act(()=>root.unmount());}
});
test('member logout returns to home and uses member endpoint only',async()=>{
 const calls=[];const module=load('src/contexts/MemberAuthContext.tsx',{'next/router':{useRouter:()=>({query:{},push:async v=>calls.push(['navigate',v])})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {user,authenticated:true};}}});let context;function Probe(){context=module.useMemberAuth();return null;}
 let root;await act(async()=>{root=renderer.create(React.createElement(module.MemberAuthProvider,null,React.createElement(Probe)));});try{await act(async()=>context.logout());assert.deepEqual(calls.slice(-2),[['/logout',{},true],['navigate','/']]);assert.equal(context.status,'unauthenticated');}finally{act(()=>root.unmount());}
});
test('opening newsletter preferences only loads the shared editor and saving uses one authenticated settings request',async()=>{
 const calls=[];const intent={stations:[],articles:true,newsletter_frequency:'weekly',consent:true,language:'fr',source:'member-account'};
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,stageNewsletterIntent:()=>{}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return args[0]==='/newsletter/request'?{intent:null}:{data:{status:'not_subscribed',intent}};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Panel));});try{assert.deepEqual(calls,[['/newsletter/settings'],['/newsletter/request']]);await act(async()=>button(root,'Enregistrer mes choix').props.onClick());assert.deepEqual(calls[2],['/newsletter/settings',{intent},true]);}finally{act(()=>root.unmount());}
});
test('saved subscriptions use the same editor and a single full-selection write',async()=>{
 const calls=[];const intent={stations:[{station_id:'FR_1',station_name:'La Clusaz',topics:['weather'],weather_frequency:'daily',newsletter_frequency:'weekly'}],articles:false,newsletter_frequency:'monthly',consent:true,language:'fr',source:'member-account'};
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,stageNewsletterIntent:()=>{}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return args[0]==='/newsletter/request'?{intent:null}:{data:{status:'active',intent}};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Panel));});try{await act(async()=>button(root,'Enregistrer mes choix').props.onClick());assert.deepEqual(calls.at(-1),['/newsletter/settings',{intent},true]);assert.equal(calls.some(c=>c[0].startsWith('/newsletter/stations')),false);}finally{act(()=>root.unmount());}
});

test('member link page removes the secret fragment and consumes only after an explicit click',async()=>{
 const previous=global.window;const calls=[];global.window={location:{hash:'#'+'a'.repeat(64),pathname:'/connexion/lien'},history:{replaceState:()=>calls.push(['clear-fragment'])}};
 const Page=load('pages/connexion/lien.tsx',{'next/head':({children})=>React.createElement('div',null,children),'next/link':Link,'next/router':{useRouter:()=>({replace:async v=>calls.push(['navigate',v])})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,refresh:async()=>{calls.push(['refresh']);return user;},stageNewsletterIntent:()=>{}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return {user,newsletter_intent:null};}}}).default;
 let root;try{await act(async()=>{root=renderer.create(React.createElement(Page));});assert.deepEqual(calls,[['clear-fragment']]);await act(async()=>button(root,'Me connecter').props.onClick());assert.deepEqual(calls.slice(1),[['/login-link/consume',{token:'a'.repeat(64)}],['refresh'],['navigate','/mon-compte']]);}finally{if(root)act(()=>root.unmount());global.window=previous;}
});
test('member API keeps cookies and attaches the session CSRF to password changes',async()=>{
 const previous=global.fetch;const calls=[];global.fetch=async(...args)=>{calls.push(args);return {ok:true,json:async()=>({authenticated:true,user,csrf_token:'new-csrf'})};};
 try{const api=load('src/lib/memberApi.ts',{'./adminApi':{ADMIN_API_BASE:'https://api.example'}});await api.memberRequest('/password',{password:'a secure password'},true);assert.equal(calls[0][0],'/api/member/session');assert.equal(calls[1][0],'/api/member/password');assert.equal(calls[1][1].headers['X-CSRF-Token'],'new-csrf');assert.equal(calls[1][1].credentials,'include');assert.equal(calls[1][1].method,'POST');}finally{global.fetch=previous;}
});

test('unsubscribe is an explicit button with confirmation and leaves a durable unsubscribed view',async()=>{
 const calls=[];const intent={stations:[],articles:true,consent:true,language:'fr',source:'account'};
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,openNewsletterAccount(){},stageNewsletterIntent(){}})},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);return args[0]==='/newsletter/request'?{intent:null}:{data:{status:'active',intent}};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Panel));});try{
  assert.equal(root.root.findAllByType('details').length,0);
  const before=calls.length;act(()=>button(root,'Me désabonner de tous les emails').props.onClick());assert.equal(calls.length,before);assert.equal(root.root.findAllByProps({role:'alertdialog'}).length,1);
  act(()=>button(root,'Annuler').props.onClick());assert.equal(root.root.findAllByProps({role:'alertdialog'}).length,0);assert.equal(calls.length,before);
  act(()=>button(root,'Me désabonner de tous les emails').props.onClick());await act(async()=>button(root,'Confirmer le désabonnement').props.onClick());assert.deepEqual(calls.at(-1),['/newsletter/unsubscribe',{},true]);
  assert.equal(button(root,'Enregistrer mes choix'),undefined);assert.ok(button(root,'Réactiver mes abonnements'));
  assert.match(JSON.stringify(root.toJSON()),/Vous êtes désabonné de tous les emails/);
  const after=calls.length;act(()=>button(root,'Réactiver mes abonnements').props.onClick());assert.equal(calls.length,after);assert.ok(button(root,'Enregistrer mes choix'));
 }finally{act(()=>root.unmount());}
});

test('failed unsubscribe preserves the editor and shows an error without success feedback',async()=>{
 const intent={stations:[],articles:true,consent:true,language:'fr',source:'account'};
 const Panel=load('src/components/member/MemberNewsletter.tsx',{'@/contexts/MemberAuthContext':{useMemberAuth:()=>({...auth,openNewsletterAccount(){},stageNewsletterIntent(){}})},'@/lib/memberApi':{memberRequest:async(path)=>{if(path==='/newsletter/unsubscribe')throw Error('Impossible de joindre le serveur.');return path==='/newsletter/request'?{intent:null}:{data:{status:'active',intent}};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Panel));});try{act(()=>button(root,'Me désabonner de tous les emails').props.onClick());await act(async()=>button(root,'Confirmer le désabonnement').props.onClick());assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Impossible de joindre/);assert.ok(button(root,'Enregistrer mes choix'));assert.equal(button(root,'Réactiver mes abonnements'),undefined);assert.equal(root.root.findAllByProps({role:'alertdialog'}).length,1);}finally{act(()=>root.unmount());}
});

test('first recent-link response confirms the email; an immediate repeat shows the cooldown',async()=>{
 const calls=[];const cooldown=Object.assign(new Error('Veuillez patienter une minute avant de demander un nouveau lien.'),{code:'login_link_cooldown'});
 const Form=load('src/components/member/MemberAuthForm.tsx',{'next/link':Link,'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'@/lib/memberApi':{memberRequest:async(...args)=>{calls.push(args);throw cooldown;}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initialEmail:user.email}));});
 try{await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls.length,1);assert.equal(root.root.findAllByProps({role:'alert'}).length,0);assert.match(root.root.findByProps({role:'status'}).children.join(''),/lien de connexion.*a été envoyé/);
 await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls.length,2);assert.equal(root.root.findAllByProps({role:'status'}).length,0);assert.match(root.root.findByProps({role:'alert'}).children.join(''),/patienter une minute/);
 }finally{act(()=>root.unmount());}
});
test('successful first link request confirms delivery and a repeat preserves the server cooldown',async()=>{
 let count=0;const Form=load('src/components/member/MemberAuthForm.tsx',{'next/link':Link,'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'@/lib/memberApi':{memberRequest:async()=>{if(++count>1)throw Object.assign(new Error('Veuillez patienter une minute avant de demander un nouveau lien.'),{code:'login_link_cooldown'});return {ok:true};}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initialEmail:user.email}));});try{await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.match(root.root.findByProps({role:'status'}).children.join(''),/a été envoyé/);await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.match(root.root.findByProps({role:'alert'}).children.join(''),/patienter une minute/);}finally{act(()=>root.unmount());}
});
test('failed link delivery never claims that an email was sent',async()=>{
 const Form=load('src/components/member/MemberAuthForm.tsx',{'next/link':Link,'next/router':{useRouter:()=>({query:{}})},'@/contexts/MemberAuthContext':{useMemberAuth:()=>auth},'@/lib/memberApi':{memberRequest:async()=>{throw Object.assign(new Error('Impossible d’envoyer le mail.'),{code:'email_delivery_failed'});}}}).default;
 let root;await act(async()=>{root=renderer.create(React.createElement(Form,{initialEmail:user.email}));});try{await act(async()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(root.root.findAllByProps({role:'status'}).length,0);assert.match(root.root.findByProps({role:'alert'}).children.join(''),/Impossible/);}finally{act(()=>root.unmount());}
});
test('a late session check cannot disconnect a just-created account or change the menu back to login',async()=>{
 let rejectSession;const pending=new Promise((resolve,reject)=>{rejectSession=reject;});let context;
 const module=load('src/contexts/MemberAuthContext.tsx',{'next/router':{useRouter:()=>({push:async()=>{}})},'@/lib/memberApi':{memberRequest:()=>pending}});
 const Menu=load('src/components/layout/AccountMenu.tsx',{'next/link':Link,'@/contexts/MemberAuthContext':module,'../member/MemberAuthForm':()=>React.createElement('form')}).default;
 function Probe(){context=module.useMemberAuth();return React.createElement(Menu,{onClose(){}});}
 let root;await act(async()=>{root=renderer.create(React.createElement(module.MemberAuthProvider,null,React.createElement(Probe)));});try{assert.equal(context.status,'loading');act(()=>context.completeSignup(user));assert.equal(root.root.findByType('a').props.href,'/mon-compte');assert.equal(root.root.findAllByType('form').length,0);await act(async()=>rejectSession(Error('old anonymous session')));assert.equal(context.status,'authenticated');assert.equal(root.root.findByType('a').props.href,'/mon-compte');assert.equal(root.root.findAllByType('form').length,0);}finally{act(()=>root.unmount());}
});

test('Valider in the real enrollment connects the shared header menu and reload restores the session',async()=>{
 let account=null,context;const calls=[];const router={query:{},push:async()=>{}};
 const api={memberRequest:async(endpoint,body)=>{calls.push(endpoint);if(endpoint==='/session'){if(!account)throw Error('anonymous');return {authenticated:true,user:account};}if(endpoint==='/newsletter/start'){account=user;return {status:'active',authenticated:true,user,csrf_token:'csrf',intent:body.intent};}throw Error('unexpected endpoint');}};
 const contextModule=load('src/contexts/MemberAuthContext.tsx',{'next/router':{useRouter:()=>router},'@/lib/memberApi':api});
 const Menu=load('src/components/layout/AccountMenu.tsx',{'next/link':Link,'@/contexts/MemberAuthContext':contextModule,'../member/MemberAuthForm':()=>React.createElement('form',{'data-login':true})}).default;
 const Enrollment=load('src/components/newsletter/NewsletterEnrollment.tsx',{'next/link':Link,'next/router':{useRouter:()=>router},'@/contexts/MemberAuthContext':contextModule,'@/lib/memberApi':api}).default;
 function Screen(){context=contextModule.useMemberAuth();return React.createElement(React.Fragment,null,React.createElement(Menu,{onClose(){}}),React.createElement(Enrollment,{fullPreferences:true,initial:{stations:[],articles:true,consent:true,language:'fr',source:'footer'}}));}
 const app=()=>React.createElement(contextModule.MemberAuthProvider,null,React.createElement(Screen));let root;
 await act(async()=>{root=renderer.create(app());});try{assert.equal(context.status,'unauthenticated');act(()=>root.root.findByProps({type:'email'}).props.onChange({target:{value:user.email}}));const form=root.root.findAllByType('form').find(node=>!node.props['data-login']);await act(async()=>form.props.onSubmit({preventDefault(){}}));assert.equal(context.status,'authenticated');const menu=root.root.findByProps({id:'header-account-menu'});assert.equal(menu.findAllByProps({'data-login':true}).length,0);assert.equal(menu.findByType('a').props.href,'/mon-compte');act(()=>root.unmount());await act(async()=>{root=renderer.create(app());});assert.equal(context.status,'authenticated');assert.equal(root.root.findByProps({id:'header-account-menu'}).findByType('a').props.href,'/mon-compte');assert.equal(calls.filter(p=>p==='/newsletter/start').length,1);}finally{act(()=>root.unmount());}
});
