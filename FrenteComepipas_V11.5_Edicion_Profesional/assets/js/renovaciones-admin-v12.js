(() => {
  "use strict";
  const PAYMENT_DEMO_KEY="frente_admin_pagos_demo_v12_5";

  const CONFIG = { seasonName: "2027/28" };
  const demo = {
    summary:{total_renovaciones:8,con_revision:2,importe_previsto:2855,estado_campana:"borrador",visible_socios:false},
    campaigns:[
      {id:"season-2627",nombre:"2026/27",estado_campana:"cerrada",activa:true,fecha_inicio:"2026-07-01",fecha_fin:"2027-06-30",total_renovaciones:0,importe_previsto:0},
      {id:"season-2728",nombre:"2027/28",estado_campana:"borrador",activa:false,fecha_inicio:"2027-07-01",fecha_fin:"2028-06-30",total_renovaciones:8,importe_previsto:2855}
    ],
    renewals:[
      {numero_socio:"001",nombre:"Juan",apellidos:"Pérez",sector:"Preferencia Baja",categoria_cuota:"Adulto",precio_abono:425,cuota_pena:20,descuento_club:75,importe_calculado:370,estado:"pendiente_decision"},
      {numero_socio:"002",nombre:"Ana",apellidos:"López",sector:"Fondo Alto",categoria_cuota:"Joven",precio_abono:310,cuota_pena:10,descuento_club:0,importe_calculado:320,estado:"solicitada"},
      {numero_socio:"003",nombre:"Lucas",apellidos:"Martín",sector:"Gol Bajo",categoria_cuota:"Infantil",precio_abono:210,cuota_pena:0,descuento_club:0,importe_calculado:210,estado:"pendiente_pago"},
      {numero_socio:"004",nombre:"María",apellidos:"Santos",sector:"Tribuna",categoria_cuota:"Adulto",precio_abono:690,cuota_pena:20,descuento_club:100,importe_calculado:610,estado:"pagada"},
      {numero_socio:"005",nombre:"Pedro",apellidos:"Ruiz",sector:null,categoria_cuota:"Adulto",precio_abono:0,cuota_pena:20,descuento_club:0,importe_calculado:20,estado:"incidencia"},
      {numero_socio:"006",nombre:"Laura",apellidos:"Díaz",sector:"Fondo Bajo",categoria_cuota:"Joven",precio_abono:280,cuota_pena:10,descuento_club:25,importe_calculado:265,estado:"gestion_club"},
      {numero_socio:"007",nombre:"Carlos",apellidos:"Vega",sector:"Preferencia Alta",categoria_cuota:"Adulto",precio_abono:510,cuota_pena:20,descuento_club:0,importe_calculado:530,estado:"abono_confirmado"},
      {numero_socio:"008",nombre:"Nuria",apellidos:"Romero",sector:"Gol Alto",categoria_cuota:null,precio_abono:510,cuota_pena:0,descuento_club:0,importe_calculado:510,estado:"incidencia"}
    ],
    sectors:[
      {id:"demo-1",nombre:"Preferencia Baja",codigo:"PREF-B",grada:"Preferencia",activo:true,orden:1},
      {id:"demo-2",nombre:"Fondo Alto",codigo:"FON-A",grada:"Fondo",activo:true,orden:2},
      {id:"demo-3",nombre:"Tribuna",codigo:"TRIB",grada:"Tribuna",activo:true,orden:3}
    ],
    tariffs:[
      {id:"tar-1",sector_id:"demo-1",sector:"Preferencia Baja",precio:425,activo:true},
      {id:"tar-2",sector_id:"demo-2",sector:"Fondo Alto",precio:310,activo:true},
      {id:"tar-3",sector_id:"demo-3",sector:"Tribuna",precio:690,activo:true}
    ],
    categories:[
      {id:"cat-1",categoria:"Infantil",nacimiento_desde:null,nacimiento_hasta:null,importe:0,asignacion_automatica:false,activa:true},
      {id:"cat-2",categoria:"Joven",nacimiento_desde:null,nacimiento_hasta:null,importe:10,asignacion_automatica:false,activa:true},
      {id:"cat-3",categoria:"Adulto",nacimiento_desde:null,nacimiento_hasta:null,importe:20,asignacion_automatica:false,activa:true}
    ],
    discounts:[
      {id:"disc-1",numero_socio:"001",nombre:"Juan Pérez",concepto:"Cesión de entradas",importe:75,referencia_club:"MCF-001"},
      {id:"disc-2",numero_socio:"004",nombre:"María Santos",concepto:"Cesión de entradas",importe:100,referencia_club:"MCF-004"}
    ]
  };

  let client=null, connected=false, seasonId=null, state=structuredClone(demo);
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]);
  const fmtDate=v=>v?new Intl.DateTimeFormat("es-ES").format(new Date(`${v}T00:00:00`)):"Sin límite";

  
  function loadDemoPayments(){try{return JSON.parse(localStorage.getItem(PAYMENT_DEMO_KEY)||"{}")}catch{return{}}}
  function saveDemoPayments(value){localStorage.setItem(PAYMENT_DEMO_KEY,JSON.stringify(value))}
  function paymentMethodLabel(v){return({transferencia:"Transferencia",tarjeta:"Tarjeta / TPV",efectivo:"Efectivo",otro:"Otro"})[v]||"—"}
  function csvEscape(v){const s=String(v??"");return `"${s.replaceAll('"','""')}"`}
  function setText(id,value){const e=$(id);if(e)e.textContent=value}

function toast(message){$("toast").textContent=message;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),2800)}

  async function initClient(){
    if(!window.FrenteSupabase)return;
    const result=await window.FrenteSupabase.init();
    if(result?.mode==="online"&&window.FrenteSupabase.client){client=window.FrenteSupabase.client;connected=true}
  }

  async function loadData(){
    if(!connected){state=structuredClone(demo);render();return}
    try{
      const [seasonsRes,summariesRes]=await Promise.all([
        client.from("temporadas").select("id,nombre,estado_campana,visible_socios,activa,fecha_inicio,fecha_fin").order("nombre",{ascending:false}),
        client.from("v_resumen_campanas_renovacion").select("*")
      ]);
      if(seasonsRes.error)throw seasonsRes.error;
      if(summariesRes.error)throw summariesRes.error;
      const seasonRes={data:(seasonsRes.data||[]).find(x=>x.nombre===CONFIG.seasonName),error:null};
      if(!seasonRes.data)throw new Error(`No existe la temporada ${CONFIG.seasonName}`);
      seasonId=seasonRes.data.id;
      const [summaryRes,renewalsRes,sectorsRes,tariffsRes,categoriesRes,discountsRes]=await Promise.all([
        client.from("v_resumen_campanas_renovacion").select("*").eq("temporada",CONFIG.seasonName).maybeSingle(),
        client.from("v_renovaciones_control").select("*").eq("temporada",CONFIG.seasonName).order("numero_socio"),
        client.from("sectores_malaga").select("*").order("orden"),
        client.from("tarifas_sector_temporada").select("id,sector_id,precio,activo,sectores_malaga(nombre),temporadas!inner(nombre)").eq("temporadas.nombre",CONFIG.seasonName),
        client.from("v_categorias_cuota_configuracion").select("*").eq("temporada",CONFIG.seasonName).order("orden"),
        client.from("descuentos_club").select("id,socio_id,concepto,importe,referencia_club,socios(numero_socio,nombre,apellidos),temporadas!inner(nombre)").eq("temporadas.nombre",CONFIG.seasonName)
      ]);
      for(const r of [summaryRes,renewalsRes,sectorsRes,tariffsRes,categoriesRes,discountsRes])if(r.error)throw r.error;
      const summaryById=new Map((summariesRes.data||[]).map(x=>[x.temporada_id,x]));
      const campaigns=(seasonsRes.data||[]).map(s=>({...s,...(summaryById.get(s.id)||{}),id:s.id,nombre:s.nombre,temporada:s.nombre}));
      state={
        campaigns,
        summary:summaryRes.data||{...demo.summary,estado_campana:seasonRes.data.estado_campana,visible_socios:seasonRes.data.visible_socios},
        renewals:renewalsRes.data||[], sectors:sectorsRes.data||[],
        tariffs:(tariffsRes.data||[]).map(t=>({id:t.id,sector_id:t.sector_id,sector:t.sectores_malaga?.nombre||"Sin sector",precio:t.precio,activo:t.activo})),
        categories:(categoriesRes.data||[]).map(c=>({...c,id:c.id,activa:c.activa??true})),
        discounts:(discountsRes.data||[]).map(d=>({id:d.id,socio_id:d.socio_id,numero_socio:d.socios?.numero_socio,nombre:`${d.socios?.nombre||""} ${d.socios?.apellidos||""}`.trim(),concepto:d.concepto,importe:d.importe,referencia_club:d.referencia_club}))
      };
    }catch(e){console.error(e);connected=false;state=structuredClone(demo);toast("No se pudo conectar. Se muestra la demostración.")}
    render();
  }


  function applyDemoPayments(){
    if(connected)return;
    const payments=loadDemoPayments();
    state.renewals.forEach(r=>{
      const p=payments[r.id];
      if(!p)return;
      r.estado=p.estado;
      r.pagado=p.estado==="pagada"||p.estado==="abono_confirmado";
      r.importe_pagado=Number(p.importe_recibido||0);
      r.metodo_pago=p.metodo_pago||null;
      r.referencia_pago=p.referencia_pago||null;
      r.notas_pago=p.notas||null;
    });
  }

  function render(){
    applyDemoPayments();
    const s=state.summary||{};
    $("metricSocios").textContent=s.total_renovaciones??state.renewals.length;
    $("metricPreparadas").textContent=state.renewals.length;
    $("metricIncidencias").textContent=s.con_revision??state.renewals.filter(r=>r.requiere_revision||r.estado==="incidencia").length;
    $("metricPrevisto").textContent=money(s.importe_previsto??state.renewals.reduce((a,r)=>a+Number(r.importe_calculado||0),0));
    const collected=state.renewals.reduce((a,r)=>a+Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0),0);
    const expected=Number(s.importe_previsto??state.renewals.reduce((a,r)=>a+Number(r.importe_calculado||0),0));
    $("metricCobrado").textContent=money(collected);
    $("metricPendienteCobro").textContent=money(Math.max(0,expected-collected));
    const status=s.estado_campana||"borrador";
    $("campaignStatusText").textContent=status.charAt(0).toUpperCase()+status.slice(1);
    $("campaignStatus").className=`status-dot ${status}`;
    $("prepareCampaignBtn").disabled=status==="abierta";
    $("openCampaignBtn").disabled=status!=="preparada";
    $("closeCampaignBtn").disabled=status!=="abierta";
    $("connectionBadge").textContent=connected?"Conectado a Supabase":"Demostración local · configura Supabase";
    $("connectionBadge").className=`badge ${connected?"badge-success":"badge-warning"}`;
    renderSeasonSelector();renderCampaigns();renderRenewals();renderSectors();renderTariffs();renderCategories();renderDiscounts();renderReadiness();
  }


  function renderSeasonSelector(){
    const campaigns=state.campaigns||[];
    $("seasonSelect").innerHTML=campaigns.map(c=>`<option value="${esc(c.nombre)}" ${c.nombre===CONFIG.seasonName?"selected":""}>${esc(c.nombre)}</option>`).join("");
    $("pageSeasonLabel").textContent=CONFIG.seasonName;
  }

  function renderCampaigns(){
    const campaigns=state.campaigns||[];
    $("campaignsList").innerHTML=campaigns.map(c=>`<article class="campaign-card ${c.nombre===CONFIG.seasonName?"current":""}">
      <div class="campaign-card-head"><h3>${esc(c.nombre)}</h3><span class="state-badge ${esc(c.estado_campana||"borrador")}">${esc((c.estado_campana||"borrador").replaceAll("_"," "))}</span></div>
      <div class="campaign-card-stats"><span>${Number(c.total_renovaciones||0)} renovaciones</span><strong>${money(c.importe_previsto||0)}</strong></div>
      <div class="campaign-card-actions">
        <button class="btn btn-secondary btn-small" data-select-campaign="${esc(c.nombre)}">Abrir panel</button>
        <button class="btn btn-secondary btn-small" data-duplicate-campaign="${esc(c.id)}">Duplicar</button>
        ${c.estado_campana!=="archivada"?`<button class="btn btn-secondary btn-small" data-archive-campaign="${esc(c.id)}">Archivar</button>`:""}
      </div>
    </article>`).join("")||'<div class="empty-state">No hay campañas creadas.</div>';
    $("campaignCopyFrom").innerHTML='<option value="">No copiar</option>'+campaigns.map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join("");
  }

  function openCampaignDialog(copyFrom=""){
    $("campaignId").value="";$("campaignName").value="";$("campaignStart").value="";$("campaignEnd").value="";$("campaignCopyFrom").value=copyFrom||"";
    $("campaignDialogTitle").textContent=copyFrom?"Duplicar campaña":"Nueva campaña";
    $("campaignDialog").showModal();
  }

  async function saveCampaign(e){
    e.preventDefault();
    const nombre=$("campaignName").value.trim();
    const fecha_inicio=$("campaignStart").value||null,fecha_fin=$("campaignEnd").value||null,copyFrom=$("campaignCopyFrom").value||null;
    if(!/^\d{4}\/\d{2}$/.test(nombre))return toast("Usa el formato 2028/29.");
    if(!connected){
      if((state.campaigns||[]).some(c=>c.nombre===nombre))return toast("Esa temporada ya existe.");
      state.campaigns.unshift({id:`season-${Date.now()}`,nombre,estado_campana:"borrador",fecha_inicio,fecha_fin,total_renovaciones:0,importe_previsto:0});
      $("campaignDialog").close();render();toast(copyFrom?"Campaña duplicada en demostración.":"Campaña creada en demostración.");return;
    }
    try{
      const ins=await client.from("temporadas").insert({nombre,fecha_inicio,fecha_fin,estado_campana:"borrador",visible_socios:false,activa:false}).select("id").single();
      if(ins.error)throw ins.error;
      if(copyFrom){
        const [cats,tars]=await Promise.all([
          client.from("categorias_cuota").select("nombre,codigo,edad_min,edad_max,importe,exenta,activa,orden,asignacion_automatica,descripcion,nacimiento_desde,nacimiento_hasta").eq("temporada_id",copyFrom),
          client.from("tarifas_sector_temporada").select("sector_id,precio,activo,observaciones").eq("temporada_id",copyFrom)
        ]);
        if(cats.error)throw cats.error;if(tars.error)throw tars.error;
        if(cats.data?.length){const r=await client.from("categorias_cuota").insert(cats.data.map(x=>({...x,temporada_id:ins.data.id})));if(r.error)throw r.error}
        if(tars.data?.length){const r=await client.from("tarifas_sector_temporada").insert(tars.data.map(x=>({...x,temporada_id:ins.data.id})));if(r.error)throw r.error}
      }
      $("campaignDialog").close();toast(copyFrom?"Campaña duplicada.":"Campaña creada.");await loadData();
    }catch(err){toast(err.message)}
  }

  async function archiveCampaign(id){
    if(!confirm("¿Archivar esta campaña? Seguirá conservando todo su historial."))return;
    if(!connected){const c=state.campaigns.find(x=>x.id===id);if(c)c.estado_campana="archivada";render();toast("Campaña archivada en demostración.");return}
    const r=await client.from("temporadas").update({estado_campana:"archivada",visible_socios:false}).eq("id",id);if(r.error)return toast(r.error.message);toast("Campaña archivada.");await loadData();
  }

  async function selectSeason(name){CONFIG.seasonName=name;seasonId=null;await loadData()}

  function renderRenewals(){
    const q=$("searchInput").value.trim().toLowerCase(), st=$("statusFilter").value;
    const rows=state.renewals.filter(r=>(!q||`${r.numero_socio||""} ${r.nombre||""} ${r.apellidos||""}`.toLowerCase().includes(q))&&(!st||r.estado===st));
    $("renewalsTableBody").innerHTML=rows.map(r=>`<tr><td><strong>${esc(r.numero_socio||"—")} · ${esc(r.nombre)} ${esc(r.apellidos)}</strong></td><td>${esc(r.sector||"Sin asignar")}</td><td>${esc(r.categoria_cuota||"Revisar")}</td><td>${money(r.precio_abono)}</td><td>${money(r.cuota_pena)}</td><td>− ${money(r.descuento_club)}</td><td><strong>${money(r.importe_calculado)}</strong></td><td><span class="state-pill ${esc(r.estado)}">${esc((r.estado||"").replaceAll("_"," "))}</span></td><td><div class="row-actions"><button class="btn btn-secondary btn-small" data-payment-id="${esc(r.id)}">Pago</button></div></td></tr>`).join("");
    $("emptyState").classList.toggle("hidden",rows.length>0);
  }

  function renderSectors(){
    $("sectorsList").innerHTML=state.sectors.map(s=>`<article class="list-card"><div><strong>${esc(s.nombre)}</strong><p>${esc(s.codigo||"Sin código")} · ${esc(s.grada||"Sin zona")} · ${s.activo?"Activo":"Inactivo"}</p></div><div class="list-card-actions"><button class="btn btn-secondary" data-edit-sector="${esc(s.id)}">Editar</button></div></article>`).join("")||'<div class="empty-state">Todavía no hay sectores.</div>';
  }

  function renderTariffs(){
    $("tariffsList").innerHTML=state.tariffs.map(t=>`<article class="list-card"><div><strong>${esc(t.sector)}</strong><p>${t.activo?"Tarifa activa":"Tarifa inactiva"}</p></div><div class="inline-value"><strong>${money(t.precio)}</strong><button class="btn btn-secondary" data-edit-tariff="${esc(t.id)}">Editar</button></div></article>`).join("")||'<div class="empty-state">Todavía no hay tarifas para esta temporada.</div>';
  }

  function renderCategories(){
    $("categoriesList").innerHTML=state.categories.map(c=>`<article class="list-card"><div><strong>${esc(c.categoria)}</strong><p>Nacidos desde: ${esc(fmtDate(c.nacimiento_desde))} · Hasta: ${esc(fmtDate(c.nacimiento_hasta))} · ${c.asignacion_automatica?"Asignación automática":"Pendiente de fechas oficiales"}</p></div><div class="inline-value"><strong>${money(c.importe)}</strong><button class="btn btn-secondary" data-edit-category="${esc(c.id)}">Editar</button></div></article>`).join("");
  }

  function renderDiscounts(){
    $("discountsList").innerHTML=state.discounts.map(d=>`<article class="list-card"><div><strong>Socio ${esc(d.numero_socio||"—")} · ${esc(d.nombre||"Sin identificar")}</strong><p>${esc(d.concepto)}${d.referencia_club?` · Ref. ${esc(d.referencia_club)}`:""}</p></div><strong>− ${money(d.importe)}</strong></article>`).join("")||'<div class="empty-state">No hay descuentos individuales cargados.</div>';
  }


  function paymentRows(){
    const filter=$("paymentStatusFilter")?.value||"";
    const allowed=["pendiente_pago","pago_parcial","pagada","gestion_club","abono_confirmado"];
    return state.renewals.filter(r=>(allowed.includes(r.estado)||r.confirmada_por_socio||r.estado==="solicitada")&&(!filter||r.estado===filter));
  }

  function renderPayments(){
    const rows=paymentRows();
    const paid=state.renewals.filter(r=>r.estado==="pagada"||r.estado==="abono_confirmado");
    const collected=state.renewals.reduce((a,r)=>a+Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0),0);
    const expected=state.renewals.filter(r=>r.estado!=="no_renueva").reduce((a,r)=>a+Number(r.importe_calculado||0),0);
    setText("paymentsCount",paid.length);
    setText("paymentsCollected",money(collected));
    setText("paymentsPending",money(Math.max(0,expected-collected)));
    $("paymentsList").innerHTML=rows.map(r=>`
      <article class="payment-admin-card">
        <div class="meta"><strong>${esc(r.numero_socio||"—")} · ${esc(r.nombre)} ${esc(r.apellidos)}</strong><span>${esc(r.sector||"Sin sector")} · ${esc(r.categoria_cuota||"Sin categoría")}</span></div>
        <div class="cell"><span>Total</span><strong>${money(r.importe_calculado)}</strong></div>
        <div class="cell"><span>Recibido</span><strong>${money(r.importe_pagado??(r.pagado?r.importe_calculado:0))}</strong></div>
        <div class="cell"><span>Método</span><strong>${esc(paymentMethodLabel(r.metodo_pago))}</strong></div>
        <div class="cell"><span>Estado</span><strong>${esc((r.estado||"").replaceAll("_"," "))}</strong></div>
        <div class="row-actions"><button class="btn btn-primary btn-small" data-payment-id="${esc(r.id)}">Registrar / validar</button></div>
      </article>`).join("")||'<div class="empty-state">No hay cobros que coincidan con el filtro.</div>';
  }

  function openPaymentDialog(id){
    const r=state.renewals.find(x=>String(x.id)===String(id));
    if(!r)return toast("No se encontró la renovación.");
    $("paymentRenewalId").value=r.id;
    $("paymentPerson").textContent=`${r.numero_socio||"—"} · ${r.nombre||""} ${r.apellidos||""}`;
    $("paymentState").value=["pendiente_pago","pago_parcial","pagada","gestion_club","abono_confirmado"].includes(r.estado)?r.estado:"pendiente_pago";
    $("paymentReceived").value=Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0).toFixed(2);
    $("paymentMethod").value=r.metodo_pago||"transferencia";
    $("paymentReference").value=r.referencia_pago||"";
    $("paymentNotes").value=r.notas_pago||"";
    $("paymentDialog").showModal();
  }

  async function savePayment(e){
    e.preventDefault();
    const id=$("paymentRenewalId").value;
    const payload={
      estado:$("paymentState").value,
      importe_recibido:Number($("paymentReceived").value||0),
      metodo_pago:$("paymentMethod").value,
      referencia_pago:$("paymentReference").value.trim()||null,
      notas:$("paymentNotes").value.trim()||null,
      fecha:new Date().toISOString()
    };
    if(payload.importe_recibido<0)return toast("El importe no puede ser negativo.");
    if(!connected){
      const payments=loadDemoPayments();
      payments[id]=payload;
      saveDemoPayments(payments);
      $("paymentDialog").close();
      toast("Pago guardado en modo demostración.");
      render();
      return;
    }
    try{
      let result;
      if(payload.estado==="pagada"){
        result=await client.rpc("registrar_pago_renovacion",{p_renovacion_id:id,p_metodo_pago:payload.metodo_pago,p_referencia_pago:payload.referencia_pago});
      }else{
        result=await client.from("renovaciones").update({estado:payload.estado,metodo_pago:payload.metodo_pago,referencia_pago:payload.referencia_pago,notas:payload.notas}).eq("id",id);
      }
      if(result.error)throw result.error;
      $("paymentDialog").close();
      toast("Pago actualizado.");
      await loadData();
    }catch(err){toast(err.message)}
  }

  function exportPaymentsCsv(){
    const rows=paymentRows();
    const head=["Nº socio","Nombre","Sector","Categoría","Total","Recibido","Método","Referencia","Estado"];
    const lines=[head.map(csvEscape).join(",")].concat(rows.map(r=>[
      r.numero_socio,`${r.nombre||""} ${r.apellidos||""}`.trim(),r.sector,r.categoria_cuota,
      Number(r.importe_calculado||0).toFixed(2),Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0).toFixed(2),
      paymentMethodLabel(r.metodo_pago),r.referencia_pago,(r.estado||"").replaceAll("_"," ")
    ].map(csvEscape).join(",")));
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`cobros-renovaciones-${CONFIG.seasonName.replace("/","-")}.csv`;
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    toast("CSV de cobros generado.");
  }

  function readiness(){
    const activeSectors=state.sectors.filter(s=>s.activo).length;
    const activeTariffs=state.tariffs.filter(t=>t.activo).length;
    const configuredCats=state.categories.filter(c=>c.asignacion_automatica&&(c.nacimiento_desde||c.nacimiento_hasta)).length;
    const incidents=Number(state.summary?.con_revision??state.renewals.filter(r=>r.estado==="incidencia").length);
    return [
      {ok:activeSectors>0,title:"Sectores creados",detail:`${activeSectors} sectores activos`},
      {ok:activeSectors>0&&activeTariffs>=activeSectors,title:"Tarifas completas",detail:`${activeTariffs} tarifas para ${activeSectors} sectores activos`},
      {ok:configuredCats===state.categories.filter(c=>c.activa!==false).length&&configuredCats>0,title:"Fechas oficiales configuradas",detail:`${configuredCats} categorías automáticas`},
      {ok:state.renewals.length>0,title:"Renovaciones calculadas",detail:`${state.renewals.length} registros preparados`},
      {ok:incidents===0,title:"Sin incidencias pendientes",detail:incidents?`${incidents} casos necesitan revisión`:"Todos los casos están listos"}
    ];
  }

  function renderReadiness(){
    $("readinessList").innerHTML=readiness().map(x=>`<article class="check-item ${x.ok?"ok":""}"><div class="check-icon">${x.ok?"✓":"!"}</div><div><strong>${esc(x.title)}</strong><span>${esc(x.detail)}</span></div><div class="check-state">${x.ok?"Correcto":"Pendiente"}</div></article>`).join("");
    const all=readiness().every(x=>x.ok);
    $("campaignHint").textContent=all?"Todos los controles están correctos. La campaña puede abrirse.":"Revisa la pestaña Comprobación antes de abrir la campaña.";
  }

  async function getSeasonId(){if(seasonId)return seasonId;const r=await client.from("temporadas").select("id").eq("nombre",CONFIG.seasonName).single();if(r.error)throw r.error;seasonId=r.data.id;return seasonId}
  async function prepareCampaign(){if(!connected){state.summary.estado_campana="preparada";toast("Simulación: campaña preparada.");render();return}try{const id=await getSeasonId();const r=await client.rpc("preparar_campana_completa",{p_temporada_id:id});if(r.error)throw r.error;toast("Campaña preparada.");await loadData()}catch(e){toast(e.message)}}
  async function changeCampaign(action){if(!connected){state.summary.estado_campana=action==="abrir"?"abierta":"cerrada";toast(`Simulación: campaña ${action==="abrir"?"abierta":"cerrada"}.`);render();return}try{const id=await getSeasonId();const r=await client.rpc(action==="abrir"?"abrir_campana_renovacion":"cerrar_campana_renovacion",{p_temporada_id:id});if(r.error)throw r.error;toast(`Campaña ${action==="abrir"?"abierta":"cerrada"}.`);await loadData()}catch(e){toast(e.message)}}

  function openSectorDialog(s=null){$("sectorDialogTitle").textContent=s?"Editar sector":"Nuevo sector";$("sectorId").value=s?.id||"";$("sectorName").value=s?.nombre||"";$("sectorCode").value=s?.codigo||"";$("sectorStand").value=s?.grada||"";$("sectorActive").checked=s?.activo??true;$("sectorDialog").showModal()}
  async function saveSector(e){e.preventDefault();const p={nombre:$("sectorName").value.trim(),codigo:$("sectorCode").value.trim()||null,grada:$("sectorStand").value.trim()||null,activo:$("sectorActive").checked};if(!p.nombre)return;const id=$("sectorId").value;if(!connected){if(id)Object.assign(state.sectors.find(x=>x.id===id),p);else state.sectors.push({id:`demo-${Date.now()}`,orden:state.sectors.length+1,...p});$("sectorDialog").close();render();toast("Sector guardado en demostración.");return}const r=id?await client.from("sectores_malaga").update(p).eq("id",id):await client.from("sectores_malaga").insert({...p,orden:state.sectors.length+1});if(r.error)return toast(r.error.message);$("sectorDialog").close();toast("Sector guardado.");await loadData()}

  function fillSectorSelect(selected=""){$("tariffSector").innerHTML='<option value="">Selecciona sector</option>'+state.sectors.filter(s=>s.activo).map(s=>`<option value="${esc(s.id)}" ${s.id===selected?"selected":""}>${esc(s.nombre)}</option>`).join("")}
  function openTariffDialog(t=null){$("tariffDialogTitle").textContent=t?"Editar tarifa":"Nueva tarifa";$("tariffId").value=t?.id||"";fillSectorSelect(t?.sector_id||"");$("tariffPrice").value=t?.precio??"";$("tariffActive").checked=t?.activo??true;$("tariffDialog").showModal()}
  async function saveTariff(e){e.preventDefault();const id=$("tariffId").value,sector_id=$("tariffSector").value,p={sector_id,precio:Number($("tariffPrice").value),activo:$("tariffActive").checked};if(!sector_id)return toast("Selecciona un sector.");if(!connected){const sector=state.sectors.find(s=>s.id===sector_id)?.nombre||"Sector";if(id)Object.assign(state.tariffs.find(x=>x.id===id),{...p,sector});else state.tariffs.push({id:`tar-${Date.now()}`,...p,sector});$("tariffDialog").close();render();toast("Tarifa guardada en demostración.");return}try{const tid=await getSeasonId();const r=id?await client.from("tarifas_sector_temporada").update(p).eq("id",id):await client.from("tarifas_sector_temporada").upsert({...p,temporada_id:tid},{onConflict:"temporada_id,sector_id"});if(r.error)throw r.error;$("tariffDialog").close();toast("Tarifa guardada.");await loadData()}catch(err){toast(err.message)}}

  function openCategoryDialog(c){$("categoryId").value=c.id;$("categoryName").value=c.categoria;$("categoryAmount").value=c.importe;$("categoryFrom").value=c.nacimiento_desde||"";$("categoryTo").value=c.nacimiento_hasta||"";$("categoryAutomatic").checked=!!c.asignacion_automatica;$("categoryActive").checked=c.activa!==false;$("categoryDialog").showModal()}
  async function saveCategory(e){e.preventDefault();const id=$("categoryId").value,p={importe:Number($("categoryAmount").value),nacimiento_desde:$("categoryFrom").value||null,nacimiento_hasta:$("categoryTo").value||null,asignacion_automatica:$("categoryAutomatic").checked,activa:$("categoryActive").checked};if(p.nacimiento_desde&&p.nacimiento_hasta&&p.nacimiento_desde>p.nacimiento_hasta)return toast("La fecha desde no puede ser posterior a la fecha hasta.");if(!connected){Object.assign(state.categories.find(x=>x.id===id),p);$("categoryDialog").close();render();toast("Categoría guardada en demostración.");return}const r=await client.from("categorias_cuota").update(p).eq("id",id);if(r.error)return toast(r.error.message);$("categoryDialog").close();toast("Cuota y fechas guardadas.");await loadData()}

  async function saveDiscount(e){e.preventDefault();const numero=Number($("discountMemberNumber").value),p={concepto:$("discountConcept").value.trim(),importe:Number($("discountAmount").value),referencia_club:$("discountReference").value.trim()||null};if(!connected){state.discounts.push({id:`disc-${Date.now()}`,numero_socio:String(numero).padStart(3,"0"),nombre:"Socio de prueba",...p});$("discountDialog").close();render();toast("Descuento guardado en demostración.");return}try{const [season,member]=await Promise.all([getSeasonId(),client.from("socios").select("id").eq("numero_socio",numero).single()]);if(member.error)throw new Error("No se encontró ese número de socio.");const r=await client.from("descuentos_club").upsert({temporada_id:season,socio_id:member.data.id,...p},{onConflict:"temporada_id,socio_id,concepto"});if(r.error)throw r.error;$("discountDialog").close();toast("Descuento guardado.");await loadData()}catch(err){toast(err.message)}}

  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(`tab-${b.dataset.tab}`).classList.add("active")}));
  $("searchInput").addEventListener("input",renderRenewals);$("statusFilter").addEventListener("change",renderRenewals);$("reloadBtn").addEventListener("click",loadData);$("prepareCampaignBtn").addEventListener("click",prepareCampaign);$("openCampaignBtn").addEventListener("click",()=>changeCampaign("abrir"));$("closeCampaignBtn").addEventListener("click",()=>changeCampaign("cerrar"));
  $("newSectorBtn").addEventListener("click",()=>openSectorDialog());$("sectorForm").addEventListener("submit",saveSector);$("sectorsList").addEventListener("click",e=>{const id=e.target.dataset.editSector;if(id)openSectorDialog(state.sectors.find(s=>s.id===id))});
  $("newTariffBtn").addEventListener("click",()=>openTariffDialog());$("tariffForm").addEventListener("submit",saveTariff);$("tariffsList").addEventListener("click",e=>{const id=e.target.dataset.editTariff;if(id)openTariffDialog(state.tariffs.find(t=>t.id===id))});
  $("categoryForm").addEventListener("submit",saveCategory);$("categoriesList").addEventListener("click",e=>{const id=e.target.dataset.editCategory;if(id)openCategoryDialog(state.categories.find(c=>c.id===id))});
  $("newDiscountBtn").addEventListener("click",()=>$("discountDialog").showModal());$("discountForm").addEventListener("submit",saveDiscount);

  $("newCampaignBtn").addEventListener("click",()=>openCampaignDialog());
  $("campaignForm").addEventListener("submit",saveCampaign);
  $("seasonSelect").addEventListener("change",e=>selectSeason(e.target.value));
  $("campaignsList").addEventListener("click",e=>{
    const selected=e.target.dataset.selectCampaign,duplicate=e.target.dataset.duplicateCampaign,archive=e.target.dataset.archiveCampaign;
    if(selected)selectSeason(selected);
    if(duplicate)openCampaignDialog(duplicate);
    if(archive)archiveCampaign(archive);
  });
  $("paymentForm").addEventListener("submit",savePayment);
  $("paymentStatusFilter").addEventListener("change",renderPayments);
  $("exportPaymentsBtn").addEventListener("click",exportPaymentsCsv);
  $("paymentsList").addEventListener("click",e=>{const id=e.target.dataset.paymentId;if(id)openPaymentDialog(id)});
  $("renewalsTableBody").addEventListener("click",e=>{const id=e.target.dataset.paymentId;if(id)openPaymentDialog(id)});
  initClient().then(loadData);
})();
