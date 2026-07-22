(()=>{
"use strict";
const $=id=>document.getElementById(id),svc=()=>window.FrenteMembersService;
const MEMBER_STATES=["pendiente","activo","bloqueado","baja"];
const state={rows:[],count:0,page:1,pageSize:50,loading:false,states:[...MEMBER_STATES],categories:[]};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
function setConnection(type,text){const el=$("membersConnection");el.className=`members-connection ${type}`;el.querySelector("strong").textContent=text}
function setLoading(value,text="Cargando socios…"){
  state.loading=value;
  const loading=$("membersLoading");
  if(loading){
    loading.hidden=!value;
    loading.style.setProperty("display",value?"flex":"none","important");
  }
  const label=$("membersLoadingText");
  if(label)label.textContent=text;
}
function errorText(error){const m=error?.message||String(error);if(m.includes("row-level security"))return"Supabase ha bloqueado la operación por las políticas RLS. Revisa que hayas iniciado sesión con un usuario autorizado.";if(m.includes("duplicate key"))return"Ya existe un socio con ese número, DNI o correo electrónico.";if(m.includes("invalid input value for enum"))return"El estado seleccionado no coincide con los valores permitidos en Supabase.";return m}
function filters(){return{search:$("membersSearch").value,status:$("membersStatus").value,category:$("membersCategory").value,account:$("membersAccount").value,fee:$("membersFee").value,page:state.page,pageSize:state.pageSize}}
async function load(){
  setLoading(true,"Cargando socios desde Supabase…");
  try{
    const r=await Promise.race([
      svc().list(filters()),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("La consulta de socios superó 15 segundos.")),15000))
    ]);
    state.rows=r.rows||[];
    state.count=Number(r.count||0);
    render();
    setConnection("online",`Conectado a Supabase · ${state.count} socios`);
    if(state.count===0){
      $("membersTableBody").innerHTML='<tr><td colspan="8" class="members-empty"><strong>Conexión correcta, pero no se reciben socios.</strong><br>Puede que la tabla esté vacía o que las políticas RLS no permitan leerla con el usuario actual.</td></tr>';
    }
  }catch(e){
    console.error("Error cargando socios:",e);
    setConnection("error","Error al leer socios");
    window.FrenteNotify.error(errorText(e));
    $("membersTableBody").innerHTML=`<tr><td colspan="8" class="members-empty"><strong>No se pudieron cargar los socios.</strong><br>${esc(errorText(e))}</td></tr>`;
  }finally{
    setLoading(false);
  }
}
function render(){renderStats();renderTable();renderPagination()}
function renderStats(){const r=state.rows;$("membersTotal").textContent=state.count;$("membersActive").textContent=r.filter(x=>String(x.estado).toLowerCase()==="activo").length;$("membersActivated").textContent=r.filter(x=>x.cuenta_activada).length;$("membersNotActivated").textContent=r.filter(x=>!x.cuenta_activada).length;$("membersPending").textContent=r.filter(x=>!x.cuota_al_dia).length;$("membersChildren").textContent=r.filter(x=>String(x.categoria).toLowerCase()==="infantil").length;$("membersYoung").textContent=r.filter(x=>String(x.categoria).toLowerCase()==="joven").length;$("membersAdult").textContent=r.filter(x=>String(x.categoria).toLowerCase()==="adulto").length}
const pill=(text,kind="")=>`<span class="status-pill ${kind}">${esc(text||"—")}</span>`;
function renderTable(){const b=$("membersTableBody");b.innerHTML=state.rows.length?state.rows.map(m=>`<tr><td>${esc(m.numero)}</td><td><strong>${esc(m.nombreCompleto)}</strong><br><small>${esc(m.email||"")}</small></td><td>${pill(m.categoria,"category-pill")}</td><td>${pill(m.cuenta,m.cuenta_activada?"fee-ok":"fee-pending")}</td><td>${pill(m.estado,String(m.estado).toLowerCase()==="activo"?"status-active":"status-inactive")}</td><td>${pill(m.cuota,m.cuota_al_dia?"fee-ok":"fee-pending")}</td><td><strong>${esc(m.sector||"Sin asignar")}</strong><br><small>${money(m.precio_abono)}</small></td><td class="members-actions-cell"><button data-view="${esc(m.id)}">Ver</button><button data-edit="${esc(m.id)}">Editar</button><button class="danger" data-delete="${esc(m.id)}">Baja</button></td></tr>`).join(""):'<tr><td colspan="8" class="members-empty">No hay socios para estos filtros.</td></tr>';b.querySelectorAll("[data-view]").forEach(x=>x.onclick=()=>openCard(x.dataset.view));b.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>openForm(x.dataset.edit));b.querySelectorAll("[data-delete]").forEach(x=>x.onclick=()=>softDelete(x.dataset.delete))}
function renderPagination(){const pages=Math.max(1,Math.ceil(state.count/state.pageSize));$("membersPageInfo").textContent=`Página ${state.page} de ${pages} · ${state.count} socios`;$("membersPrev").disabled=state.page<=1;$("membersNext").disabled=state.page>=pages}
async function loadOptions(){try{const o=await svc().distinctOptions();state.states=[...new Set([...MEMBER_STATES,...(o.states||[])])];state.categories=o.categories||[];fillSelect($("membersStatus"),state.states,"Todos los estados");fillSelect($("membersCategory"),state.categories,"Todas las categorías");fillSelect($("formEstado"),state.states,"Usar valor predeterminado");fillSelect($("formCategoria"),state.categories,"Sin categoría")}catch(e){console.warn("No se pudieron cargar opciones",e);state.states=[...MEMBER_STATES];fillSelect($("membersStatus"),state.states,"Todos los estados");fillSelect($("formEstado"),state.states,"Usar valor predeterminado")}}
function fillSelect(el,values,first){const current=el.value;el.innerHTML=`<option value="">${esc(first)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");if(values.includes(current))el.value=current}
async function openForm(id=""){const f=$("memberManagerForm");f.reset();f.elements.id.value="";$("memberManagerTitle").textContent=id?"Editar socio":"Nuevo socio";if(id){setLoading(true,"Cargando ficha…");try{const m=await svc().get(id);f.elements.id.value=m.id;f.elements.numero_socio.value=m.numero_socio;f.elements.numero_socio.readOnly=true;["nombre","apellidos","dni","fecha_nacimiento","telefono","email","direccion","foto_url","fecha_alta","estado","categoria","sector","fila","asiento","tipo_abono","precio_abono","numero_abonado_malaga","observaciones_internas"].forEach(k=>{if(f.elements[k])f.elements[k].value=m[k]??""});f.elements.cuenta_activada.checked=Boolean(m.cuenta_activada);f.elements.cuota_al_dia.checked=Boolean(m.cuota_al_dia)}finally{setLoading(false)}}else{f.elements.numero_socio.value=await svc().nextNumber();f.elements.numero_socio.readOnly=false;f.elements.fecha_alta.value=new Date().toISOString().slice(0,10);f.elements.estado.value=state.states.find(x=>String(x).toLowerCase()==="activo")||state.states[0]||"";f.elements.categoria.value=state.categories.find(x=>String(x).toLowerCase()==="adulto")||state.categories[0]||""}$("memberManagerModal").classList.add("open")}
function formData(f){const o=Object.fromEntries(new FormData(f).entries());o.cuenta_activada=f.elements.cuenta_activada.checked;o.cuota_al_dia=f.elements.cuota_al_dia.checked;return o}
async function saveMember(e){e.preventDefault();const f=e.currentTarget,id=f.elements.id.value;setLoading(true,id?"Guardando cambios…":"Creando socio…");try{id?await svc().update(id,formData(f)):await svc().create(formData(f));$("memberManagerModal").classList.remove("open");window.FrenteNotify.success(id?"Socio actualizado y cambio registrado en el historial.":"Socio creado en Supabase.");await load()}catch(err){window.FrenteNotify.error(errorText(err))}finally{setLoading(false)}}
async function softDelete(id){const m=state.rows.find(x=>x.id===id);if(!m)return;if(!confirm(`¿Dar de baja a ${m.nombreCompleto}? No se eliminará su expediente.`))return;setLoading(true,"Registrando baja…");try{await svc().softDelete(id,"baja");window.FrenteNotify.success("Baja lógica registrada. El socio no se ha eliminado.");await load()}catch(e){window.FrenteNotify.error(errorText(e))}finally{setLoading(false)}}
async function openCard(id){setLoading(true,"Cargando expediente…");try{const [m,h,g,a]=await Promise.all([svc().get(id),svc().history(id),svc().guardians(id),svc().accessSummary(id).catch(()=>({status:"sin_acceso"}))]);$("memberCardBody").innerHTML=`<div class="member-official-card"><div><span>EXPEDIENTE SUPABASE · COMMIT 16</span><h2>FRENTE COMEPIPAS</h2><h3>${esc(m.nombreCompleto)}</h3><p>Socio n.º ${esc(m.numero)}</p><p>Estado: <strong>${esc(m.estado)}</strong></p></div>${m.foto_url?`<img class="member-profile-photo" src="${esc(m.foto_url)}" alt="Foto del socio">`:'<div class="member-card-qr">FOTO</div>'}</div><div class="member-detail-grid"><div><span>DNI</span><strong>${esc(m.dni||"—")}</strong></div><div><span>Nacimiento</span><strong>${esc(m.fecha_nacimiento||"—")}</strong><small>${m.edadActual==null?"":` · ${esc(m.edadActual)} años`}</small></div><div><span>Teléfono</span><strong>${esc(m.telefono||"—")}</strong></div><div><span>Email</span><strong>${esc(m.email||"—")}</strong></div><div><span>Categoría</span><strong>${esc(m.categoria||"—")}</strong></div><div><span>N.º abonado Málaga</span><strong>${esc(m.numero_abonado_malaga||"—")}</strong></div><div><span>Sector / asiento</span><strong>${esc(m.sector||"—")} · ${esc(m.fila||"—")} / ${esc(m.asiento||"—")}</strong></div><div><span>Precio del abono</span><strong>${money(m.precio_abono)}</strong></div></div>${m.observaciones_internas?`<div class="member-notes"><strong>Observaciones internas</strong><p>${esc(m.observaciones_internas)}</p></div>`:""}<section class="access-panel"><h3>Acceso al Área del Socio</h3><p>Estado: <span class="access-status ${a.status==='activo'?'active':a.status==='invitado'?'pending':'none'}">${esc(a.status||'sin acceso')}</span></p><p><small>Correo: ${esc(a.email||m.email||'—')} · Activación: ${a.activated_at?new Date(a.activated_at).toLocaleString('es-ES'):'—'} · Último acceso: ${a.last_access_at?new Date(a.last_access_at).toLocaleString('es-ES'):'—'}</small></p><div class="access-actions">${!m.auth_user_id?`<button class="btn btn-primary" data-invite-member="${esc(m.id)}">Enviar invitación</button><button class="btn btn-secondary" data-link-existing="${esc(m.id)}">Vincular usuario existente</button>`:''}<button class="btn btn-secondary" data-recovery-email="${esc(m.email||'')}">Restablecer contraseña</button></div></section><section class="member-relations"><h3>Tutores y menores vinculados</h3>${g.length?g.map(x=>`<div class="history-row"><strong>${esc(x.parentesco)}</strong><span>${esc(x.tutor_id===m.id?`${x.menor?.nombre||""} ${x.menor?.apellidos||""}`:`${x.tutor?.nombre||""} ${x.tutor?.apellidos||""}`)}</span></div>`).join(""):"<p>No hay relaciones familiares registradas.</p>"}</section><section class="member-history"><h3>Historial de cambios</h3>${h.length?h.map(x=>`<div class="history-row"><div><strong>${esc(x.accion)}${x.campo?` · ${esc(x.campo)}`:""}</strong><small>${new Date(x.created_at).toLocaleString("es-ES")}</small></div><span>${x.campo?`${esc(x.valor_anterior||"—")} → ${esc(x.valor_nuevo||"—")}`:"Alta del expediente"}</span></div>`).join(""):"<p>Sin movimientos registrados.</p>"}</section>`;$("memberCardModal").classList.add("open");document.querySelector("[data-invite-member]")?.addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;try{await svc().invite(b.dataset.inviteMember);window.FrenteNotify.success("Invitación enviada correctamente.");await openCard(id);}catch(err){window.FrenteNotify.error(errorText(err));b.disabled=false;}});document.querySelector("[data-link-existing]")?.addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;try{await svc().linkExisting(b.dataset.linkExisting);window.FrenteNotify.success("Cuenta existente vinculada correctamente.");await openCard(id);}catch(err){window.FrenteNotify.error(errorText(err));b.disabled=false;}});document.querySelector("[data-recovery-email]")?.addEventListener("click",async e=>{const email=e.currentTarget.dataset.recoveryEmail;if(!email)return window.FrenteNotify.error("El socio no tiene correo.");try{await svc().sendRecovery(email);window.FrenteNotify.success("Correo para restablecer contraseña enviado.");}catch(err){window.FrenteNotify.error(errorText(err));}})}catch(e){window.FrenteNotify.error(errorText(e))}finally{setLoading(false)}}
async function exportExcel(){setLoading(true,"Preparando Excel desde Supabase…");try{const rows=(await svc().allForExport()).map(m=>({"Número":m.numero_socio,"Nombre":m.nombre,"Apellidos":m.apellidos,"DNI/NIE":m.dni,"Fecha nacimiento":m.fecha_nacimiento,"Edad actual":m.edadActual,"Dirección":m.direccion,"Teléfono":m.telefono,"Email":m.email,"Fecha alta":m.fecha_alta,"Estado":m.estado,"Cuenta web":m.cuenta_activada?"Activada":"Pendiente","Categoría":m.categoria,"Cuota":m.cuota_al_dia?"Al día":"Pendiente","Sector":m.sector,"Fila":m.fila,"Asiento":m.asiento,"N.º abonado Málaga":m.numero_abonado_malaga,"Precio abono":m.precio_abono,"Observaciones":m.observaciones_internas}));window.FrenteExcel.writeFile("socios-supabase-frente-comepipas.xlsx",{"Socios":rows});window.FrenteNotify.success("Excel generado con los datos reales de Supabase.")}catch(e){window.FrenteNotify.error(errorText(e))}finally{setLoading(false)}}
let timer;function scheduleLoad(){clearTimeout(timer);timer=setTimeout(()=>{state.page=1;load()},300)}
async function init(){
  setConnection("sync","Conectando…");
  setLoading(true,"Comprobando conexión con Supabase…");
  try{
    await Promise.race([
      window.FrenteDatabase.init(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("La conexión superó 15 segundos.")),15000))
    ]);
    await loadOptions();
    await load();
  }catch(e){
    console.error("Error inicializando socios:",e);
    setConnection("error","Sin acceso a socios");
    window.FrenteNotify.error(errorText(e));
    $("membersTableBody").innerHTML=`<tr><td colspan="8" class="members-empty"><strong>No se pudo abrir el módulo de socios.</strong><br>${esc(errorText(e))}</td></tr>`;
  }finally{
    setLoading(false);
  }
}
document.addEventListener("DOMContentLoaded",()=>{$("membersSearch").addEventListener("input",scheduleLoad);["membersStatus","membersAccount","membersCategory","membersFee"].forEach(id=>$(id).addEventListener("change",()=>{state.page=1;load()}));$("membersPrev").onclick=()=>{if(state.page>1){state.page--;load()}};$("membersNext").onclick=()=>{state.page++;load()};$("newMemberButton").onclick=()=>openForm();$("memberManagerClose").onclick=()=>$("memberManagerModal").classList.remove("open");$("memberCardClose").onclick=()=>$("memberCardModal").classList.remove("open");$("memberManagerForm").addEventListener("submit",saveMember);$("exportMembers").onclick=exportExcel;$("retryMembers").onclick=init;document.querySelectorAll(".member-modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));init()});
})();