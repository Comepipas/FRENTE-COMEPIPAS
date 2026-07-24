(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let sb,campaigns=[],current=null,categories=[],records=[],issues=[],previewRows=[],previewPage=1;
const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(text,type='info'){ const box=$('#c28Message'); if(box) box.innerHTML=`<div class="c28-alert">${esc(text)}</div>`; }
function importMsg(text,type='info'){ const box=$('#importStatus'); if(box) box.innerHTML=`<div class="c28-alert ${type==='error'?'c28-alert-error':''}">${esc(text)}</div>`; }
async function init(){try{sb=(await FrenteSupabase.init()).client;$('#c28Connection').textContent='Supabase conectado';$('#c28Connection').className='badge badge-success';bind();await loadCampaigns();}catch(e){msg(e.message);$('#c28Connection').textContent='Sin conexión';}}
function bind(){
 $('#c28Reload').onclick=()=>loadAll(); $('#campaignSelect').onchange=async e=>{current=campaigns.find(c=>c.id===e.target.value);await loadAll();};
 $$('.c28-tab').forEach(b=>b.onclick=()=>{$$('.c28-tab').forEach(x=>x.classList.remove('active'));$$('.c28-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#tab-'+b.dataset.tab).classList.add('active');});
 $('#campaignForm').onsubmit=saveCampaign; $('#newCampaign').onclick=newCampaign; $('#duplicateCampaign').onclick=duplicateCampaign;
 $('#addCategory').onclick=addCategory; $('#previewExcel').onclick=previewExcel; $('#confirmImport').onclick=confirmImport;
 $('#recordSearch').oninput=renderRecords; $('#exportRecords').onclick=exportCSV; $('#pilotFind').onclick=findPilotMembers;
 $('#recordForm').onsubmit=saveRecord; $('#closeRecordModal').onclick=()=>$('#editRecordModal').classList.remove('open');
}
async function loadCampaigns(){const {data,error}=await sb.from('campanas_abonados').select('*').order('temporada',{ascending:false});if(error)throw error;campaigns=data||[];current=current&&campaigns.find(c=>c.id===current.id)||campaigns[0]||null;$('#campaignSelect').innerHTML=campaigns.map(c=>`<option value="${c.id}" ${c.id===current?.id?'selected':''}>${esc(c.nombre)}</option>`).join('');await loadAll();}
async function loadAll(){if(!current)return;const [a,b,c,d]=await Promise.all([sb.from('campanas_categorias').select('*').eq('campana_id',current.id).order('orden'),sb.from('campanas_registros').select('*,socios(numero_socio,nombre,apellidos,fecha_nacimiento)').eq('campana_id',current.id).order('created_at',{ascending:false}),sb.from('campanas_incidencias').select('*').eq('campana_id',current.id).order('created_at',{ascending:false}),sb.from('campanas_piloto_participantes').select('*,socios(numero_socio,nombre,apellidos)').eq('campana_id',current.id)]);for(const r of [a,b,c,d])if(r.error)throw r.error;categories=a.data||[];records=b.data||[];issues=c.data||[];renderCampaign();renderCategories();renderRecords();renderIssues();renderPilot(d.data||[]);}
function renderCampaign(){const f=$('#campaignForm');for(const k of ['temporada','nombre','tipo','estado','fecha_corte','texto_socio'])if(f[k])f[k].value=current[k]||'';f.fecha_apertura.value=current.fecha_apertura?.slice(0,16)||'';f.fecha_cierre.value=current.fecha_cierre?.slice(0,16)||'';f.pago_online_activo.value=String(current.pago_online_activo);f.modo_pruebas.value=String(current.modo_pruebas);f.altas_post_cierre.value=String(current.altas_post_cierre);
 $('#campaignSummary').innerHTML=`<p><span class="c28-badge ${current.modo_pruebas?'test':'ok'}">${esc(current.tipo.toUpperCase())}</span> <span class="c28-badge">${esc(current.estado)}</span></p><p>${esc(current.texto_socio||'Sin texto configurado')}</p>`;
 const paid=records.filter(r=>r.estado==='pagado').length,collected=records.reduce((s,r)=>s+Number(r.importe_pagado||0),0),fees=records.reduce((s,r)=>s+Number(r.cuota_final||0),0),discounts=records.reduce((s,r)=>s+Number(r.descuento_club||0),0);$('#mTotal').textContent=records.length;$('#mPaid').textContent=paid;$('#mCollected').textContent=euro(collected);$('#mIssues').textContent=issues.filter(i=>i.estado==='abierta').length;$('#dPena').textContent=records.filter(r=>r.gestion_abono==='pena').length;$('#dClub').textContent=records.filter(r=>r.gestion_abono==='club').length;$('#dFees').textContent=euro(fees);$('#dDiscounts').textContent=euro(discounts);const p=records.length?Math.round(paid*100/records.length):0;$('#paidProgress').style.width=p+'%';$('#paidProgressText').textContent=p+'% completado';}
async function saveCampaign(e){e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));for(const k of ['pago_online_activo','modo_pruebas','altas_post_cierre'])fd[k]=fd[k]==='true';for(const k of ['fecha_apertura','fecha_cierre'])fd[k]=fd[k]?new Date(fd[k]).toISOString():null;const {data,error}=await sb.from('campanas_abonados').update(fd).eq('id',current.id).select().single();if(error)return msg(error.message);current=data;campaigns=campaigns.map(c=>c.id===data.id?data:c);msg('Configuración guardada.');renderCampaign();}
async function newCampaign(){const season=prompt('Temporada, por ejemplo 2028/29');if(!season)return;const type=prompt('Tipo: real, piloto o historica','real')||'real';const {data,error}=await sb.from('campanas_abonados').insert({temporada:season,nombre:`Campaña ${season}`,tipo:type,modo_pruebas:type==='piloto',pago_online_activo:type!=='historica'}).select().single();if(error)return msg(error.message);await sb.from('campanas_categorias').insert([{campana_id:data.id,nombre:'Infantil',edad_min:0,edad_max:13,cuota:0,orden:1},{campana_id:data.id,nombre:'Joven',edad_min:14,edad_max:25,cuota:10,orden:2},{campana_id:data.id,nombre:'Adulto',edad_min:26,edad_max:null,cuota:20,orden:3}]);current=data;await loadCampaigns();}
async function duplicateCampaign(){if(!current)return;const season=prompt('Temporada de la copia','2028/29');if(!season)return;const type=prompt('Tipo de la copia','piloto')||'piloto';const copy={temporada:season,nombre:`Campaña ${type} ${season}`,tipo:type,estado:'borrador',fecha_corte:null,pago_online_activo:type!=='historica',modo_pruebas:type==='piloto',altas_post_cierre:true,texto_socio:type==='piloto'?'CAMPAÑA DE PRUEBAS: ningún pago es real.':current.texto_socio,configuracion:current.configuracion};const {data,error}=await sb.from('campanas_abonados').insert(copy).select().single();if(error)return msg(error.message);if(categories.length)await sb.from('campanas_categorias').insert(categories.map(x=>({campana_id:data.id,nombre:x.nombre,edad_min:x.edad_min,edad_max:x.edad_max,cuota:x.cuota,orden:x.orden,activa:x.activa})));current=data;await loadCampaigns();}
function renderCategories(){$('#categoryList').innerHTML=`<table class="c28-table"><thead><tr><th>Nombre</th><th>Edad mín.</th><th>Edad máx.</th><th>Cuota</th><th></th></tr></thead><tbody>${categories.map(c=>`<tr><td><input data-cat="${c.id}" data-field="nombre" value="${esc(c.nombre)}"></td><td><input type="number" data-cat="${c.id}" data-field="edad_min" value="${c.edad_min}"></td><td><input type="number" data-cat="${c.id}" data-field="edad_max" value="${c.edad_max??''}"></td><td><input type="number" step="0.01" data-cat="${c.id}" data-field="cuota" value="${c.cuota}"></td><td><button class="btn btn-secondary" data-save-cat="${c.id}">Guardar</button></td></tr>`).join('')}</tbody></table>`;$$('[data-save-cat]').forEach(b=>b.onclick=()=>saveCategory(b.dataset.saveCat));}
async function addCategory(){const {error}=await sb.from('campanas_categorias').insert({campana_id:current.id,nombre:'Nueva categoría',edad_min:0,cuota:0,orden:categories.length+1});if(error)return msg(error.message);await loadAll();}
async function saveCategory(id){const o={};$$(`[data-cat="${id}"]`).forEach(i=>o[i.dataset.field]=i.value===''?null:(['edad_min','edad_max','cuota'].includes(i.dataset.field)?Number(i.value):i.value));const {error}=await sb.from('campanas_categorias').update(o).eq('id',id);if(error)return msg(error.message);msg('Categoría guardada.');await loadAll();}
function normalizeKey(k){return String(k||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function pick(row,names){const map=Object.fromEntries(Object.entries(row).map(([k,v])=>[normalizeKey(k),v]));for(const n of names){const v=map[normalizeKey(n)];if(v!==undefined&&v!=='')return v;}return null;}
function renderImportPreview(){
 const pageSize=50,total=previewRows.length,pages=Math.max(1,Math.ceil(total/pageSize));
 previewPage=Math.min(Math.max(1,previewPage),pages);
 const start=(previewPage-1)*pageSize,shown=previewRows.slice(start,start+pageSize),headers=Object.keys(previewRows[0]||{});
 $('#importPreview').innerHTML=`<p><strong>${total}</strong> filas detectadas. Mostrando ${start+1}-${Math.min(start+pageSize,total)}.</p><div style="overflow:auto;max-height:560px"><table class="c28-table"><thead><tr>${headers.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${shown.map(r=>`<tr>${headers.map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 $('#importPager').innerHTML=pages>1?`<button type="button" class="btn btn-secondary" id="previewPrev" ${previewPage===1?'disabled':''}>← Anteriores</button><strong>Página ${previewPage} de ${pages}</strong><button type="button" class="btn btn-secondary" id="previewNext" ${previewPage===pages?'disabled':''}>Siguientes →</button>`:'';
 if($('#previewPrev')) $('#previewPrev').onclick=()=>{previewPage--;renderImportPreview();};
 if($('#previewNext')) $('#previewNext').onclick=()=>{previewPage++;renderImportPreview();};
}
async function previewExcel(){
 try{
  const file=$('#excelFile').files[0];if(!file)return importMsg('Selecciona un archivo.','error');
  importMsg('Analizando el archivo…');
  const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});
  previewRows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
  if(!previewRows.length)return importMsg('El archivo no contiene filas.','error');
  previewPage=1;renderImportPreview();$('#confirmImport').disabled=false;
  importMsg(`Archivo preparado: ${previewRows.length} filas. Revísalas y pulsa Confirmar importación.`);
 }catch(e){console.error(e);importMsg(`No se pudo analizar el archivo: ${e.message}`,'error');}
}
async function confirmImport(){
 if(!previewRows.length)return importMsg('Primero analiza un archivo.','error');
 const button=$('#confirmImport');button.disabled=true;button.textContent='Importando…';
 importMsg(`Importando ${previewRows.length} filas. No cierres esta página…`);
 try{
  const {data:members,error:merr}=await sb.from('socios').select('id,numero_socio,nombre,apellidos,dni,fecha_nacimiento');
  if(merr)throw merr;
  const byDni=new Map((members||[]).filter(m=>m.dni).map(m=>[normalizeKey(m.dni),m]));
  const origin=$('#importOrigin').value,matchedByMember=new Map(),unmatched=[],newIssues=[],duplicateMembers=[];
  for(const [index,r] of previewRows.entries()){
   const dni=String(pick(r,['dni','nif','n.i.f.','dni/nif','documento'])||'').trim();
   const name=String(pick(r,['nombre','nombre y apellidos','abonado','socio'])||'').trim();
   const member=byDni.get(normalizeKey(dni));
   const price=Number(pick(r,['cuota de abono con descuento (euros)','precio final','importe final','precio abono','importe abono','total abono'])||0);
   const original=Number(pick(r,['cuota de abono euros','precio original','precio'])||price);
   const discount=Number(pick(r,['descuento','descuentos','cesion','cesión'])||0);
   const fee=Number(pick(r,['cuota pena','cuota peña','cuota socio'])||0);
   const paid=Number(pick(r,['importe pagado','pagado','total cobrado'])||0);
   const gestion=normalizeKey(pick(r,['gestion abono','renovacion','tramitado por'])||'').includes('club')?'club':'pena';
   const row={campana_id:current.id,socio_id:member?.id||null,origen:origin,dni_club:dni||null,nombre_club:name||null,zona_club:pick(r,['nombre zona del abono','zona','sector']),categoria_club:pick(r,['tipo de abono','tipo abono','categoria','categoría']),precio_original:original,descuento_club:discount,precio_abono:price,categoria_pena:pick(r,['categoria pena','categoría peña']),cuota_base:fee,cuota_final:fee,gestion_abono:gestion,estado:paid>0?'pagado':(member?'pendiente_revision':'incidencia'),forma_pago:pick(r,['forma pago','metodo pago','método pago'])||null,importe_pagado:paid,datos_origen:r};
   if(member){
    if(matchedByMember.has(member.id)){duplicateMembers.push(name||dni||`fila ${index+2}`);newIssues.push({campana_id:current.id,tipo:'duplicado_en_excel',gravedad:'alta',descripcion:`El socio ${name||dni} aparece más de una vez en el Excel. Se ha conservado la última fila.`});}
    matchedByMember.set(member.id,row);
   }else{
    unmatched.push(row);newIssues.push({campana_id:current.id,tipo:'socio_no_localizado',gravedad:'alta',descripcion:`No se encontró socio para ${name||dni||`fila ${index+2}`}`});
   }
  }
  const matched=[...matchedByMember.values()];
  if(matched.length){const {error}=await sb.from('campanas_registros').upsert(matched,{onConflict:'campana_id,socio_id',ignoreDuplicates:false});if(error)throw error;}
  if(unmatched.length){const {error}=await sb.from('campanas_registros').insert(unmatched);if(error)throw error;}
  if(newIssues.length){const {error}=await sb.from('campanas_incidencias').insert(newIssues);if(error)throw error;}
  const total=matched.length+unmatched.length;
  importMsg(`Importación completada: ${total} registros guardados, ${unmatched.length} sin vincular y ${duplicateMembers.length} duplicados detectados.`);
  previewRows=[];previewPage=1;$('#importPreview').innerHTML='';$('#importPager').innerHTML='';button.textContent='Importación completada';
  await loadAll();
 }catch(e){
  console.error(e);button.disabled=false;button.textContent='Confirmar importación';
  importMsg(`No se pudo completar la importación: ${e.message}`,'error');
 }
}
function renderRecords(){const q=normalizeKey($('#recordSearch').value);const list=records.filter(r=>!q||normalizeKey(`${r.socios?.numero_socio} ${r.socios?.nombre} ${r.socios?.apellidos} ${r.nombre_club}`).includes(q));$('#recordsBody').innerHTML=list.map(r=>`<tr><td>${esc(r.socios?`${r.socios.numero_socio||''} ${r.socios.nombre||''} ${r.socios.apellidos||''}`:r.nombre_club||'No vinculado')}</td><td>${esc(r.gestion_abono)}</td><td>${euro(r.precio_abono)}</td><td>${euro(r.cuota_final)}${r.es_directivo?' <span class="c28-badge ok">Directivo</span>':''}</td><td>${euro(r.importe_total)}</td><td>${euro(r.importe_pagado)}</td><td><span class="c28-badge">${esc(r.estado)}</span></td><td><button class="btn btn-secondary" data-edit="${r.id}">Editar</button></td></tr>`).join('');$$('[data-edit]').forEach(b=>b.onclick=()=>openRecord(b.dataset.edit));}
function openRecord(id){const r=records.find(x=>x.id===id),f=$('#recordForm');for(const k of ['id','gestion_abono','estado','precio_abono','descuento_club','cuota_final','importe_pagado','forma_pago','observaciones'])f[k].value=r[k]??'';f.es_directivo.value=String(r.es_directivo);$('#editRecordModal').classList.add('open');}
async function saveRecord(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target));const id=o.id;delete o.id;for(const k of ['precio_abono','descuento_club','cuota_final','importe_pagado'])o[k]=Number(o[k]||0);o.es_directivo=o.es_directivo==='true';if(o.es_directivo)o.cuota_final=0;if(!o.forma_pago)o.forma_pago=null;if(o.estado==='pagado'&&!o.fecha_pago)o.fecha_pago=new Date().toISOString();const {error}=await sb.from('campanas_registros').update(o).eq('id',id);if(error)return msg(error.message);$('#editRecordModal').classList.remove('open');await loadAll();}
function exportCSV(){const h=['Socio','Gestion','Precio abono','Descuento','Cuota','Total','Pagado','Estado'];const lines=[h,...records.map(r=>[`${r.socios?.nombre||''} ${r.socios?.apellidos||''}`,r.gestion_abono,r.precio_abono,r.descuento_club,r.cuota_final,r.importe_total,r.importe_pagado,r.estado])].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+lines],{type:'text/csv'}));a.download=`campana-${current.temporada.replace('/','-')}.csv`;a.click();}
async function findPilotMembers(){const q=$('#pilotSearch').value.trim();let req=sb.from('socios').select('id,numero_socio,nombre,apellidos').limit(20);if(q)req=req.or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%`);const {data,error}=await req;if(error)return msg(error.message);$('#pilotResults').innerHTML=(data||[]).map(m=>`<div class="c28-family-item"><span>${esc(m.numero_socio||'')} ${esc(m.nombre)} ${esc(m.apellidos)}</span><button class="btn btn-primary" data-invite="${m.id}">Invitar</button></div>`).join('');$$('[data-invite]').forEach(b=>b.onclick=()=>invitePilot(b.dataset.invite));}
async function invitePilot(id){if(current.tipo!=='piloto')return msg('Selecciona una campaña de tipo piloto.');const {error}=await sb.from('campanas_piloto_participantes').upsert({campana_id:current.id,socio_id:id});if(error)return msg(error.message);await loadAll();}
function renderPilot(list){$('#pilotParticipants').innerHTML=list.map(x=>`<div class="c28-family-item"><span>${esc(x.socios?.numero_socio||'')} ${esc(x.socios?.nombre||'')} ${esc(x.socios?.apellidos||'')}</span><span class="c28-badge ${x.completado_at?'ok':'test'}">${x.completado_at?'Completado':'Pendiente'}</span></div>`).join('')||'<p>Sin participantes.</p>';}
function renderIssues(){$('#issuesList').innerHTML=issues.map(i=>`<article class="c28-card"><span>${esc(i.tipo)} · ${esc(i.gravedad)}</span><strong style="font-size:1rem">${esc(i.descripcion)}</strong><p>${esc(i.estado)}</p></article>`).join('')||'<p>No hay incidencias.</p>';}
document.addEventListener('DOMContentLoaded',init);
})();
