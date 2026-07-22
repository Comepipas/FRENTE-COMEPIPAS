(() => {
'use strict';
let sb;
async function client(){if(sb)return sb;sb=(await window.FrenteSupabase.init()).client;return sb;}
function redirect(path){return new URL(path,window.location.href).href;}
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
async function signIn(email,password){const c=await client();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;await completeLink();return data;}
async function signOut(){const c=await client();await c.auth.signOut();}
async function session(){const c=await client();const {data,error}=await c.auth.getSession();if(error)throw error;return data.session;}
async function profile(){const c=await client();const {data,error}=await c.from('my_member_profile').select('*').maybeSingle();if(error)throw error;return data;}
async function completeLink(){const c=await client();const {data,error}=await c.rpc('complete_member_link');if(error&&!/already|vinculada/i.test(error.message||''))console.warn('Vinculación pendiente:',error.message);return data;}
async function updateContact(values){const c=await client();const p=await profile();if(!p)throw new Error('No hay ficha de socio vinculada.');const {error}=await c.from('socios').update({telefono:values.telefono||null,direccion:values.direccion||null}).eq('id',p.id);if(error)throw error;return profile();}
async function resetPassword(email){const c=await client();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:redirect('establecer-clave.html')});if(error)throw error;}
async function activate({memberNumber,verification,email,password}){const c=await client();const options={emailRedirectTo:redirect('confirmacion-cuenta.html'),data:{member_number:Number(memberNumber),member_verification:String(verification)}};const {data,error}=await c.auth.signUp({email,password,options});if(error)throw error;if(data.user&&!data.session)return{confirmationRequired:true};await completeLink();return{confirmationRequired:false,profile:await profile()};}
async function resend(email){const c=await client();const {error}=await c.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect('confirmacion-cuenta.html')}});if(error)throw error;}
async function setPassword(password){const c=await client();const {data,error}=await c.auth.updateUser({password});if(error)throw error;await completeLink();return data;}
window.MemberAuth={client,redirect,passwordStatus,bindPasswordUI,bindPasswordToggles,signIn,signOut,session,profile,completeLink,updateContact,resetPassword,activate,resend,setPassword};
document.addEventListener('DOMContentLoaded',()=>{bindPasswordToggles();const login=document.getElementById('memberLoginForm');if(login)login.addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('memberLoginError'),btn=login.querySelector('button');btn.disabled=true;out.textContent='Comprobando acceso…';try{await signIn(login.email.value.trim(),login.password.value);const p=await profile();if(!p)throw new Error('La cuenta existe, pero todavía no está vinculada con una ficha de socio. Contacta con la directiva.');location.href='area-socio.html';}catch(err){out.textContent=err.message||'No se pudo iniciar sesión.';}finally{btn.disabled=false;}});const logout=document.getElementById('memberLogout');if(logout)logout.addEventListener('click',async()=>{await signOut();location.href='socios.html';});});
})();