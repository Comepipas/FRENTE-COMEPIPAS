(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let sb,campaigns=[],current=null,categories=[],records=[],issues=[],members=[],previewRows=[],previewPage=1,previewAnalysis=null,simulationRows=[];
const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msg(text,type='info'){ const box=$('#c28Message'); if(box) box.innerHTML=`<div class="c28-alert">${esc(text)}</div>`; }
function importMsg(text,type='info'){ const box=$('#importStatus'); if(box) box.innerHTML=`<div class="c28-alert ${type==='error'?'c28-alert-error':''}">${esc(text)}</div>`; }
async function init(){try{sb=(await FrenteSupabase.init()).client;$('#c28Connection').textContent='Supabase conectado';$('#c28Connection').className='badge badge-success';bind();await loadCampaigns();}catch(e){msg(e.message);$('#c28Connection').textContent='Sin conexión';}}
function bind(){
 $('#c28Reload').onclick=()=>loadAll(); $('#campaignSelect').onchange=async e=>{current=campaigns.find(c=>c.id===e.target.value);await loadAll();};
 $$('.c28-tab').forEach(b=>b.onclick=()=>{$$('.c28-tab').forEach(x=>x.classList.remove('active'));$$('.c28-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#tab-'+b.dataset.tab).classList.add('active');});
 $('#campaignForm').onsubmit=saveCampaign; $('#newCampaign').onclick=newCampaign; $('#duplicateCampaign').onclick=duplicateCampaign;
 $('#addCategory').onclick=addCategory; $('#previewExcel').onclick=previewExcel; $('#confirmImport').onclick=confirmImport; $('#cancelImport').onclick=cancelImport; $('#importMode').onchange=updateImportButton;
 $('#recordSearch').oninput=renderRecords; $('#exportRecords').onclick=exportCSV; $('#pilotFind').onclick=findPilotMembers;
 $('#recordForm').onsubmit=saveRecord; $('#closeRecordModal').onclick=()=>$('#editRecordModal').classList.remove('open');
 $('#runDiagnosis').onclick=runDiagnosis; $('#runSimulation').onclick=runSimulation; $('#applyCalculation').onclick=applyCalculatedFees; $('#engineSearch').oninput=renderSimulationRows; $('#exportSimulation').onclick=exportSimulationCSV;
}
async function loadCampaigns(){const {data,error}=await sb.from('campanas_abonados').select('*').order('temporada',{ascending:false});if(error)throw error;campaigns=data||[];current=current&&campaigns.find(c=>c.id===current.id)||campaigns[0]||null;$('#campaignSelect').innerHTML=campaigns.map(c=>`<option value="${c.id}" ${c.id===current?.id?'selected':''}>${esc(c.nombre)}</option>`).join('');await loadAll();}
async function loadAll(){if(!current)return;const [a,b,c,d,e]=await Promise.all([sb.from('campanas_categorias').select('*').eq('campana_id',current.id).order('orden'),sb.from('campanas_registros').select('*,socios(numero_socio,nombre,apellidos,fecha_nacimiento)').eq('campana_id',current.id).order('created_at',{ascending:false}),sb.from('campanas_incidencias').select('*').eq('campana_id',current.id).order('created_at',{ascending:false}),sb.from('campanas_piloto_participantes').select('*,socios(numero_socio,nombre,apellidos)').eq('campana_id',current.id),sb.from('socios').select('id,fecha_nacimiento,estado')]);for(const r of [a,b,c,d,e])if(r.error)throw r.error;categories=a.data||[];records=b.data||[];issues=c.data||[];members=(e.data||[]).filter(x=>x.estado!=='baja');renderCampaign();renderCategories();renderRecords();renderIssues();renderPilot(d.data||[]);runDiagnosis(false);runSimulation(false);}
function renderCampaign(){const f=$('#campaignForm');for(const k of ['temporada','nombre','tipo','estado','fecha_corte','texto_socio'])if(f[k])f[k].value=current[k]||'';f.fecha_apertura.value=current.fecha_apertura?.slice(0,16)||'';f.fecha_cierre.value=current.fecha_cierre?.slice(0,16)||'';f.pago_online_activo.value=String(current.pago_online_activo);f.modo_pruebas.value=String(current.modo_pruebas);f.altas_post_cierre.value=String(current.altas_post_cierre);
 $('#campaignSummary').innerHTML=`<p><span class="c28-badge ${current.modo_pruebas?'test':'ok'}">${esc(current.tipo.toUpperCase())}</span> <span class="c28-badge">${esc(current.estado)}</span></p><p>${esc(current.texto_socio||'Sin texto configurado')}</p>`;
 const paid=records.filter(r=>r.estado==='pagado').length,collected=records.reduce((s,r)=>s+Number(r.importe_pagado||0),0),fees=records.reduce((s,r)=>s+Number(r.cuota_final||0),0),discounts=records.reduce((s,r)=>s+Number(r.descuento_club||0),0);$('#mTotal').textContent=records.length;$('#mPaid').textContent=paid;$('#mCollected').textContent=euro(collected);$('#mIssues').textContent=issues.filter(i=>i.estado==='abierta').length;$('#dPena').textContent=records.filter(r=>r.gestion_abono==='pena').length;$('#dClub').textContent=records.filter(r=>r.gestion_abono==='club').length;$('#dFees').textContent=euro(fees);$('#dDiscounts').textContent=euro(discounts);const p=records.length?Math.round(paid*100/records.length):0;$('#paidProgress').style.width=p+'%';$('#paidProgressText').textContent=p+'% completado';}
async function saveCampaign(e){e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));for(const k of ['pago_online_activo','modo_pruebas','altas_post_cierre'])fd[k]=fd[k]==='true';for(const k of ['fecha_apertura','fecha_cierre'])fd[k]=fd[k]?new Date(fd[k]).toISOString():null;const {data,error}=await sb.from('campanas_abonados').update(fd).eq('id',current.id).select().single();if(error)return msg(error.message);current=data;campaigns=campaigns.map(c=>c.id===data.id?data:c);msg('Configuración guardada.');renderCampaign();}
async function newCampaign(){const season=prompt('Temporada, por ejemplo 2028/29');if(!season)return;const type=prompt('Tipo: real, piloto o historica','real')||'real';const {data,error}=await sb.from('campanas_abonados').insert({temporada:season,nombre:`Campaña ${season}`,tipo:type,modo_pruebas:type==='piloto',pago_online_activo:type!=='historica'}).select().single();if(error)return msg(error.message);await sb.from('campanas_categorias').insert([{campana_id:data.id,nombre:'Infantil',nacimiento_desde:null,nacimiento_hasta:null,cuota:0,orden:1},{campana_id:data.id,nombre:'Joven',nacimiento_desde:null,nacimiento_hasta:null,cuota:10,orden:2},{campana_id:data.id,nombre:'Adulto',nacimiento_desde:null,nacimiento_hasta:null,cuota:20,orden:3}]);current=data;await loadCampaigns();}
async function duplicateCampaign(){if(!current)return;const season=prompt('Temporada de la copia','2028/29');if(!season)return;const type=prompt('Tipo de la copia','piloto')||'piloto';const copy={temporada:season,nombre:`Campaña ${type} ${season}`,tipo:type,estado:'borrador',fecha_corte:null,pago_online_activo:type!=='historica',modo_pruebas:type==='piloto',altas_post_cierre:true,texto_socio:type==='piloto'?'CAMPAÑA DE PRUEBAS: ningún pago es real.':current.texto_socio,configuracion:current.configuracion};const {data,error}=await sb.from('campanas_abonados').insert(copy).select().single();if(error)return msg(error.message);if(categories.length)await sb.from('campanas_categorias').insert(categories.map(x=>({campana_id:data.id,nombre:x.nombre,nacimiento_desde:x.nacimiento_desde,nacimiento_hasta:x.nacimiento_hasta,cuota:x.cuota,orden:x.orden,activa:x.activa}))); current=data;await loadCampaigns();}
function categoryMemberCount(c){if(!c.nacimiento_desde||!c.nacimiento_hasta)return 0;return members.filter(m=>m.fecha_nacimiento&&m.fecha_nacimiento>=c.nacimiento_desde&&m.fecha_nacimiento<=c.nacimiento_hasta).length;}
function renderCategories(){
 const missing=categories.filter(c=>c.activa&&(!c.nacimiento_desde||!c.nacimiento_hasta)).length;
 const overlaps=categories.filter((c,i)=>c.activa&&c.nacimiento_desde&&c.nacimiento_hasta&&categories.some((o,j)=>j!==i&&o.activa&&o.nacimiento_desde&&o.nacimiento_hasta&&c.nacimiento_desde<=o.nacimiento_hasta&&c.nacimiento_hasta>=o.nacimiento_desde)).length;
 $('#categoryList').innerHTML=`<div class="c28-alert"><strong>Regla de cálculo:</strong> la categoría se determina únicamente por la fecha de nacimiento. Las dos fechas son inclusivas. ${missing?`⚠️ ${missing} categoría(s) sin fechas.`:'✅ Todas las categorías activas tienen fechas.'} ${overlaps?`⚠️ Hay ${overlaps} rango(s) solapado(s).`:'✅ No hay solapamientos.'}</div><table class="c28-table"><thead><tr><th>Nombre</th><th>Nacidos desde</th><th>Nacidos hasta</th><th>Cuota</th><th>Socios incluidos</th><th>Activa</th><th></th></tr></thead><tbody>${categories.map(c=>`<tr><td><input data-cat="${c.id}" data-field="nombre" value="${esc(c.nombre)}"></td><td><input type="date" data-cat="${c.id}" data-field="nacimiento_desde" value="${c.nacimiento_desde||''}"></td><td><input type="date" data-cat="${c.id}" data-field="nacimiento_hasta" value="${c.nacimiento_hasta||''}"></td><td><input type="number" min="0" step="0.01" data-cat="${c.id}" data-field="cuota" value="${c.cuota}"></td><td><strong>${categoryMemberCount(c)}</strong></td><td><input type="checkbox" data-cat="${c.id}" data-field="activa" ${c.activa?'checked':''}></td><td><button class="btn btn-secondary" data-save-cat="${c.id}">Guardar</button></td></tr>`).join('')}</tbody></table>`;$$('[data-save-cat]').forEach(b=>b.onclick=()=>saveCategory(b.dataset.saveCat));
}
async function addCategory(){const {error}=await sb.from('campanas_categorias').insert({campana_id:current.id,nombre:'Nueva categoría',nacimiento_desde:null,nacimiento_hasta:null,cuota:0,orden:categories.length+1,activa:true});if(error)return msg(error.message);await loadAll();}
async function saveCategory(id){const o={};$$(`[data-cat="${id}"]`).forEach(i=>{o[i.dataset.field]=i.type==='checkbox'?i.checked:(i.value===''?null:(i.dataset.field==='cuota'?Number(i.value):i.value));});if(!o.nacimiento_desde||!o.nacimiento_hasta)return msg('Debes indicar las dos fechas de nacimiento de la categoría.');if(o.nacimiento_desde>o.nacimiento_hasta)return msg('La fecha «Nacidos desde» no puede ser posterior a «Nacidos hasta».');const overlap=categories.some(c=>c.id!==id&&c.activa&&o.activa&&c.nacimiento_desde&&c.nacimiento_hasta&&o.nacimiento_desde<=c.nacimiento_hasta&&o.nacimiento_hasta>=c.nacimiento_desde);if(overlap)return msg('Este rango se solapa con otra categoría activa. Corrige las fechas antes de guardar.');const {error}=await sb.from('campanas_categorias').update(o).eq('id',id);if(error)return msg(error.message);msg('Categoría y fechas guardadas.');await loadAll();}
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
function cancelImport(){
 previewRows=[];previewAnalysis=null;previewPage=1;
 $('#excelFile').value='';$('#importPreview').innerHTML='';$('#importPager').innerHTML='';$('#importStatus').innerHTML='';
 $('#importAnalysis').hidden=true;$('#importAnalysis').innerHTML='';$('#confirmImport').disabled=true;$('#cancelImport').disabled=true;
 updateImportButton();
}
function updateImportButton(){
 const b=$('#confirmImport'),mode=$('#importMode')?.value||'campaign_only';
 b.textContent=mode==='create_members'?'Crear socios e importar campaña':'Importar solo la campaña';
}
function rowIdentity(r,index){
 const dni=String(pick(r,['dni','nif','n.i.f.','dni/nif','documento'])||'').trim().toUpperCase();
 const name=String(pick(r,['nombre','nombre y apellidos','abonado','socio'])||'').trim();
 return {dni,name,key:normalizeKey(dni),index};
}
async function analyseRows(){
 const {data:members,error}=await sb.from('socios').select('id,numero_socio,nombre,apellidos,dni,fecha_nacimiento');
 if(error)throw error;
 const existingByDni=new Map((members||[]).filter(m=>m.dni).map(m=>[normalizeKey(m.dni),m]));
 const firstByDni=new Map(),duplicates=[],missingDni=[],valid=[];
 previewRows.forEach((r,index)=>{
  const ident=rowIdentity(r,index);
  if(!ident.key){missingDni.push({...ident,row:r});return;}
  if(firstByDni.has(ident.key)){duplicates.push({...ident,row:r,firstIndex:firstByDni.get(ident.key).index});return;}
  firstByDni.set(ident.key,{...ident,row:r});valid.push({...ident,row:r});
 });
 const existing=valid.filter(x=>existingByDni.has(x.key));
 const newMembers=valid.filter(x=>!existingByDni.has(x.key));
 return {members:members||[],existingByDni,valid,existing,newMembers,duplicates,missingDni};
}
function renderAnalysis(){
 const a=previewAnalysis;if(!a)return;
 const box=$('#importAnalysis');box.hidden=false;
 box.innerHTML=`<div class="c283-kpis"><article><span>Filas del Excel</span><strong>${previewRows.length}</strong></article><article><span>DNI válidos únicos</span><strong>${a.valid.length}</strong></article><article><span>Ya existen en socios</span><strong>${a.existing.length}</strong></article><article><span>Socios nuevos</span><strong>${a.newMembers.length}</strong></article><article class="${a.duplicates.length?'warn':''}"><span>DNI repetidos</span><strong>${a.duplicates.length}</strong></article><article class="${a.missingDni.length?'warn':''}"><span>Sin DNI</span><strong>${a.missingDni.length}</strong></article></div><p>${a.duplicates.length||a.missingDni.length?'Las filas problemáticas se omitirán y quedarán reflejadas como incidencias.':'El archivo no contiene duplicados ni filas sin DNI.'}</p>`;
}
async function previewExcel(){
 try{
  const file=$('#excelFile').files[0];if(!file)return importMsg('Selecciona un archivo.','error');
  importMsg('Analizando el archivo y comparándolo con los socios de Supabase…');
  const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});
  previewRows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
  if(!previewRows.length)return importMsg('El archivo no contiene filas.','error');
  previewAnalysis=await analyseRows();previewPage=1;renderAnalysis();renderImportPreview();
  $('#confirmImport').disabled=false;$('#cancelImport').disabled=false;updateImportButton();
  importMsg(`Análisis terminado: ${previewRows.length} filas, ${previewAnalysis.newMembers.length} socios nuevos, ${previewAnalysis.existing.length} ya existentes, ${previewAnalysis.duplicates.length} DNI repetidos y ${previewAnalysis.missingDni.length} filas sin DNI.`);
 }catch(e){console.error(e);importMsg(`No se pudo analizar el archivo: ${e.message}`,'error');}
}
function memberPayload(item){
 const r=item.row,name=item.name||'Nombre pendiente de revisar';
 const category=String(pick(r,['tipo de abono','tipo abono','categoria','categoría'])||'').trim();
 return {nombre:name,apellidos:'',dni:item.dni,estado:'activo',categoria:category||null,cuenta_activada:false,cuota_al_dia:false,sector:String(pick(r,['nombre zona del abono','zona','sector'])||'').trim()||null,tipo_abono:category||null,precio_abono:Number(pick(r,['cuota de abono con descuento (euros)','precio final','importe final','precio abono','importe abono','total abono'])||0),observaciones_internas:'Importado desde la campaña histórica 2026/27. Pendiente de completar fecha de nacimiento, contacto, antigüedad y separar correctamente nombre y apellidos.'};
}
async function insertInChunks(table,rows,size=100){
 for(let i=0;i<rows.length;i+=size){const {error}=await sb.from(table).insert(rows.slice(i,i+size));if(error)throw error;}
}
async function upsertInChunks(table,rows,onConflict,size=100){
 for(let i=0;i<rows.length;i+=size){const {error}=await sb.from(table).upsert(rows.slice(i,i+size),{onConflict,ignoreDuplicates:false});if(error)throw error;}
}
async function confirmImport(){
 if(!previewRows.length||!previewAnalysis)return importMsg('Primero analiza un archivo.','error');
 const mode=$('#importMode').value;
 const action=mode==='create_members'?`crear ${previewAnalysis.newMembers.length} socios nuevos e importar ${previewAnalysis.valid.length} registros de campaña`:`importar ${previewAnalysis.valid.length} registros de campaña`;
 if(!confirm(`Vas a ${action}. Los DNI duplicados y las filas sin DNI se omitirán. ¿Continuar?`))return;
 const button=$('#confirmImport');button.disabled=true;$('#cancelImport').disabled=true;button.textContent='Procesando…';
 importMsg(`Procesando la importación. No cierres esta página…`);
 try{
  if(mode==='create_members'&&previewAnalysis.newMembers.length){
   importMsg(`Creando ${previewAnalysis.newMembers.length} socios nuevos en Supabase…`);
   await insertInChunks('socios',previewAnalysis.newMembers.map(memberPayload));
  }
  const {data:members,error:merr}=await sb.from('socios').select('id,numero_socio,nombre,apellidos,dni,fecha_nacimiento');if(merr)throw merr;
  const byDni=new Map((members||[]).filter(m=>m.dni).map(m=>[normalizeKey(m.dni),m]));
  const origin=$('#importOrigin').value,matched=[],unmatched=[],newIssues=[];
  for(const item of previewAnalysis.valid){
   const r=item.row,member=byDni.get(item.key);
   const price=Number(pick(r,['cuota de abono con descuento (euros)','precio final','importe final','precio abono','importe abono','total abono'])||0);
   const original=Number(pick(r,['cuota de abono euros','precio original','precio'])||price);
   const discount=Number(pick(r,['descuento','descuentos','cesion','cesión'])||0);
   const fee=Number(pick(r,['cuota pena','cuota peña','cuota socio'])||0);
   const paid=Number(pick(r,['importe pagado','pagado','total cobrado'])||0);
   const gestion=normalizeKey(pick(r,['gestion abono','renovacion','tramitado por'])||'').includes('club')?'club':'pena';
   const row={campana_id:current.id,socio_id:member?.id||null,origen:origin,dni_club:item.dni||null,nombre_club:item.name||null,zona_club:pick(r,['nombre zona del abono','zona','sector']),categoria_club:pick(r,['tipo de abono','tipo abono','categoria','categoría']),precio_original:original,descuento_club:discount,precio_abono:price,categoria_pena:pick(r,['categoria pena','categoría peña']),cuota_base:fee,cuota_final:fee,gestion_abono:gestion,estado:paid>0?'pagado':(member?'pendiente_revision':'incidencia'),forma_pago:pick(r,['forma pago','metodo pago','método pago'])||null,importe_pagado:paid,datos_origen:r};
   member?matched.push(row):unmatched.push(row);
   if(!member)newIssues.push({campana_id:current.id,tipo:'socio_no_localizado',gravedad:'alta',descripcion:`No se pudo vincular ${item.name||item.dni}.`});
  }
  previewAnalysis.duplicates.forEach(x=>newIssues.push({campana_id:current.id,tipo:'duplicado_en_excel',gravedad:'alta',descripcion:`DNI repetido ${x.dni}: ${x.name||'sin nombre'}. Se omitió la fila ${x.index+2}.`}));
  previewAnalysis.missingDni.forEach(x=>newIssues.push({campana_id:current.id,tipo:'dni_ausente',gravedad:'alta',descripcion:`Fila ${x.index+2} sin DNI: ${x.name||'sin nombre'}. No se importó.`}));
  if(matched.length)await upsertInChunks('campanas_registros',matched,'campana_id,socio_id');
  if(unmatched.length)await insertInChunks('campanas_registros',unmatched);
  if(newIssues.length)await insertInChunks('campanas_incidencias',newIssues);
  const created=mode==='create_members'?previewAnalysis.newMembers.length:0;
  importMsg(`Importación completada: ${matched.length+unmatched.length} registros de campaña, ${created} socios nuevos, ${unmatched.length} sin vincular y ${newIssues.length} incidencias.`);
  previewRows=[];previewAnalysis=null;previewPage=1;$('#importPreview').innerHTML='';$('#importPager').innerHTML='';$('#importAnalysis').hidden=true;button.textContent='Importación completada';
  await loadAll();
 }catch(e){console.error(e);button.disabled=false;$('#cancelImport').disabled=false;updateImportButton();importMsg(`No se pudo completar la importación: ${e.message}`,'error');}
}
function renderRecords(){const q=normalizeKey($('#recordSearch').value);const list=records.filter(r=>!q||normalizeKey(`${r.socios?.numero_socio} ${r.socios?.nombre} ${r.socios?.apellidos} ${r.nombre_club}`).includes(q));$('#recordsBody').innerHTML=list.map(r=>`<tr><td>${esc(r.socios?`${r.socios.numero_socio||''} ${r.socios.nombre||''} ${r.socios.apellidos||''}`:r.nombre_club||'No vinculado')}</td><td>${esc(r.gestion_abono)}</td><td>${euro(r.precio_abono)}</td><td>${euro(r.cuota_final)}${r.es_directivo?' <span class="c28-badge ok">Directivo</span>':''}</td><td>${euro(r.importe_total)}</td><td>${euro(r.importe_pagado)}</td><td><span class="c28-badge">${esc(r.estado)}</span></td><td><button class="btn btn-secondary" data-edit="${r.id}">Editar</button></td></tr>`).join('');$$('[data-edit]').forEach(b=>b.onclick=()=>openRecord(b.dataset.edit));}
function openRecord(id){const r=records.find(x=>x.id===id),f=$('#recordForm');for(const k of ['id','gestion_abono','estado','precio_abono','descuento_club','cuota_final','importe_pagado','forma_pago','observaciones'])f[k].value=r[k]??'';f.es_directivo.value=String(r.es_directivo);$('#editRecordModal').classList.add('open');}
async function saveRecord(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target));const id=o.id;delete o.id;for(const k of ['precio_abono','descuento_club','cuota_final','importe_pagado'])o[k]=Number(o[k]||0);o.es_directivo=o.es_directivo==='true';if(o.es_directivo)o.cuota_final=0;if(!o.forma_pago)o.forma_pago=null;if(o.estado==='pagado'&&!o.fecha_pago)o.fecha_pago=new Date().toISOString();const {error}=await sb.from('campanas_registros').update(o).eq('id',id);if(error)return msg(error.message);$('#editRecordModal').classList.remove('open');await loadAll();}
function exportCSV(){const h=['Socio','Gestion','Precio abono','Descuento','Cuota','Total','Pagado','Estado'];const lines=[h,...records.map(r=>[`${r.socios?.nombre||''} ${r.socios?.apellidos||''}`,r.gestion_abono,r.precio_abono,r.descuento_club,r.cuota_final,r.importe_total,r.importe_pagado,r.estado])].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+lines],{type:'text/csv'}));a.download=`campana-${current.temporada.replace('/','-')}.csv`;a.click();}
async function findPilotMembers(){const q=$('#pilotSearch').value.trim();let req=sb.from('socios').select('id,numero_socio,nombre,apellidos').limit(20);if(q)req=req.or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%`);const {data,error}=await req;if(error)return msg(error.message);$('#pilotResults').innerHTML=(data||[]).map(m=>`<div class="c28-family-item"><span>${esc(m.numero_socio||'')} ${esc(m.nombre)} ${esc(m.apellidos)}</span><button class="btn btn-primary" data-invite="${m.id}">Invitar</button></div>`).join('');$$('[data-invite]').forEach(b=>b.onclick=()=>invitePilot(b.dataset.invite));}
async function invitePilot(id){if(current.tipo!=='piloto')return msg('Selecciona una campaña de tipo piloto.');const {error}=await sb.from('campanas_piloto_participantes').upsert({campana_id:current.id,socio_id:id});if(error)return msg(error.message);await loadAll();}
function renderPilot(list){$('#pilotParticipants').innerHTML=list.map(x=>`<div class="c28-family-item"><span>${esc(x.socios?.numero_socio||'')} ${esc(x.socios?.nombre||'')} ${esc(x.socios?.apellidos||'')}</span><span class="c28-badge ${x.completado_at?'ok':'test'}">${x.completado_at?'Completado':'Pendiente'}</span></div>`).join('')||'<p>Sin participantes.</p>';}
function renderIssues(){$('#issuesList').innerHTML=issues.map(i=>`<article class="c28-card"><span>${esc(i.tipo)} · ${esc(i.gravedad)}</span><strong style="font-size:1rem">${esc(i.descripcion)}</strong><p>${esc(i.estado)}</p></article>`).join('')||'<p>No hay incidencias.</p>';}

function activeCategories(){return categories.filter(c=>c.activa&&c.nacimiento_desde&&c.nacimiento_hasta).sort((a,b)=>a.orden-b.orden);}
function categoryForBirth(date){if(!date)return null;return activeCategories().find(c=>date>=c.nacimiento_desde&&date<=c.nacimiento_hasta)||null;}
function calculationForRecord(r){
 const birth=r.socios?.fecha_nacimiento||null,cat=categoryForBirth(birth);
 const fee=r.es_directivo?0:Number(cat?.cuota||0);
 const adjustment=Number(r.ajuste_individual||0),subscription=Number(r.precio_abono||0),discount=Number(r.descuento_club||0);
 const total=(r.gestion_abono==='pena'?subscription:0)+fee+adjustment;
 const status=!birth?'Sin fecha de nacimiento':(!cat?'Sin categoría':(r.gestion_abono==='pena'&&!subscription?'Abono sin precio':'Correcto'));
 return {birth,cat,fee,adjustment,subscription,discount,total,status};
}
function diagnosisData(){
 const cats=activeCategories(),missingRanges=categories.filter(c=>c.activa&&(!c.nacimiento_desde||!c.nacimiento_hasta));
 const overlaps=[];cats.forEach((c,i)=>cats.slice(i+1).forEach(o=>{if(c.nacimiento_desde<=o.nacimiento_hasta&&c.nacimiento_hasta>=o.nacimiento_desde)overlaps.push(`${c.nombre} / ${o.nombre}`)}));
 const noBirth=records.filter(r=>!r.socios?.fecha_nacimiento),noCategory=records.filter(r=>r.socios?.fecha_nacimiento&&!categoryForBirth(r.socios.fecha_nacimiento));
 const noSector=records.filter(r=>r.gestion_abono==='pena'&&!String(r.zona_club||r.socios?.sector||'').trim());
 const noPrice=records.filter(r=>r.gestion_abono==='pena'&&Number(r.precio_abono||0)<=0);
 const duplicatedDni=issues.filter(i=>i.estado==='abierta'&&i.tipo==='duplicado_en_excel');
 const blockers=missingRanges.length+overlaps.length+noBirth.length+noCategory.length+noPrice.length;
 return {missingRanges,overlaps,noBirth,noCategory,noSector,noPrice,duplicatedDni,blockers};
}
function runDiagnosis(showMessage=true){
 if(!current)return;const d=diagnosisData();
 const cards=[['Bloqueos',d.blockers],['Sin nacimiento',d.noBirth.length],['Sin categoría',d.noCategory.length],['Abono sin precio',d.noPrice.length]];
 $('#diagnosisSummary').innerHTML=cards.map(([t,n])=>`<article class="c28-card"><span>${t}</span><strong>${n}</strong></article>`).join('');
 const groups=[['Categorías sin fechas',d.missingRanges.map(x=>x.nombre)],['Rangos solapados',d.overlaps],['Socios sin nacimiento',d.noBirth.map(x=>`${x.socios?.numero_socio||''} ${x.socios?.nombre||x.nombre_club||''}`)],['Socios sin categoría',d.noCategory.map(x=>`${x.socios?.numero_socio||''} ${x.socios?.nombre||x.nombre_club||''}`)],['Abonos gestionados por la peña sin precio',d.noPrice.map(x=>`${x.socios?.numero_socio||''} ${x.socios?.nombre||x.nombre_club||''}`)],['Registros sin sector',d.noSector.map(x=>`${x.socios?.numero_socio||''} ${x.socios?.nombre||x.nombre_club||''}`)]];
 $('#diagnosisDetails').innerHTML=groups.map(([title,list])=>`<details ${list.length?'open':''}><summary><strong>${esc(title)}</strong> · ${list.length}</summary>${list.length?`<ul>${list.slice(0,50).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Sin incidencias.</p>'}</details>`).join('');
 $('#engineStatus').innerHTML=`<div class="c28-alert">${d.blockers?'⚠️ La campaña tiene bloqueos que conviene corregir antes de abrirla.':'✅ La campaña está preparada para continuar.'}</div>`;
 if(showMessage)msg(d.blockers?`Diagnóstico terminado: ${d.blockers} bloqueos detectados.`:'Diagnóstico terminado sin bloqueos.');
 return d;
}
function runSimulation(showMessage=true){
 if(!current)return;simulationRows=records.map(r=>({record:r,...calculationForRecord(r)}));
 const totalFees=simulationRows.reduce((s,x)=>s+x.fee,0),totalSubscriptions=simulationRows.filter(x=>x.record.gestion_abono==='pena').reduce((s,x)=>s+x.subscription,0),totalDiscounts=simulationRows.reduce((s,x)=>s+x.discount,0),totalAdjustments=simulationRows.reduce((s,x)=>s+x.adjustment,0),grand=simulationRows.reduce((s,x)=>s+x.total,0);
 $('#simulationSummary').innerHTML=[['Socios',simulationRows.length],['Cuotas',euro(totalFees)],['Abonos',euro(totalSubscriptions)],['Total previsto',euro(grand)]].map(([t,v])=>`<article class="c28-card"><span>${t}</span><strong>${v}</strong></article>`).join('');
 const byCat=new Map();simulationRows.forEach(x=>{const k=x.cat?.nombre||'Sin categoría';const v=byCat.get(k)||{count:0,fees:0};v.count++;v.fees+=x.fee;byCat.set(k,v)});
 $('#simulationCategories').innerHTML=`<table class="c28-table"><thead><tr><th>Categoría</th><th>Socios</th><th>Cuotas previstas</th></tr></thead><tbody>${[...byCat].map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.count}</td><td>${euro(v.fees)}</td></tr>`).join('')}</tbody></table><p><strong>Descuentos informados:</strong> ${euro(totalDiscounts)} · <strong>Ajustes individuales:</strong> ${euro(totalAdjustments)}</p>`;
 renderSimulationRows();if(showMessage)msg('Simulación actualizada. No se ha modificado ningún registro.');
}
function renderSimulationRows(){const q=normalizeKey($('#engineSearch')?.value||'');const list=simulationRows.filter(x=>!q||normalizeKey(`${x.record.socios?.numero_socio||''} ${x.record.socios?.nombre||x.record.nombre_club||''} ${x.record.socios?.apellidos||''}`).includes(q));$('#simulationBody').innerHTML=list.map(x=>`<tr><td>${esc(`${x.record.socios?.numero_socio||''} ${x.record.socios?.nombre||x.record.nombre_club||''} ${x.record.socios?.apellidos||''}`)}</td><td>${esc(x.birth||'—')}</td><td>${esc(x.cat?.nombre||'—')}</td><td>${euro(x.fee)}</td><td>${euro(x.subscription)}</td><td>${euro(x.discount)}</td><td>${euro(x.adjustment)}</td><td><strong>${euro(x.total)}</strong></td><td><span class="c28-badge ${x.status==='Correcto'?'ok':'test'}">${esc(x.status)}</span></td></tr>`).join('')||'<tr><td colspan="9">Sin registros para simular.</td></tr>';}
async function applyCalculatedFees(){
 const d=runDiagnosis(false);if(d.blockers&&!confirm(`Hay ${d.blockers} bloqueos. Solo se actualizarán los registros que tengan categoría válida. ¿Continuar?`))return;
 runSimulation(false);const valid=simulationRows.filter(x=>x.cat&&x.birth);if(!valid.length)return msg('No hay registros válidos para actualizar.');if(!confirm(`Se actualizarán categoría y cuota de ${valid.length} registros. ¿Continuar?`))return;
 try{for(let i=0;i<valid.length;i+=50){const batch=valid.slice(i,i+50);await Promise.all(batch.map(x=>sb.from('campanas_registros').update({categoria_pena:x.cat.nombre,cuota_base:x.fee,cuota_final:x.fee}).eq('id',x.record.id).then(({error})=>{if(error)throw error})));}msg(`Cálculo aplicado a ${valid.length} registros.`);await loadAll();}catch(e){msg(`No se pudo aplicar el cálculo: ${e.message}`);}
}
function exportSimulationCSV(){if(!simulationRows.length)runSimulation(false);const h=['Socio','Nacimiento','Categoria','Cuota','Abono','Descuento','Ajuste','Total previsto','Estado'];const lines=[h,...simulationRows.map(x=>[`${x.record.socios?.numero_socio||''} ${x.record.socios?.nombre||x.record.nombre_club||''} ${x.record.socios?.apellidos||''}`,x.birth||'',x.cat?.nombre||'',x.fee,x.subscription,x.discount,x.adjustment,x.total,x.status])].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+lines],{type:'text/csv'}));a.download=`simulacion-${current.temporada.replace('/','-')}.csv`;a.click();}

document.addEventListener('DOMContentLoaded',init);
})();
