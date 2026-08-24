if(!window.FC4082){var fc4082=document.createElement('script');fc4082.src='assets/js/commit-40.8.2.js?v=40.8.2';document.body.appendChild(fc4082)}
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('activationForm');
 const out=document.getElementById('activationMessage');
 const resend=document.getElementById('resendConfirmation');
 const btn=document.getElementById('activationSubmit');
 MemberAuth.bindPasswordUI('activationPassword','activationPasswordConfirm','activationSubmit');
 const show=(message,type='info')=>{out.className=`v11-form-message activation-${type}`;out.textContent=message;};
 const friendly=(err)=>{
  const text=MemberAuth.errorMessage(err,'No se pudo activar la cuenta.');
  if(/rate limit|too many|429|email.*limit/i.test(text))return 'Se ha alcanzado temporalmente el límite de correos. Espera unos minutos y vuelve a intentarlo.';
  if(/smtp|sending confirmation email|error sending/i.test(text))return 'La cuenta no pudo completarse porque falló el envío del correo. Contacta con la directiva.';
  return text;
 };
 form?.addEventListener('submit',async e=>{
  e.preventDefault();btn.disabled=true;resend.style.display='none';show('Comprobando tu ficha y creando la cuenta…');
  try{
   const status=MemberAuth.passwordStatus(form.password.value,form.passwordConfirm.value);
   if(!status.valid)throw new Error('La contraseña no cumple todos los requisitos.');
   const result=await MemberAuth.activate({firstName:form.firstName.value,lastName:form.lastName.value,email:form.email.value,password:form.password.value});
   if(!result?.created)throw new Error('No se ha podido confirmar que la cuenta se haya creado.');
   if(result.confirmationRequired){
    show('✅ Cuenta creada correctamente. Te hemos enviado un correo para confirmarla. Revisa también la carpeta de spam o correo no deseado.','success');
    resend.style.display='block';form.querySelectorAll('input').forEach(i=>i.readOnly=true);
   }else{
    show('✅ Cuenta activada correctamente. Entrando en tu Área de Socio…','success');
    setTimeout(()=>location.href='area-socio.html',1000);
   }
  }catch(err){
   const message=friendly(err);show(message,'error');
   if(err?.code==='account_exists'||/ya tiene una cuenta|already/i.test(message))resend.style.display='block';
  }finally{btn.disabled=!MemberAuth.passwordStatus(form.password.value,form.passwordConfirm.value).valid;}
 });
 resend?.addEventListener('click',async()=>{
  resend.disabled=true;show('Solicitando un nuevo correo de confirmación…');
  try{await MemberAuth.resend(form.email.value);show('✅ Correo solicitado. Revisa la bandeja de entrada y también spam o correo no deseado.','success');}
  catch(err){show(friendly(err),'error');}
  finally{resend.disabled=false;}
 });
});
