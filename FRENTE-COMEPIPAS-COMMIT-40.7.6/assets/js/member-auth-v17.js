(() => {
  'use strict';
  let sb;
  async function client(){ if(sb) return sb; sb=(await window.FrenteSupabase.init()).client; return sb; }
  const message=(id,text,type='')=>{const el=document.getElementById(id); if(el){el.textContent=text; el.className=`member-login-error ${type}`;}};
  async function signIn(email,password){const c=await client();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;return data;}
  async function signOut(){const c=await client();await c.auth.signOut();}
  async function session(){const c=await client();const {data,error}=await c.auth.getSession();if(error)throw error;return data.session;}
  async function profile(){const c=await client();const {data,error}=await c.from('my_member_profile').select('*').maybeSingle();if(error)throw error;return data;}
  async function updateContact(values){const c=await client();const p=await profile();if(!p)throw new Error('No hay ficha de socio vinculada.');const allowed={telefono:values.telefono||null,direccion:values.direccion||null};const {error}=await c.from('socios').update(allowed).eq('id',p.id);if(error)throw error;return profile();}
  async function resetPassword(email){const c=await client();const redirectTo=new URL('recuperar-clave.html',location.href).href;const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;}
  async function activate({memberNumber,verification,email,password}){
    const c=await client();
    let current=(await c.auth.getSession()).data.session;
    if(!current){
      const {data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:new URL('socios.html',location.href).href}});
      if(error)throw error;
      current=data.session;
      if(!current) return {confirmationRequired:true};
    }
    const claim=await c.rpc('claim_member_account',{p_numero_socio:Number(memberNumber),p_verificacion:verification});
    if(claim.error){await c.auth.signOut();throw claim.error;}
    return {confirmationRequired:false,profile:claim.data};
  }
  window.MemberAuth={client,signIn,signOut,session,profile,updateContact,resetPassword,activate};

  document.addEventListener('DOMContentLoaded',()=>{
    const login=document.getElementById('memberLoginForm');
    if(login) login.addEventListener('submit',async e=>{e.preventDefault();message('memberLoginError','Comprobando acceso…');const b=login.querySelector('button');b.disabled=true;try{await signIn(login.email.value.trim(),login.password.value);const p=await profile();if(!p){location.href='activar-cuenta.html';return;}location.href='area-socio.html';}catch(err){message('memberLoginError',err.message||'No se pudo iniciar sesión.');}finally{b.disabled=false;}});
    const logout=document.getElementById('memberLogout');if(logout)logout.addEventListener('click',async()=>{await signOut();location.href='socios.html';});
  });
})();
