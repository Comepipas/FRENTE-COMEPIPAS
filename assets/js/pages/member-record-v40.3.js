(()=>{
  "use strict";
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const memberId=new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("incidencia");
  const text=v=>v==null||String(v).trim()===""?"Sin informar":String(v);

  async function enhance(){
    if(!memberId)return;
    const db=window.FrenteDatabase.getClient();
    const {data:m,error}=await db.from("socios").select("numero_socio,numero_socio_provisional,numero_socio_estado,antiguedad_declarada_tipo,antiguedad_declarada_temporada,antiguedad_declarada_anio,antiguedad_declarada_observaciones,antiguedad_estado,precio_abono,sector,sector_codigo_club,gestion_abono_preferida,continuidad_estado,menor_sin_dni,email,email_contacto,correo_compartido_familiar,datos_revision_estado,datos_revisados_at,fecha_nacimiento,categoria,es_directivo,cargo_directiva,cuenta_activada,auth_user_id").eq("id",memberId).single();
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
    await setupFamilyAdmin(db);
    const price=$('[name="precio_abono"]');
    if(price&&m.precio_abono==null){price.placeholder="Importe sin informar";price.value=""}
    const sector=$('[name="sector"]');if(sector&&!m.sector)sector.placeholder="Sector pendiente";
    const fee=$('[name="cuota_al_dia"]');if(fee){fee.disabled=true;fee.closest("label")?.append(" (calculado desde Cuotas y pagos)")}
    await addPaymentButton(db);
  }

  function setupAccountAndBoard(m){
    const account=$('[name="cuenta_activada"]');if(account){account.checked=!!(m.cuenta_activada||m.auth_user_id);account.disabled=true;const label=account.closest('label');if(label){label.title='Se activa automáticamente al vincular una cuenta de Supabase. Para bloquear acceso use Usuarios y permisos.';label.append(' (automático)')}}
    const board=$('[name="es_directivo"]'),old=$('[name="cargo_directiva"]');if(!old)return;
    const select=document.createElement('select');select.name='cargo_directiva';select.disabled=true;select.innerHTML='<option value="">Seleccionar cargo</option><option>Presidente</option><option>Vicepresidente</option><option>Secretario</option><option>Tesorero</option><option>Directivo</option><option>Vocal</option>';select.value=m.cargo_directiva||'';old.replaceWith(select);
    const wrap=select.closest('.record-field');const toggle=()=>{wrap.hidden=!board.checked;if(!board.checked)select.value=''};board?.addEventListener('change',toggle);toggle();
  }

  function setupSeasonTicket(m){
    const panel=$('[data-panel="abono"]');if(!panel)return;
    ['fila','asiento'].forEach(name=>$(`[name="${name}"]`)?.closest('.record-field')?.remove());
    const sector=$('[name="sector"]');if(sector){const label=sector.closest('.record-field')?.querySelector('label');if(label)label.textContent='Sector del club'}
    if(!panel.querySelector('[name="sector_codigo_club"]'))sector?.closest('.record-field')?.insertAdjacentHTML('afterend',`<div class="record-field"><label>Número identificador del sector</label><input name="sector_codigo_club" value="${esc(m.sector_codigo_club||'')}" disabled></div>`);
  }

  function simplifyTabs(){
    document.querySelector('[data-tab="historial"]')?.remove();document.querySelector('[data-panel="historial"]')?.remove();
    const feesLink=$('#recordFeesLink');if(feesLink){feesLink.insertAdjacentHTML('afterend','<p class="cms-note">La cuota se registra desde esta ficha cuando está pendiente. El resumen general de tesorería permanece separado.</p>');feesLink.remove()}
  }

  async function setupFamilyAdmin(db){
    const box=$('#guardiansBox');if(!box)return;
    box.insertAdjacentHTML('afterend','<div id="familyInlineAdmin" style="margin-top:18px"><h3>Añadir familiar autorizado</h3><div class="record-grid"><div class="record-field"><label>Buscar por número, DNI o nombre</label><input id="familyInlineQuery"></div><div class="record-field"><label>Quién realizará la gestión</label><select id="familyInlineDirection"><option value="current">Este socio gestionará al familiar</option><option value="found">El familiar gestionará a este socio</option></select></div><div class="record-field"><label>Parentesco</label><select id="familyInlineType"><option value="hijo">Hijo/a</option><option value="pareja">Pareja</option><option value="sobrino">Sobrino/a</option><option value="padre">Padre/madre</option><option value="otro_familiar">Otro familiar</option></select></div><div class="record-field full"><label>Autorización recibida</label><input id="familyInlineNote" placeholder="Ej.: autorización presencial del responsable"></div></div><button id="familyInlineSearch" type="button" class="btn btn-primary">Buscar familiar</button><div id="familyInlineResults" class="record-history" style="margin-top:12px"></div></div>');
    const render=async()=>{const {data,error}=await db.rpc('commit405_family_list',{p_socio_id:memberId});if(error)return;box.innerHTML=data?.length?data.map(x=>`<article class="record-history-item"><strong>${esc(x.nombre)} ${esc(x.apellidos)}</strong><span>${esc(x.relacion||x.tipo_vinculo||'Familiar')} · socio ${esc(x.numero_socio||'pendiente')}</span>${x.socio_id!==memberId?`<button type="button" class="btn btn-dark-outline" data-unlink="${x.familia_id}|${x.socio_id}">Revocar vínculo</button>`:''}</article>`).join(''):'<div class="record-empty">No hay relaciones familiares registradas.</div>';box.querySelectorAll('[data-unlink]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Revocar este vínculo familiar?'))return;const [family,socio]=b.dataset.unlink.split('|');const r=await db.rpc('commit405_family_unlink',{p_familia_id:family,p_socio_id:socio});if(r.error)return window.FrenteNotify.error(r.error.message);render()})};
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
