(() => {
'use strict';
let sb;
async function client(){if(sb)return sb;sb=(await window.FrenteSupabase.init()).client;return sb;}
function redirect(path){return new URL(path,window.location.href).href;}
function errorMessage(err,fallback='No se pudo completar la operación.'){
 if(!err)return fallback;
 if(typeof err==='string')return err;
 for(const key of ['message','error_description','details','hint','code']){
  if(typeof err[key]==='string'&&err[key].trim())return err[key].trim();
 }
 try{const text=JSON.stringify(err);return text&&text!=='{}'?text:fallback;}catch{return fallback;}
}
function passwordStatus(password,confirm=''){
 const tests={length:password.length>=8,upper:/[A-ZÁÉÍÓÚÑ]/.test(password),lower:/[a-záéíóúñ]/.test(password),number:/\d/.test(password),match:password.length>0&&password===confirm};
 const score=['length','upper','lower','number'].filter(k=>tests[k]).length;
 return {tests,score,valid:Object.values(tests).every(Boolean)};
}
function bindPasswordUI(passwordId,confirmId,submitId){
 const p=document.getElementById(passwordId),c=document.getElementById(confirmId),b=document.getElementById(submitId);
 const update=()=>{const s=passwordStatus(p?.value||'',c?.value||'');document.querySelectorAll('#passwordRules [data-rule]').forEach(el=>{const ok=s.tests[el.dataset.rule];el.classList.toggle('ok',ok);el.classList.toggle('bad',!ok);el.textContent=(ok?'✓ ':'○ ')+el.textContent.replace(/^[✓○]\s*/,'');});const bar=document.getElementById('passwordStrengthBar'),txt=document.getElementById('passwordStrengthText');if(bar)bar.style.width=`${s.score*25}%`;if(txt)txt.textContent=`Seguridad: ${s.score<2?'débil':s.score<4?'media':'fuerte'}`;if(b)b.disabled=!s.valid;};
 p?.addEventListener('input',update);c?.addEventListener('input',update);update();return update;
}
function bindPasswordToggles(){document.querySelectorAll('[data-toggle-password]').forEach(btn=>btn.addEventListener('click',()=>{const input=document.getElementById(btn.dataset.togglePassword);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Ocultar':'Ver';}));}
async function signIn(email,password){const c=await client();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw new Error(errorMessage(error));await completeLink();return data;}
async function signOut(){const c=await client();await c.auth.signOut();}
async function session(){const c=await client();const {data,error}=await c.auth.getSession();if(error)throw new Error(errorMessage(error));return data.session;}
async function profile(){const c=await client();const {data,error}=await c.from('my_member_profile').select('*').maybeSingle();if(error)throw new Error(errorMessage(error));return data;}
async function completeLink(){const c=await client();const {data,error}=await c.rpc('complete_member_link');if(error)throw new Error(errorMessage(error,'No se pudo vincular la cuenta con la ficha de socio.'));let result=data;if(typeof result==='string'){try{result=JSON.parse(result);}catch{}}if(!result||result.ok!==true||result.linked!==true)throw new Error('Supabase no pudo verificar la vinculación con la ficha de socio.');return result;}
async function updateContact(values){const c=await client();const p=await profile();if(!p)throw new Error('No hay ficha de socio vinculada.');const {error}=await c.from('socios').update({telefono:values.telefono||null,direccion:values.direccion||null}).eq('id',p.id);if(error)throw new Error(errorMessage(error));return profile();}
async function resetPassword(email){const c=await client();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:redirect('establecer-clave.html')});if(error)throw new Error(errorMessage(error));}
async function activate({firstName,lastName,email,password}){
 const c=await client();
 const clean={firstName:String(firstName||'').trim(),lastName:String(lastName||'').trim(),email:String(email||'').trim().toLowerCase()};
 if(!clean.firstName||!clean.lastName||!clean.email)throw new Error('Debes indicar nombre, apellidos y correo electrónico.');
 const {data:rawCheck,error:checkError}=await c.rpc('check_member_activation_identity',{p_nombre:clean.firstName,p_apellidos:clean.lastName,p_email:clean.email});
 if(checkError)throw new Error(errorMessage(checkError,'No se pudo comprobar la ficha de socio.'));
 let check=rawCheck;
 if(typeof check==='string'){try{check=JSON.parse(check);}catch{check=null;}}
 if(!check||typeof check!=='object')throw new Error('Supabase no devolvió una comprobación válida de la ficha.');
 if(check.ok!==true)throw new Error(String(check.message||'Los datos no coinciden con una ficha activa del censo.'));
 const options={emailRedirectTo:redirect('confirmacion-cuenta.html'),data:{member_first_name:clean.firstName,member_last_name:clean.lastName,member_email:clean.email}};
 const {data,error}=await c.auth.signUp({email:clean.email,password,options});
 if(error)throw new Error(errorMessage(error,'Supabase no pudo crear la cuenta.'));
 if(!data?.user)throw new Error('Supabase no confirmó la creación de la cuenta. Inténtalo de nuevo.');
 // Supabase oculta por seguridad si el correo ya existe y devuelve un usuario sin identidades.
 if(Array.isArray(data.user.identities)&&data.user.identities.length===0){
  const ex=new Error('Este correo ya tiene una cuenta creada. Inicia sesión, recupera la contraseña o pulsa “Reenviar correo de confirmación” si aún no la confirmaste.');
  ex.code='account_exists';throw ex;
 }
 sessionStorage.setItem('frente_pending_activation_email',clean.email);
 if(data.session){await completeLink();return{created:true,confirmationRequired:false,profile:await profile()};}
 return{created:true,confirmationRequired:true,userId:data.user.id};
}
async function resend(email){const c=await client();const clean=String(email||'').trim().toLowerCase();if(!clean)throw new Error('Escribe el correo electrónico.');const {error}=await c.auth.resend({type:'signup',email:clean,options:{emailRedirectTo:redirect('confirmacion-cuenta.html')}});if(error)throw new Error(errorMessage(error,'No se pudo reenviar el correo.'));sessionStorage.setItem('frente_pending_activation_email',clean);return true;}
async function setPassword(password){const c=await client();const {data,error}=await c.auth.updateUser({password});if(error)throw new Error(errorMessage(error));await completeLink();return data;}
window.MemberAuth={client,redirect,errorMessage,passwordStatus,bindPasswordUI,bindPasswordToggles,signIn,signOut,session,profile,completeLink,updateContact,resetPassword,activate,resend,setPassword};
document.addEventListener('DOMContentLoaded',()=>{
 bindPasswordToggles();
 const login=document.getElementById('memberLoginForm');
 if(login){
  const params=new URLSearchParams(location.search);const remembered=params.get('email')||sessionStorage.getItem('frente_pending_activation_email')||'';
  if(remembered&&login.email){login.email.value=remembered;login.password?.focus();}
  login.addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('memberLoginError'),btn=login.querySelector('button');btn.disabled=true;out.textContent='Comprobando acceso…';try{await signIn(login.email.value.trim(),login.password.value);const p=await profile();if(!p)throw new Error('La cuenta existe, pero todavía no está vinculada con una ficha de socio. Contacta con la directiva.');sessionStorage.removeItem('frente_pending_activation_email');location.href='area-socio.html';}catch(err){out.textContent=errorMessage(err,'No se pudo iniciar sesión.');}finally{btn.disabled=false;}});
 }
 const logout=document.getElementById('memberLogout');if(logout)logout.addEventListener('click',async()=>{await signOut();location.href='socios.html';});
});
})();
