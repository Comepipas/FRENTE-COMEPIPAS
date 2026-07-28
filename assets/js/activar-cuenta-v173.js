document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('activationForm');
 const out=document.getElementById('activationMessage');
 const resend=document.getElementById('resendConfirmation');
 MemberAuth.bindPasswordUI('activationPassword','activationPasswordConfirm','activationSubmit');

 const friendlyError=(err)=>{
  const text=String(err?.message||err||'');
  if(/rate limit|too many|429|email.*limit/i.test(text)) return 'Se ha alcanzado temporalmente el límite de correos de activación. La directiva debe revisar el SMTP de Supabase o inténtalo más tarde.';
  if(/already registered|already been registered|ya.*registr/i.test(text)) return 'Ese correo ya tiene una cuenta. Entra con tu contraseña o usa “He olvidado mi contraseña”.';
  return text||'No se pudo activar la cuenta.';
 };

 form?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('activationSubmit');
  btn.disabled=true;
  out.textContent='Comprobando tu ficha y creando la cuenta…';
  try{
   const status=MemberAuth.passwordStatus(form.password.value,form.passwordConfirm.value);
   if(!status.valid) throw new Error('La contraseña no cumple todos los requisitos.');
   const result=await MemberAuth.activate({
    firstName:form.firstName.value.trim(),
    lastName:form.lastName.value.trim(),
    email:form.email.value.trim(),
    password:form.password.value
   });
   if(result.confirmationRequired){
    out.textContent='Cuenta creada y ficha localizada. Revisa tu correo y pulsa el enlace de confirmación.';
    resend.style.display='block';
   }else{
    out.textContent='Cuenta activada correctamente. Ya puedes entrar.';
    setTimeout(()=>location.href='area-socio.html',900);
   }
  }catch(err){out.textContent=friendlyError(err);}
  finally{btn.disabled=!MemberAuth.passwordStatus(form.password.value,form.passwordConfirm.value).valid;}
 });

 resend?.addEventListener('click',async()=>{
  out.textContent='Reenviando…';
  try{await MemberAuth.resend(form.email.value.trim());out.textContent='Correo reenviado. Revisa también la carpeta de spam.';}
  catch(err){out.textContent=friendlyError(err);}
 });
});
