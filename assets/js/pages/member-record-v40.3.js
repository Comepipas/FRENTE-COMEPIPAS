(()=>{
  "use strict";
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const memberId=new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("incidencia");
  const text=v=>v==null||String(v).trim()===""?"Sin informar":String(v);

  async function enhance(){
    if(!memberId)return;
    if(!document.querySelector('link[href*="member-review-v40.6.css"]'))document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="assets/css/member-review-v40.6.css?v=40.6.2">');
    const db=window.FrenteDatabase.getClient();
    await setupFamilyAdmin(db);
    const {data:m,error}=await db.from("socios").select("numero_socio,numero_socio_provisional,numero_socio_estado,antiguedad_declarada_tipo,antiguedad_declarada_temporada,antiguedad_declarada_anio,antiguedad_declarada_observaciones,antiguedad_estado,precio_abono,sector,sector_codigo_club,gestion_abono_preferida,continuidad_estado,menor_sin_dni,nombre,apellidos,dni,telefono,direccion,numero_abonado_malaga,email,email_contacto,correo_compartido_familiar,datos_revision_estado,datos_revisados_at,fecha_nacimiento,categoria,es_directivo,cargo_directiva,cuenta_activada,auth_user_id").eq("id",memberId).single();
    if(error)return;
    const numberInput=$('[name="numero_socio"]');
    if(numberInput){
      const definitive=m.numero_socio&&String(m.numero_socio_estado).toLowerCase()==="asignado";
      numberInput.value=definitive?String(m.numero_socio).padStart(4,"0"):(m.numero_socio_provisional?`P-${String(m.numero_socio_provisional).padStart(4,"0")}`:"Pendiente de declarar o validar");
      const label=numberInput.closest(".record-field")?.querySelector("label");if(label)label.textContent=definitive?"Número de socio definitivo":"Número provisional interno";
      if(!definitive){numberInput.closest('.record-field')?.insertAdjacentHTML('beforeend','<button id="assignDefinitiveNumber" type="button" class="btn btn-primary" style="margin-top:8px">Asignar número definitivo</button>');$('#assignDefinitiveNumber').onclick=async()=>{const value=Number(prompt('Número definitivo de socio',''));if(!value)return;const {error}=await db.rpc('commit405_set_definitive_member_number',{p_socio_id:memberId,p_numero:value});if(error)return window.FrenteNotify.error(error.message);window.FrenteNotify.success('Número definitivo asignado.');setTimeout(()=>location.reload(),400)}}
    }
    const pena=$('[data-panel="pena"] .record-grid');
    if(pena&&!$("#antiquityStatus")){
      const declared=m.antiguedad_declarada_temporada||m.antiguedad_declarada_anio||m.antiguedad_declarada_tipo;
      pena.insertAdjacentHTML("beforeend",`<div id="antiquityStatus" class="record-field full"><label>Antigüedad declarada por el socio</label><div class="record-history-item"><strong>${esc(declared||"No declarada")}</strong><span>Estado: ${esc(text(m.antiguedad_estado))}</span>${m.antiguedad_declarada_observaciones?`<small>${esc(m.antiguedad_declarada_observaciones)}</small>`:""}</div></div>`);
      pena.insertAdjacentHTML("beforeend",`<div class="record-field full"><label>Revisión de la ficha maestra</label><select name="datos_revision_estado" disabled><option value="pendiente">Pendiente de revisar</option><option value="incompleto">Datos incompletos</option><option value="posible_duplicado">Posible duplicado</option><option value="revisado">Revisado y correcto</option></select>${m.datos_revisados_at?`<small>Revisado el ${esc(new Date(m.datos_revisados_at).toLocaleDateString('es-ES'))}</small>`:""}</div>`);
      pena.insertAdjacentHTML("beforeend",`<div class="record-field"><label>Situación en la Peña</label><select name="continuidad_estado" disabled><option value="por_confirmar">Pendiente de confirmar</option><option value="continua">Continúa en la Peña</option><option value="pendiente_pago">Continúa · pago pendiente</option><option value="baja_confirmada">Baja confirmada</option></select></div><div class="record-field"><label>Gestión habitual del abono</label><select name="gestion_abono_preferida" disabled><option value="por_confirmar">Pendiente de confirmar</option><option value="pena">Renueva mediante la Peña</option><option value="club">Renueva directamente con el club</option><option value="no_renueva">No renueva el abono</option></select></div>`);
    }
    const personal=$('[data-panel="personal"] .record-grid');
    if(personal&&!$("#masterDataFlags"))personal.insertAdjacentHTML("beforeend",`<div id="masterDataFlags" class="record-field full"><div class="record-checks"><label><input type="checkbox" name="menor_sin_dni" disabled> Menor sin DNI obligatorio</label><label><input type="checkbox" name="correo_compartido_familiar" disabled> Correo de contacto compartido con un familiar</label></div><small>El correo compartido sirve para contactar; no crea otra cuenta web para el menor.</small></div>`);
    const minor=$('[name="menor_sin_dni"]');if(minor)minor.checked=!!m.menor_sin_dni;
    const shared=$('[name="correo_compartido_familiar"]');if(shared)shared.checked=!!m.correo_compartido_familiar;
    const email=$('[name="email"]');if(email&&m.correo_compartido_familiar){email.value=m.email_contacto||m.email||"";const label=email.closest('.record-field')?.querySelector('label');if(label)label.textContent="Correo de contacto familiar"}
    const review=$('[name="datos_revision_estado"]');if(review)review.value=m.datos_revision_estado||"pendiente";
    const continuity=$('[name="continuidad_estado"]');if(continuity)continuity.value=m.continuidad_estado||"por_confirmar";
    const management=$('[name="gestion_abono_preferida"]');if(management)management.value=m.gestion_abono_preferida||"por_confirmar";
    const dni=$('[name="dni"]');if(dni&&m.menor_sin_dni){dni.value="";dni.placeholder="MENOR — DNI no obligatorio"}
    const category=$('[name="categoria"]');if(category){category.readOnly=true;category.title="Se calcula con la fecha de nacimiento y la fecha de corte de la temporada"}
    setupAccountAndBoard(m);
    setupSeasonTicket(m);
    simplifyTabs();
    await showCalculatedCategory(db,m,pena);
    const price=$('[name="precio_abono"]');
    if(price&&m.precio_abono==null){price.placeholder="Importe sin informar";price.value=""}
    const sector=$('[name="sector"]');if(sector&&!m.sector)sector.placeholder="Zona pendiente";
    const fee=$('[name="cuota_al_dia"]');if(fee){fee.disabled=true;fee.closest("label")?.append(" (calculado desde Cuotas y pagos)")}
    await addPaymentButton(db);
    await setupCensusReview(db,m);
    await setupSeasonHistory(db);
  }

  async function setupCensusReview(db,m){
    const head=document.querySelector('.member-record-head');if(!head||document.querySelector('#censusReviewControl'))return;
    const missing=[];
    if(!String(m.nombre||'').trim()||!String(m.apellidos||'').trim())missing.push('nombre y apellidos');
    if(!m.fecha_nacimiento)missing.push('fecha de nacimiento');
    if(!m.menor_sin_dni&&!String(m.dni||'').trim())missing.push('DNI/NIE');
    if(!String(m.email||m.email_contacto||'').trim()&&!String(m.telefono||'').trim())missing.push('correo o teléfono');
    if(!String(m.direccion||'').trim())missing.push('dirección');
    if(!String(m.numero_abonado_malaga||'').trim())missing.push('número de abonado');
    const antiquity=m.antiguedad_declarada_temporada||m.antiguedad_declarada_anio||(m.antiguedad_declarada_tipo==='no_recuerda'?'No recuerda la antigüedad':'Pendiente de declarar');
    const [{count:total},{count:reviewed}]=await Promise.all([
      db.from('socios').select('id',{count:'exact',head:true}).or('es_registro_prueba.is.null,es_registro_prueba.eq.false'),
      db.from('socios').select('id',{count:'exact',head:true}).or('es_registro_prueba.is.null,es_registro_prueba.eq.false').eq('datos_revision_estado','revisado')
    ]);
    head.insertAdjacentHTML('afterend',`<section id="censusReviewControl" class="census-review-card"><div><span class="kicker">Control de revisión</span><h2>${esc(m.datos_revision_estado==='revisado'?'Ficha revisada':'Ficha pendiente')}</h2><p>${missing.length?`Falta comprobar: <strong>${missing.map(esc).join(', ')}</strong>.`:'Los datos básicos necesarios están informados.'}</p><p class="census-antiquity"><strong>Antigüedad declarada:</strong> ${esc(antiquity)} · ${esc(m.antiguedad_estado||'pendiente')}</p></div><div class="census-review-progress"><strong>${Number(reviewed||0)} / ${Number(total||0)}</strong><span>fichas revisadas</span></div><div class="census-review-actions"><button type="button" id="markCensusIncomplete" class="btn btn-dark-outline">Dejar pendiente</button><button type="button" id="markCensusReviewed" class="btn btn-primary" ${missing.length?'disabled title="Completa primero los campos indicados"':''}>Marcar revisada</button><button type="button" id="nextCensusMember" class="btn btn-dark-outline">Siguiente pendiente →</button></div></section>`);
    const setState=async state=>{const {error}=await db.from('socios').update({datos_revision_estado:state}).eq('id',memberId);if(error)return window.FrenteNotify.error(error.message);window.FrenteNotify.success(state==='revisado'?'Ficha marcada como revisada.':'Ficha guardada como pendiente de completar.');setTimeout(()=>location.reload(),350)};
    document.querySelector('#markCensusIncomplete').onclick=()=>setState('incompleto');
    document.querySelector('#markCensusReviewed').onclick=()=>setState('revisado');
    document.querySelector('#nextCensusMember').onclick=async()=>{const {data,error}=await db.from('socios').select('id').or('es_registro_prueba.is.null,es_registro_prueba.eq.false').neq('datos_revision_estado','revisado').neq('id',memberId).order('nombre').order('apellidos').limit(1).maybeSingle();if(error)return window.FrenteNotify.error(error.message);if(!data)return window.FrenteNotify.success('No quedan fichas pendientes.');location.href=`ficha-socio-admin.html?id=${encodeURIComponent(data.id)}`};
    const permanentTab=document.querySelector('[data-tab="pena"]');if(permanentTab)permanentTab.textContent='Datos de la Peña';
    const seasonTab=document.querySelector('[data-tab="abono"]');if(seasonTab)seasonTab.textContent='Historial de abonos';
    const familyTab=document.querySelector('[data-tab="tutor"]');if(familyTab)familyTab.textContent='Familia / incidencias';
    ['categoria','gestion_abono_preferida','continuidad_estado','sector','sector_codigo_club','tipo_abono','precio_abono'].forEach(name=>{const field=document.querySelector(`[name="${name}"]`)?.closest('.record-field');if(field)field.hidden=true});
    const account=document.querySelector('[name="cuenta_activada"]')?.closest('label');if(account)account.hidden=false;
  }

  async function setupSeasonHistory(db){
    const panel=document.querySelector('[data-panel="abono"]');if(!panel)return;
    panel.querySelector('.record-grid')?.classList.add('season-master-hidden');
    const old=document.querySelector('#renewalsBox');if(old)old.hidden=true;
    let box=document.querySelector('#seasonHistory406');if(!box){panel.insertAdjacentHTML('beforeend','<div id="seasonHistory406" class="season-history-406">Cargando historial por temporada…</div>');box=document.querySelector('#seasonHistory406')}
    const {data,error}=await db.from('campanas_registros').select('id,estado,zona_club,sector_club,categoria_club,precio_original,descuento_club,precio_abono,cuota_final,importe_total,importe_pagado,gestion_abono,forma_pago,fecha_pago,observaciones,datos_origen,created_at,campanas(temporada,nombre,tipo,modo_pruebas)').eq('socio_id',memberId).order('created_at',{ascending:false}).limit(30);
    if(error){box.innerHTML=`<div class="record-empty">No se pudo cargar zona y sector. Ejecuta el SQL <strong>040_6_2_season_zone_sector.sql</strong> en Supabase.</div>`;return}
    const rows=(data||[]).filter(r=>r.campanas?.tipo!=='piloto'&&r.campanas?.modo_pruebas!==true);
    box.innerHTML=rows.length?rows.map(r=>{const raw=r.datos_origen||{},zoneId=r.sector_club||raw['Id. Zona Abono']||raw['id. zona abono']||raw.sector_codigo_club||'',expected=Number(r.importe_total||0),paid=Number(r.importe_pagado||0),difference=Math.round((paid-expected)*100)/100;return `<article class="season-record-card" data-season-card="${r.id}"><header><div><span>${esc(r.campanas?.temporada||'Temporada')}</span><strong>${esc(String(r.estado||'pendiente de revisión').replaceAll('_',' '))}</strong></div><div class="season-card-actions"><em>${esc(r.gestion_abono||'pendiente de confirmar')}</em><button type="button" class="btn btn-primary" data-edit-season="${r.id}">Editar zona y sector</button></div></header><div class="season-zone-editor" data-season-editor="${r.id}" hidden><label>Zona del abono<input data-season-zone value="${esc(r.zona_club||'')}" placeholder="Ej.: CURVA ALTA (540)"></label><label>Sector / Id. zona<input data-season-sector value="${esc(zoneId)}" placeholder="Ej.: 540"></label><button type="button" class="btn btn-primary" data-save-season="${r.id}">Guardar zona y sector</button><button type="button" class="btn btn-dark-outline" data-cancel-season="${r.id}">Cancelar</button></div><div class="season-record-grid"><div><small>Zona</small><b data-zone-value>${esc(r.zona_club||'Sin informar')}</b></div><div><small>Sector / Id. zona</small><b data-sector-value>${esc(zoneId||'Sin informar')}</b></div><div><small>Tipo del club</small><b>${esc(r.categoria_club||'Sin informar')}</b></div><div><small>Precio inicial</small><b>${money(r.precio_original)}</b></div><div><small>Descuento</small><b>${money(r.descuento_club)}</b></div><div><small>Precio club final</small><b>${money(r.precio_abono)}</b></div><div><small>Cuota Peña</small><b>${money(r.cuota_final)}</b></div><div><small>Total esperado</small><b>${money(expected)}</b></div><div><small>Pagado registrado</small><b>${money(paid)}</b></div><div class="${Math.abs(difference)>.009?'season-difference':''}"><small>Diferencia</small><b>${money(difference)}</b></div></div>${Math.abs(difference)>.009?'<p class="season-warning">Pendiente de revisión manual: la web no decide si renovó o no.</p>':''}${r.observaciones?`<p>${esc(r.observaciones)}</p>`:''}</article>`}).join(''):'<div class="record-empty">No hay datos reales de temporadas cargados para este socio. Los registros piloto no se muestran.</div>';
    if(!rows.length){
      const campaigns=await db.from('campanas_abonados').select('id,temporada,nombre,tipo').neq('tipo','piloto').order('temporada',{ascending:false}).limit(20);
      if(!campaigns.error&&campaigns.data?.length){box.innerHTML=`<article class="season-record-card"><h3>Añadir zona y sector de una temporada</h3><p>Este socio no tiene todavía un registro real de abono. Selecciona la temporada antes de guardar.</p><div class="season-zone-editor"><label>Temporada<select id="newSeasonCampaign">${campaigns.data.map(c=>`<option value="${c.id}">${esc(c.temporada)} · ${esc(c.nombre)}</option>`).join('')}</select></label><label>Zona del abono<input id="newSeasonZone" placeholder="Ej.: CURVA ALTA (540)"></label><label>Sector / Id. zona<input id="newSeasonSector" placeholder="Ej.: 540"></label><button type="button" id="createSeasonRecord" class="btn btn-primary">Crear registro y guardar</button></div></article>`;document.querySelector('#createSeasonRecord').onclick=async()=>{const button=document.querySelector('#createSeasonRecord'),payload={campana_id:document.querySelector('#newSeasonCampaign').value,socio_id:memberId,origen:'manual',gestion_abono:'pendiente',estado:'pendiente_revision',zona_club:document.querySelector('#newSeasonZone').value.trim()||null,sector_club:document.querySelector('#newSeasonSector').value.trim()||null};button.disabled=true;const {error}=await db.from('campanas_registros').insert(payload);button.disabled=false;if(error)return window.FrenteNotify.error(error.message);window.FrenteNotify.success('Registro de temporada creado.');await setupSeasonHistory(db)}}
    }
    box.querySelectorAll('[data-edit-season]').forEach(button=>button.onclick=()=>{const editor=box.querySelector(`[data-season-editor="${button.dataset.editSeason}"]`);if(editor)editor.hidden=false});
    box.querySelectorAll('[data-cancel-season]').forEach(button=>button.onclick=()=>{const editor=box.querySelector(`[data-season-editor="${button.dataset.cancelSeason}"]`);if(editor)editor.hidden=true});
    box.querySelectorAll('[data-save-season]').forEach(button=>button.onclick=async()=>{const id=button.dataset.saveSeason,card=box.querySelector(`[data-season-card="${id}"]`),editor=card?.querySelector('[data-season-editor]'),zona=editor?.querySelector('[data-season-zone]')?.value.trim()||null,sector=editor?.querySelector('[data-season-sector]')?.value.trim()||null;button.disabled=true;const {error}=await db.from('campanas_registros').update({zona_club:zona,sector_club:sector}).eq('id',id);button.disabled=false;if(error)return window.FrenteNotify.error(error.message);card.querySelector('[data-zone-value]').textContent=zona||'Sin informar';card.querySelector('[data-sector-value]').textContent=sector||'Sin informar';editor.hidden=true;window.FrenteNotify.success('Zona y sector guardados en esta temporada.')});
  }

  function money(v){return Number(v||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}

  function setupAccountAndBoard(m){
    const account=$('[name="cuenta_activada"]');if(account){account.checked=!!(m.cuenta_activada||m.auth_user_id);account.disabled=true;const label=account.closest('label');if(label){label.title='Se activa automáticamente al vincular una cuenta de Supabase. Para bloquear acceso use Usuarios y permisos.';label.append(' (automático)')}}
    const board=$('[name="es_directivo"]'),old=$('[name="cargo_directiva"]');if(!old)return;
    const select=document.createElement('select');select.name='cargo_directiva';select.disabled=true;select.innerHTML='<option value="">Seleccionar cargo</option><option>Presidente</option><option>Vicepresidente</option><option>Secretario</option><option>Tesorero</option><option>Directivo</option><option>Vocal</option>';select.value=m.cargo_directiva||'';old.replaceWith(select);
    const wrap=select.closest('.record-field');const toggle=()=>{wrap.hidden=!board.checked;if(!board.checked)select.value=''};board?.addEventListener('change',toggle);toggle();
  }

  function setupSeasonTicket(m){
    const panel=$('[data-panel="abono"]');if(!panel)return;
    const zone=$('[name="sector"]');if(zone){const label=zone.closest('.record-field')?.querySelector('label');if(label)label.textContent='Zona'}
    const sector=$('[name="sector_codigo_club"]');if(sector){sector.value=m.sector_codigo_club||'';const label=sector.closest('.record-field')?.querySelector('label');if(label)label.textContent='Sector'}
  }

  function simplifyTabs(){
    document.querySelector('[data-tab="historial"]')?.remove();document.querySelector('[data-panel="historial"]')?.remove();
    const feesLink=$('#recordFeesLink');if(feesLink){feesLink.insertAdjacentHTML('afterend','<p class="cms-note">La cuota se registra desde esta ficha cuando está pendiente. El resumen general de tesorería permanece separado.</p>');feesLink.remove()}
  }

  async function setupFamilyAdmin(db){
    const box=$('#guardiansBox');if(!box)return;
    if($('#familyInlineAdmin'))return;
    box.insertAdjacentHTML('afterend','<div id="familyInlineAdmin" style="margin-top:18px"><h3>Añadir familiar autorizado</h3><div class="record-grid"><div class="record-field"><label>Buscar por número, DNI o nombre</label><input id="familyInlineQuery"></div><div class="record-field"><label>Quién realizará la gestión</label><select id="familyInlineDirection"><option value="current">Este socio gestionará al familiar</option><option value="found">El familiar gestionará a este socio</option></select></div><div class="record-field"><label>Parentesco</label><select id="familyInlineType"><option value="hijo">Hijo/a</option><option value="pareja">Pareja</option><option value="sobrino">Sobrino/a</option><option value="padre">Padre/madre</option><option value="otro_familiar">Otro familiar</option></select></div><div class="record-field full"><label>Autorización recibida</label><input id="familyInlineNote" placeholder="Ej.: autorización presencial del responsable"></div></div><button id="familyInlineSearch" type="button" class="btn btn-primary">Buscar familiar</button><div id="familyInlineResults" class="record-history" style="margin-top:12px"></div></div>');
    const render=async()=>{const {data,error}=await db.rpc('commit405_family_list',{p_socio_id:memberId});if(error){box.innerHTML='<div class="record-empty">No se pudo cargar la familia. Comprueba que ejecutaste el SQL 040_5.</div>';return}box.innerHTML=data?.length?data.map(x=>`<article class="record-history-item"><strong>${esc(x.nombre)} ${esc(x.apellidos)}</strong><span>${esc(x.relacion||x.tipo_vinculo||'Familiar')} · socio ${esc(x.numero_socio||'pendiente')}</span>${x.socio_id!==memberId?`<button type="button" class="btn btn-dark-outline" data-unlink="${x.familia_id}|${x.socio_id}">Revocar vínculo</button>`:''}</article>`).join(''):'<div class="record-empty">No hay relaciones familiares registradas.</div>';box.querySelectorAll('[data-unlink]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Revocar este vínculo familiar?'))return;const [family,socio]=b.dataset.unlink.split('|');const r=await db.rpc('commit405_family_unlink',{p_familia_id:family,p_socio_id:socio});if(r.error)return window.FrenteNotify.error(r.error.message);render()})};
    $('#familyInlineSearch').onclick=async()=>{const q=$('#familyInlineQuery').value.trim();if(q.length<2)return;const {data,error}=await db.rpc('family_admin_search',{p_query:q});if(error)return window.FrenteNotify.error(error.message);$('#familyInlineResults').innerHTML=(data||[]).filter(x=>x.id!==memberId).map(x=>`<article class="record-history-item"><strong>${esc(x.nombre)} ${esc(x.apellidos)}</strong><span>Socio ${esc(x.numero_socio||'pendiente')}</span><button type="button" class="btn btn-primary" data-add-family="${x.id}">Añadir</button></article>`).join('')||'Sin coincidencias';document.querySelectorAll('[data-add-family]').forEach(b=>b.onclick=async()=>{const note=$('#familyInlineNote').value.trim();if(!note)return window.FrenteNotify.error('Indica cómo se recibió la autorización.');const found=b.dataset.addFamily,currentManages=$('#familyInlineDirection').value==='current';const r=await db.rpc('family_admin_link',{p_gestor:currentManages?memberId:found,p_gestionado:currentManages?found:memberId,p_tipo:$('#familyInlineType').value,p_observaciones:note});if(r.error)return window.FrenteNotify.error(r.error.message);window.FrenteNotify.success('Familiar añadido sin eliminar los vínculos anteriores.');$('#familyInlineResults').innerHTML='';render()})};
    await render();
  }

  async function showCalculatedCategory(db,m,container){
    if(!container||!m.fecha_nacimiento)return;
    const {data:campaign}=await db.from("campanas_abonados").select("id,nombre,temporada,fecha_corte").in("estado",["abierta","revision","borrador"]).order("temporada",{ascending:false}).limit(1).maybeSingle();
    if(!campaign)return;
    const {data:categories}=await db.from("campanas_categorias").select("nombre,nacimiento_desde,nacimiento_hasta,cuota,activa").eq("campana_id",campaign.id).eq("activa",true).order("orden");
    const list=categories||[];
    const category=m.es_directivo?list.find(x=>String(x.nombre).toLowerCase()==="directivo"):list.find(x=>(!x.nacimiento_desde||m.fecha_nacimiento>=x.nacimiento_desde)&&(!x.nacimiento_hasta||m.fecha_nacimiento<=x.nacimiento_hasta)&&String(x.nombre).toLowerCase()!=="directivo");
    if(!category)return;
    const input=$('[name="categoria"]');if(input)input.value=String(category.nombre).toLowerCase();
    container.insertAdjacentHTML("beforeend",`<div class="record-field full"><label>Categoría y cuota calculadas</label><div class="record-history-item"><strong>${esc(category.nombre)} · ${Number(category.cuota||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</strong><span>${esc(campaign.temporada||campaign.nombre)} · nacimiento ${esc(m.fecha_nacimiento)} · fecha de corte ${esc(campaign.fecha_corte||'sin configurar')}</span><small>La tarifa puede modificarse desde Categorías y cuotas de la campaña.</small></div></div>`);
  }

  async function addPaymentButton(db){
    const box=$("#feesBox");if(!box)return;
    const {data:season}=await db.from("temporadas").select("id,nombre").eq("activa",true).limit(1).maybeSingle();
    if(!season)return;
    const {data:fee}=await db.from("cuotas_socios").select("id,estado,importe").eq("socio_id",memberId).eq("temporada_id",season.id).maybeSingle();
    if(!fee||$("#recordMarkPaid")||$("#recordReviewPayment"))return;
    if(String(fee.estado).toLowerCase()==="pagada"){
      if(Number(fee.importe||0)<=0)return;
      box.insertAdjacentHTML("afterend",`<div style="margin-top:14px"><button id="recordReviewPayment" type="button" class="btn btn-dark-outline">Marcar este pago como pendiente de comprobar</button><small style="display:block;margin-top:8px">Úsalo si no puedes confirmar el ingreso de ${esc(season.nombre)}. No elimina la cuota.</small></div>`);
      $("#recordReviewPayment").onclick=async()=>{if(!confirm('¿Marcar este pago como pendiente de comprobar?'))return;const {error}=await db.from('cuotas_socios').update({estado:'pendiente',fecha_pago:null,metodo_pago:null,referencia:null,observaciones:'Pago pendiente de comprobar durante la revisión del censo',updated_at:new Date().toISOString()}).eq('id',fee.id);if(error)return window.FrenteNotify.error(error.message);await db.from('socios').update({continuidad_estado:'pendiente_pago',datos_revision_estado:'incompleto'}).eq('id',memberId);window.FrenteNotify.success('Pago marcado para revisión.');setTimeout(()=>location.reload(),400)};
      return;
    }
    box.insertAdjacentHTML("afterend",`<div style="margin-top:14px"><button id="recordMarkPaid" type="button" class="btn btn-primary">Registrar pago de ${Number(fee.importe||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</button><small style="display:block;margin-top:8px">Temporada ${esc(season.nombre)}. Esta acción actualiza el registro económico real.</small></div>`);
    $("#recordMarkPaid").onclick=async()=>{
      if(!confirm(`¿Confirmas que se ha cobrado la cuota de ${season.nombre}?`))return;
      const method=prompt("Método de pago (transferencia, efectivo, tarjeta…)","Transferencia")||"Registro manual";
      const reference=prompt("Referencia o concepto del ingreso (opcional)","")||null;
      const {error}=await db.from("cuotas_socios").update({estado:"pagada",fecha_pago:new Date().toISOString().slice(0,10),metodo_pago:method,referencia:reference,observaciones:"Pago registrado desde la ficha del socio",updated_at:new Date().toISOString()}).eq("id",fee.id);
      if(error)return window.FrenteNotify.error(error.message);
      window.FrenteNotify.success("Pago registrado correctamente en la cuota de la temporada activa.");
      setTimeout(()=>location.reload(),500);
    };
  }
  window.addEventListener("load",()=>setTimeout(()=>enhance().catch(console.error),250));
})();
