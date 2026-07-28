(() => {
 'use strict';
 const fmtDate=v=>v?new Intl.DateTimeFormat('es-ES').format(new Date(v+'T12:00:00')):'—';
 const set=(id,v)=>{document.querySelectorAll(`#${id}`).forEach(el=>el.textContent=v??'—');};

 async function loadFamily(){
  const section=document.getElementById('memberFamilySection');
  const list=document.getElementById('memberFamilyList');
  if(!section||!list)return;
  try{
   const c=await MemberAuth.client();
   const {data,error}=await c.rpc('my_linked_minors');
   if(error)throw error;
   const rows=Array.isArray(data)?data:[];
   if(!rows.length){section.hidden=true;return;}
   section.hidden=false;
   list.innerHTML=rows.map(x=>`<article class="member-family-item"><div><strong>${escapeHtml([x.nombre,x.apellidos].filter(Boolean).join(' '))}</strong><small>${escapeHtml(labelRelation(x.parentesco))} · ${escapeHtml(x.categoria||'Menor')}</small></div><div><span>${x.numero_socio?`Socio nº ${escapeHtml(String(x.numero_socio).padStart(3,'0'))}`:'Número pendiente'}</span><strong>${x.cuota_al_dia?'Al día':'Pendiente'}</strong></div></article>`).join('');
  }catch(err){
   console.warn('[Commit 34.6] No se pudieron cargar los menores vinculados:',err.message||err);
   section.hidden=true;
  }
 }
 function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function labelRelation(v){return ({padre:'Padre',madre:'Madre',tutor_legal:'Tutor legal'})[v]||'Tutor/a';}

 async function load(){
  const status=document.getElementById('memberAreaStatus');
  try{
   const s=await MemberAuth.session();if(!s){location.replace('socios.html');return;}
   const p=await MemberAuth.profile();if(!p){await MemberAuth.signOut();location.replace('activar-cuenta.html');return;}
   const name=[p.nombre,p.apellidos].filter(Boolean).join(' ');
   set('memberName',name);set('memberNumber',p.numero_socio?`Socio nº ${String(p.numero_socio).padStart(3,'0')}`:'Número de socio pendiente');set('memberStatus',p.estado||'Activo');set('memberType',p.categoria||'Sin categoría');set('memberFee',p.cuota_al_dia?'Al día':'Pendiente');set('memberEmail',p.email);set('memberPhone',p.telefono);set('memberAddress',p.direccion);set('memberSince',fmtDate(p.fecha_alta));set('memberBirthDate',fmtDate(p.fecha_nacimiento));set('memberAge',p.edad_actual!=null?`${p.edad_actual} años`:'—');
   const photo=p.foto_url||'assets/images/socios/socio-demo.jpg';['memberPhoto','memberCardPhoto'].forEach(id=>{const el=document.getElementById(id);if(el)el.src=photo;});
   const f=document.getElementById('memberContactForm');if(f){f.telefono.value=p.telefono||'';f.direccion.value=p.direccion||'';f.addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('memberContactMessage');out.textContent='Guardando…';try{const updated=await MemberAuth.updateContact({telefono:f.telefono.value,direccion:f.direccion.value});set('memberPhone',updated.telefono);set('memberAddress',updated.direccion);out.textContent='Datos de contacto actualizados.';}catch(err){out.textContent=err.message;}});}
   await loadFamily();
   status?.remove();
  }catch(err){if(status)status.textContent=`No se pudo cargar el área privada: ${err.message}`;}
 }
 document.addEventListener('DOMContentLoaded',()=>{load();document.querySelectorAll('[data-member-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-member-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('[data-member-panel]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector(`[data-member-panel="${b.dataset.memberTab}"]`)?.classList.add('active');});document.getElementById('memberLogout')?.addEventListener('click',async()=>{await MemberAuth.signOut();location.href='socios.html';});});
})();
