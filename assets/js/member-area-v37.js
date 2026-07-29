(() => {
 'use strict';
 const fmtDate=v=>v?new Intl.DateTimeFormat('es-ES').format(new Date(v+'T12:00:00')):'—';
 const euro=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v)):'—';
 const set=(id,v)=>{document.querySelectorAll(`#${id}`).forEach(el=>el.textContent=v??'—');};
 const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labelRelation=v=>({padre:'Padre',madre:'Madre',tutor_legal:'Tutor legal'})[v]||'Tutor/a';
 let currentProfile=null;

 async function loadFamily(){
  const section=document.getElementById('memberFamilySection'),list=document.getElementById('memberFamilyList');
  if(!section||!list)return;
  try{
   const c=await MemberAuth.client(),{data,error}=await c.rpc('my_linked_minors');
   if(error)throw error; const rows=Array.isArray(data)?data:[];
   if(!rows.length){section.hidden=true;return;} section.hidden=false;
   list.innerHTML=rows.map(x=>`<article class="member-family-item"><div><strong>${escapeHtml([x.nombre,x.apellidos].filter(Boolean).join(' '))}</strong><small>${escapeHtml(labelRelation(x.parentesco))} · ${escapeHtml(x.categoria||'Menor')}</small><p class="member-family-note">Perfil vinculado a tu cuenta.</p></div><div><span>${x.numero_socio?`Socio nº ${escapeHtml(String(x.numero_socio).padStart(3,'0'))}`:'Número pendiente'}</span><strong>${x.cuota_al_dia?'Al día':'Pendiente'}</strong></div></article>`).join('');
  }catch(err){console.warn('[Commit 37] Menores vinculados:',err.message||err);section.hidden=true;}
 }

 async function loadRealPayment(profile){
  const box=document.getElementById('memberRealPayment'),empty=document.getElementById('memberNoRealPayment');
  try{
   const c=await MemberAuth.client();
   const {data,error}=await c.from('campanas_registros').select('importe_pagado,precio_abono,cuota_final,forma_pago,estado,zona_club,created_at,campanas(temporada)').eq('socio_id',profile.id).order('created_at',{ascending:false}).limit(10);
   if(error)throw error;
   const rows=(data||[]).filter(r=>String(r.campanas?.temporada||'').includes('2026')||String(r.campanas?.temporada||'').includes('26/27'));
   const r=rows[0]||(data||[])[0];
   if(!r){set('renewalStatus','Sin registro');set('memberRenewalSummary','Importe no disponible');return;}
   set('realSeasonTicket',r.precio_abono!=null?euro(r.precio_abono):'No desglosado');
   set('realPeñaFee',r.cuota_final!=null?euro(r.cuota_final):'No desglosada');
   set('realPaidTotal',r.importe_pagado!=null?euro(r.importe_pagado):'No disponible');
   set('realPaymentMethod',r.forma_pago||'No indicada');set('realPaymentStatus',r.estado||'Registrado');set('realPaymentSector',r.zona_club||profile.sector||'No indicado');
   set('renewalStatus',String(r.estado||'Registrado').replaceAll('_',' '));set('memberRenewalSummary',r.importe_pagado!=null?`${euro(r.importe_pagado)} registrado`:'Registro encontrado');
   if(box)box.hidden=false;if(empty)empty.hidden=true;
  }catch(err){console.warn('[Commit 37] Pago real no disponible:',err.message||err);set('renewalStatus','No disponible');set('memberRenewalSummary','Importe no disponible');}
 }

 async function load(){
  const status=document.getElementById('memberAreaStatus');
  try{
   const s=await MemberAuth.session();if(!s){location.replace('socios.html');return;}
   const p=await MemberAuth.profile();if(!p){await MemberAuth.signOut();location.replace('activar-cuenta.html');return;} currentProfile=p;
   const name=[p.nombre,p.apellidos].filter(Boolean).join(' ');
   set('memberName',name);set('memberFirstName',p.nombre||'socio');set('memberNumber',p.numero_socio?`Socio nº ${String(p.numero_socio).padStart(3,'0')}`:'Número de socio pendiente');set('memberStatus',p.estado||'Activo');set('memberType',p.categoria||'Sin categoría');set('memberFee',p.cuota_al_dia?'Al día':'Pendiente');set('memberFeeSummary',p.cuota_al_dia?'Todo al día':'Tienes una cuota pendiente');set('memberEmail',p.email);set('memberPhone',p.telefono);set('memberAddress',p.direccion);set('memberSince',fmtDate(p.fecha_alta));set('memberBirthDate',fmtDate(p.fecha_nacimiento));set('memberAge',p.edad_actual!=null?`${p.edad_actual} años`:'—');
   const photo=p.foto_url||'assets/images/socios/socio-demo.jpg';['memberPhoto','memberCardPhoto'].forEach(id=>{const el=document.getElementById(id);if(el)el.src=photo;});
   const f=document.getElementById('memberContactForm');if(f){f.telefono.value=p.telefono||'';f.direccion.value=p.direccion||'';f.addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('memberContactMessage');out.textContent='Guardando…';try{const updated=await MemberAuth.updateContact({telefono:f.telefono.value,direccion:f.direccion.value});set('memberPhone',updated.telefono);set('memberAddress',updated.direccion);out.textContent='Datos de contacto actualizados.';}catch(err){out.textContent=err.message;}});}
   await Promise.allSettled([loadFamily(),loadRealPayment(p)]);status?.remove();
  }catch(err){if(status)status.textContent=`No se pudo cargar el área privada: ${err.message}`;}
 }
 function closeMenus(){document.getElementById('webMenuDrawer')?.setAttribute('hidden','');document.body.classList.remove('menu-open');}
 function openMenu(){document.getElementById('webMenuDrawer')?.removeAttribute('hidden');document.body.classList.add('menu-open');}
 function openTab(tab){document.querySelectorAll('[data-member-tab]').forEach(x=>x.classList.toggle('active',x.dataset.memberTab===tab));document.querySelectorAll('[data-member-panel]').forEach(x=>x.classList.toggle('active',x.dataset.memberPanel===tab));closeMenus();window.scrollTo({top:0,behavior:'smooth'});}
 async function logout(){await MemberAuth.signOut();location.href='socios.html';}
 document.addEventListener('DOMContentLoaded',()=>{
  load();document.querySelectorAll('[data-member-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.memberTab));document.querySelectorAll('[data-open-member-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.openMemberTab));
  document.querySelectorAll('[data-menu-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.menuTab));document.querySelectorAll('[data-close-web-menu]').forEach(b=>b.onclick=closeMenus);
  document.getElementById('webMenuButton')?.addEventListener('click',openMenu);document.getElementById('memberMoreButton')?.addEventListener('click',openMenu);
  document.querySelectorAll('[data-scroll-material]').forEach(b=>b.onclick=()=>document.getElementById('mis-solicitudes-material')?.scrollIntoView({behavior:'smooth'}));
  ['memberLogout','memberLogoutMore','memberLogoutDrawer'].forEach(id=>document.getElementById(id)?.addEventListener('click',logout));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus();});
 });
})();
