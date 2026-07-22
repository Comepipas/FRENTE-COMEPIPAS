(()=>{"use strict";
const $=s=>document.querySelector(s),S=window.OnTourV25,
esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),
fmt=v=>v?new Date(v).toLocaleString('es-ES'):'—',
local=v=>v?new Date(new Date(v)-new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
let trips=[],books=[],matches=[],stadiums=[],selectedImageFile=null;

function imageFallback(img){img.onerror=null;img.src='assets/images/on-tour/on-tour-preparando.png'}
async function cropImage(file){
  if(!file)return null;
  if(!file.type.startsWith('image/'))throw new Error('Selecciona una imagen válida.');
  if(file.size>15*1024*1024)throw new Error('La imagen supera los 15 MB.');
  const bitmap=await createImageBitmap(file),W=1600,H=900,target=W/H,source=bitmap.width/bitmap.height;
  let sx=0,sy=0,sw=bitmap.width,sh=bitmap.height;
  if(source>target){sw=bitmap.height*target;sx=(bitmap.width-sw)/2}else{sh=bitmap.width/target;sy=(bitmap.height-sh)/2}
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  canvas.getContext('2d').drawImage(bitmap,sx,sy,sw,sh,0,0,W,H);bitmap.close?.();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen.')),'image/webp',.84));
  return new File([blob],`${(file.name.replace(/\.[^.]+$/,'')||'on-tour')}.webp`,{type:'image/webp'});
}
function preview(src=''){
  const img=$('#travelImagePreview');
  if(!src){img.hidden=true;img.removeAttribute('src');return}
  img.src=src;img.hidden=false;img.onerror=()=>imageFallback(img);
}
async function load(){try{[trips,books,matches,stadiums]=await Promise.all([S.trips(true),S.bookings(),S.matches(),S.stadiums()]);render();fillMatches();$('#travelStatus').textContent='Conectado a Supabase.'}catch(e){$('#travelStatus').textContent=e.message}}
function fillMatches(){const sel=$('#matchSelect'),cur=sel.value;sel.innerHTML='<option value="">Seleccionar partido…</option>'+matches.map(m=>`<option value="${m.id}">${fmt(m.fecha_partido)} · ${esc(m.titulo||m.rival)}</option>`).join('');sel.value=cur}
function render(){
 $('#travelKpis').innerHTML=`<article class="on-tour-kpi"><span>ON TOUR</span><strong>${trips.length}</strong></article><article class="on-tour-kpi"><span>Solicitudes</span><strong>${books.length}</strong></article><article class="on-tour-kpi"><span>Personas solicitadas</span><strong>${books.reduce((a,x)=>a+Number(x.total_plazas||0),0)}</strong></article><article class="on-tour-kpi"><span>Duplicados admitidos</span><strong>0</strong></article>`;
 $('#travelCards').innerHTML=trips.length?trips.map(t=>`<article class="on-tour-card"><div class="on-tour-card-cover"><img src="${esc(t.imagen_url||t.escudo_url||'assets/images/on-tour/on-tour-preparando.png')}" alt="${esc(t.rival||t.titulo)}"></div><div class="on-tour-card-body"><span class="on-tour-badge">${esc(t.estado)}</span><h3>${esc(t.titulo)}</h3><div class="on-tour-destination"><strong>${esc(t.estadio||t.destino)}</strong><span>${esc(t.ciudad||'')}</span><span>${t.km_desde_rosaleda??'—'} km desde La Rosaleda</span><span>${fmt(t.fecha_salida)}</span></div><div class="on-tour-actions"><button data-edit="${t.id}">Editar</button><button data-del="${t.id}">Eliminar</button></div></div></article>`).join(''):'<p>No hay ningún ON TOUR preparado.</p>';
 document.querySelectorAll('#travelCards img').forEach(img=>img.onerror=()=>imageFallback(img));
 $('#travelBookings').innerHTML=books.length?books.map(b=>`<tr><td><strong>${esc(b.solicitante_nombre||`${b.socios?.nombre||''} ${b.socios?.apellidos||''}`)}</strong><br><small>Socio nº ${esc(b.socios?.numero_socio||'—')}</small></td><td>${esc(b.travel_events?.titulo||'')}</td><td>${b.total_plazas}</td><td>${esc(b.estado)}</td><td><span class="on-tour-badge">Bloqueados automáticamente</span></td><td><button data-manage="${b.id}">Revisar</button></td></tr>`).join(''):'<tr><td colspan="6">Todavía no hay solicitudes.</td></tr>'
}
function openTrip(t){
 const f=$('#travelForm');f.reset();selectedImageFile=null;
 ['id','match_id','titulo','rival','estadio','ciudad','km_desde_rosaleda','duracion_minutos','estado','escudo_url','imagen_url','imagen_path','descripcion'].forEach(k=>{if(f[k])f[k].value=t?.[k]??''});
 f.fecha_salida.value=local(t?.fecha_salida);f.cierre.value=local(t?.cierre);f.visible.checked=t?t.visible!==false:true;
 preview(t?.imagen_url||t?.escudo_url||'assets/images/on-tour/on-tour-preparando.png');$('#travelImageFile').value='';$('#travelModal').classList.add('open')
}
$('#travelImageFile').onchange=async e=>{try{selectedImageFile=await cropImage(e.target.files[0]);preview(URL.createObjectURL(selectedImageFile))}catch(x){selectedImageFile=null;e.target.value='';alert(x.message)}};
$('#matchSelect').onchange=e=>{const m=matches.find(x=>x.id===e.target.value);if(!m)return;const f=$('#travelForm'),st=stadiums.find(s=>s.equipo.toLowerCase()===String(m.rival||'').toLowerCase()||s.estadio.toLowerCase()===String(m.estadio||'').toLowerCase());f.titulo.value=`ON TOUR · ${m.rival}`;f.rival.value=m.rival||'';f.estadio.value=m.estadio||st?.estadio||'';f.ciudad.value=st?.ciudad||'';f.km_desde_rosaleda.value=st?.km_desde_rosaleda??'';f.duracion_minutos.value=st?.duracion_minutos??'';f.escudo_url.value=st?.escudo_url||'';f.fecha_salida.value=local(m.fecha_partido)};
$('#newTravel').onclick=()=>openTrip();
$('#travelCards').onclick=async e=>{if(e.target.dataset.edit)openTrip(trips.find(x=>x.id===e.target.dataset.edit));if(e.target.dataset.del&&confirm('¿Eliminar este ON TOUR y sus solicitudes?')){try{await S.delTrip(trips.find(x=>x.id===e.target.dataset.del));load()}catch(x){alert(x.message)}}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.on-tour-modal').classList.remove('open'));
$('#travelForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,o=Object.fromEntries(new FormData(f));o.visible=f.visible.checked;try{const btn=f.querySelector('[type="submit"]');btn.disabled=true;btn.textContent=selectedImageFile?'Subiendo imagen…':'Guardando…';await S.saveTrip(o,selectedImageFile);$('#travelModal').classList.remove('open');selectedImageFile=null;await load()}catch(x){alert(x.message)}finally{const btn=f.querySelector('[type="submit"]');btn.disabled=false;btn.textContent='Guardar'}};
$('#travelBookings').onclick=e=>{const id=e.target.dataset.manage;if(!id)return;const b=books.find(x=>x.id===id),f=$('#bookingForm');f.id.value=b.id;f.estado.value=b.estado;f.observaciones_admin.value=b.observaciones_admin||'';$('#bookingPeople').innerHTML=(b.on_tour_people||[]).map(p=>`<div class="on-tour-person"><strong>${esc(p.rol)} · ${esc(p.nombre_completo)}</strong><br><small>DNI: ${esc(p.dni_normalizado)} · Abonado: ${esc(p.abonado_normalizado)}</small></div>`).join('');$('#bookingModal').classList.add('open')};
$('#bookingForm').onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget)),id=o.id;delete o.id;try{await S.updateBooking(id,o);$('#bookingModal').classList.remove('open');load()}catch(x){alert(x.message)}};
$('#exportTravel').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+S.csv(books)],{type:'text/csv'}));a.download='on-tour-solicitudes.csv';a.click()};
document.addEventListener('DOMContentLoaded',load)
})();
