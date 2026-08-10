document.addEventListener('DOMContentLoaded',async()=>{
 const title=document.getElementById('confirmTitle'),msg=document.getElementById('confirmMessage'),link=document.getElementById('confirmLogin');
 const pending=sessionStorage.getItem('frente_pending_activation_email')||'';
 const loginUrl='socios.html'+(pending?`?email=${encodeURIComponent(pending)}`:'');
 link.href=loginUrl;link.textContent='Iniciar sesión';
 try{
  await new Promise(r=>setTimeout(r,900));
  const s=await MemberAuth.session();
  if(s){
   await MemberAuth.completeLink();
   const email=s.user?.email||pending;if(email)sessionStorage.setItem('frente_pending_activation_email',email);
   title.textContent='✅ Cuenta confirmada correctamente';
   msg.textContent='Ahora te llevamos al inicio de sesión. Introduce la contraseña que acabas de crear.';
  }else{
   title.textContent='✅ Correo confirmado';
   msg.textContent='Ya puedes iniciar sesión con tu correo y la contraseña que acabas de crear.';
  }
  link.style.display='inline-flex';
  setTimeout(()=>location.replace(loginUrl),3000);
 }catch(err){
  title.textContent='Confirmación recibida';
  msg.textContent=MemberAuth.errorMessage(err,'La cuenta se ha confirmado, pero no se pudo completar la vinculación. Inicia sesión o contacta con la directiva.');
  link.style.display='inline-flex';
 }
});
