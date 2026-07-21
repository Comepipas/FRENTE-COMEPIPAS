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

  let client=null, connected=false, seasonId=null, bankImportRows=[], state={
    campaigns:[],
    summary:{},
    renewals:[],
    sectors:[],
    tariffs:[],
    categories:[],
    discounts:[],paymentMethods:[]
  };
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
  const dateTime=value=>{
    if(!value)return "—";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "—";
    return new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short"}).format(date);
  };
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[m]);
  const fmtDate=v=>v?new Intl.DateTimeFormat("es-ES").format(new Date(`${v}T00:00:00`)):"Sin límite";

  
  function loadDemoPayments(){try{return JSON.parse(localStorage.getItem(PAYMENT_DEMO_KEY)||"{}")}catch{return{}}}
  function saveDemoPayments(value){localStorage.setItem(PAYMENT_DEMO_KEY,JSON.stringify(value))}
  const DEFAULT_PAYMENT_METHODS=[{codigo:"tarjeta",nombre:"Pago con tarjeta",activo:true,predeterminado:true,orden:1},{codigo:"transferencia",nombre:"Transferencia bancaria",activo:true,predeterminado:false,orden:2},{codigo:"ingreso_cuenta",nombre:"Ingreso en cuenta",activo:true,predeterminado:false,orden:3},{codigo:"bizum",nombre:"Bizum",activo:false,predeterminado:false,orden:4},{codigo:"efectivo",nombre:"Efectivo",activo:false,predeterminado:false,orden:5},{codigo:"tpv",nombre:"TPV presencial",activo:false,predeterminado:false,orden:6},{codigo:"otro",nombre:"Otro",activo:false,predeterminado:false,orden:7}];
  function paymentMethodLabel(v){return state.paymentMethods.find(m=>m.codigo===v)?.nombre||DEFAULT_PAYMENT_METHODS.find(m=>m.codigo===v)?.nombre||"—"}
  function activePaymentMethods(){return state.paymentMethods.filter(m=>m.activo).sort((a,b)=>Number(a.orden||0)-Number(b.orden||0))}
  function defaultPaymentMethod(){return activePaymentMethods().find(m=>m.predeterminado)||activePaymentMethods()[0]||null}
  function csvEscape(v){const s=String(v??"");return `"${s.replaceAll('"','""')}"`}
  function setText(id,value){const e=$(id);if(e)e.textContent=value}

  function normalizeHeader(value){return String(value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s-]+/g,"_")}
  function parseAmount(value){const raw=String(value??"").trim().replace(/\s/g,"").replace(/€/g,"");if(!raw)return NaN;const normalized=raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw;return Number(normalized)}
  function parseCsvLine(line,delimiter){const cells=[];let current="",quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++}else quoted=!quoted}else if(ch===delimiter&&!quoted){cells.push(current.trim());current=""}else current+=ch}cells.push(current.trim());return cells}
  function parseBankCsv(text){const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error("El CSV no contiene movimientos.");const delimiter=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?";":",";const headers=parseCsvLine(lines[0],delimiter).map(normalizeHeader);const aliases={fecha:["fecha","date"],importe:["importe","amount","cantidad"],concepto:["concepto","descripcion","detalle"],referencia:["referencia","reference","id_operacion"],numero_socio:["numero_socio","n_socio","socio","numero"]};const indexes={};for(const [key,names] of Object.entries(aliases)){indexes[key]=headers.findIndex(h=>names.includes(h))}if(indexes.importe<0)throw new Error("Falta la columna importe.");return lines.slice(1).map((line,index)=>{const cells=parseCsvLine(line,delimiter);const get=k=>indexes[k]>=0?(cells[indexes[k]]||"").trim():"";return{id:`bank-${index}-${Date.now()}`,fecha:get("fecha"),importe:parseAmount(get("importe")),concepto:get("concepto"),referencia:get("referencia"),numero_socio:get("numero_socio").replace(/\D/g,"")}}).filter(x=>Number.isFinite(x.importe)&&x.importe>0)}
  function findBankMatch(row){const text=`${row.numero_socio} ${row.concepto} ${row.referencia}`.toLowerCase();let candidates=state.renewals.filter(r=>!["pagada","abono_confirmado","no_renueva"].includes(r.estado));if(row.numero_socio)candidates=candidates.filter(r=>String(Number(r.numero_socio||0))===String(Number(row.numero_socio)));else candidates=candidates.filter(r=>{const n=String(Number(r.numero_socio||0));return n&&new RegExp(`(^|\\D)0*${n}(\\D|$)`).test(text)});const exact=candidates.filter(r=>Math.abs(Number(r.importe_calculado||0)-row.importe)<0.01);const match=exact.length===1?exact[0]:(candidates.length===1?candidates[0]:null);return{renewal:match,confidence:match?(exact.includes(match)?"alta":"media"):"sin_coincidencia"}}
  function renderBankImport(){const summary=$("bankImportSummary"),preview=$("bankImportPreview"),actions=$("bankImportActions");if(!summary||!preview||!actions)return;if(!bankImportRows.length){summary.classList.add("hidden");actions.classList.add("hidden");preview.innerHTML="";return}const matched=bankImportRows.filter(x=>x.match?.renewal).length;summary.classList.remove("hidden");actions.classList.remove("hidden");summary.innerHTML=`<div><strong>${bankImportRows.length}</strong><span>movimientos válidos</span></div><div><strong>${matched}</strong><span>coincidencias</span></div><div><strong>${bankImportRows.length-matched}</strong><span>por revisar</span></div>`;preview.innerHTML=bankImportRows.map(row=>{const r=row.match?.renewal;return`<article class="bank-match-card ${r?"matched":"unmatched"}"><div><strong>${esc(row.fecha||"Sin fecha")} · ${money(row.importe)}</strong><span>${esc(row.concepto||row.referencia||"Sin concepto")}</span></div><div>${r?`<strong>Socio ${esc(r.numero_socio)} · ${esc(r.nombre)} ${esc(r.apellidos)}</strong><span>${row.match.confidence==="alta"?"Coincidencia exacta":"Revisar importe antes de confirmar"}</span>`:`<strong>Sin coincidencia automática</strong><span>Añade el número de socio al CSV o registra el pago manualmente.</span>`}</div></article>`}).join("")}
  async function importBankCsv(file){const text=await file.text();bankImportRows=parseBankCsv(text).map(row=>({...row,match:findBankMatch(row)}));renderBankImport();toast(`CSV leído: ${bankImportRows.filter(x=>x.match.renewal).length} coincidencias encontradas.`)}
  function clearBankImport(){bankImportRows=[];if($("bankCsvInput"))$("bankCsvInput").value="";renderBankImport()}
  function downloadBankTemplate(){const csv="fecha;importe;concepto;referencia;numero_socio\n2027-07-15;370,00;Renovación socio 001;OPERACION-001;001\n";const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="plantilla-conciliacion-bancaria.csv";a.click();URL.revokeObjectURL(url)}
  async function applyBankMatches(){const matches=bankImportRows.filter(x=>x.match?.renewal);if(!matches.length)return toast("No hay coincidencias que confirmar.");if(!confirm(`Se registrarán ${matches.length} pagos encontrados en el CSV. ¿Continuar?`))return;try{for(const row of matches){const r=row.match.renewal;const current=Number(r.importe_pagado||0),total=Number(r.importe_calculado||0),received=current+row.importe;const payload={estado:received+0.009>=total?"pagada":"pago_parcial",importe_pagado:received,pagado:received+0.009>=total,metodo_pago:defaultPaymentMethod()?.codigo||"tarjeta",referencia_pago:row.referencia||row.concepto||null,notas_pago:`Conciliado desde CSV bancario${row.concepto?`: ${row.concepto}`:""}`,fecha_pago:row.fecha||new Date().toISOString().slice(0,10)};if(connected){const result=await client.from("renovaciones").update(payload).eq("id",r.id);if(result.error)throw result.error}else{const payments=loadDemoPayments();payments[r.id]={estado:payload.estado,importe_recibido:payload.importe_pagado,metodo_pago:payload.metodo_pago,referencia_pago:payload.referencia_pago,notas:payload.notas_pago,fecha_pago:payload.fecha_pago};saveDemoPayments(payments)}}clearBankImport();toast(`${matches.length} pagos conciliados correctamente.`);await loadData()}catch(err){toast(`No se pudo completar la conciliación: ${err.message}`)}}

function toast(message){$("toast").textContent=message;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),2800)}

  async function initClient(){
    if(!window.FrenteSupabase)return;
    const result=await window.FrenteSupabase.init();
    if(result?.mode==="online"&&window.FrenteSupabase.client){client=window.FrenteSupabase.client;connected=true}
  }

  async function loadData(){
    const emptyState=()=>({
      campaigns:[],summary:{},renewals:[],sectors:[],tariffs:[],categories:[],discounts:[],paymentMethods:[]
    });

    if(!connected||!client){
      state=emptyState();
      render();
      toast("No hay conexión con Supabase.");
      return;
    }

    try{
      const [seasonsRes,summariesRes]=await Promise.all([
        client.from("temporadas")
          .select("*")
          .order("nombre",{ascending:false}),
        client.from("v_resumen_campanas_renovacion").select("*")
      ]);

      if(seasonsRes.error)throw seasonsRes.error;
      // El resumen es auxiliar: si la vista falla, las temporadas deben seguir visibles.
      if(summariesRes.error)console.warn("No se pudo cargar el resumen de campañas:",summariesRes.error);

      const seasons=seasonsRes.data||[];
      const selectedSeason=seasons.find(x=>x.nombre===CONFIG.seasonName);
      if(!selectedSeason)throw new Error(`No existe la temporada ${CONFIG.seasonName}`);
      seasonId=selectedSeason.id;

      const [summaryRes,renewalsRes,sectorsRes,tariffsRes,categoriesRes,discountsRes,paymentMethodsRes,paymentsRes]=await Promise.all([
        client.from("v_resumen_campanas_renovacion").select("*").eq("temporada",CONFIG.seasonName).maybeSingle(),
        client.from("v_renovaciones_control").select("*").eq("temporada",CONFIG.seasonName).order("numero_socio"),
        client.from("sectores_malaga").select("*").order("orden"),
        client.from("tarifas_sector_temporada")
          .select("id,sector_id,precio,activo,sectores_malaga(nombre),temporadas!inner(nombre)")
          .eq("temporadas.nombre",CONFIG.seasonName),
        client.from("v_categorias_cuota_configuracion").select("*").eq("temporada",CONFIG.seasonName).order("orden"),
        client.from("descuentos_club")
          .select("id,socio_id,concepto,importe,referencia_club,socios(numero_socio,nombre,apellidos),temporadas!inner(nombre)")
          .eq("temporadas.nombre",CONFIG.seasonName),
        client.from("metodos_pago_renovacion").select("*").order("orden"),
        client.from("renovaciones").select("id,importe_pagado,pagado,metodo_pago,referencia_pago,notas_pago,fecha_pago")
      ]);

      for(const response of [summaryRes,renewalsRes,sectorsRes,tariffsRes,categoriesRes,discountsRes,paymentMethodsRes,paymentsRes]){
        if(response.error)throw response.error;
      }

      const paymentsById=new Map((paymentsRes.data||[]).map(p=>[String(p.id),p]));
      const renewals=(renewalsRes.data||[]).map(r=>({...r,...(paymentsById.get(String(r.id))||{})}));
      const calculatedSummary={
        temporada_id:selectedSeason.id,
        temporada:selectedSeason.nombre,
        total_renovaciones:renewals.length,
        con_revision:renewals.filter(r=>r.requiere_revision===true||r.estado==="incidencia").length,
        importe_previsto:renewals.reduce((total,r)=>total+Number(r.importe_calculado||0),0),
        estado_campana:selectedSeason.estado_campana||"borrador",
        visible_socios:selectedSeason.visible_socios===true,
        renovacion_abierta:selectedSeason.renovacion_abierta===true,
        fecha_apertura:selectedSeason.fecha_apertura||null,
        fecha_cierre:selectedSeason.fecha_cierre||null,
        fecha_preparacion:renewals.reduce((latest,r)=>{
          const value=r.calculada_at||r.updated_at||null;
          return value&&(!latest||new Date(value)>new Date(latest))?value:latest;
        },null)
      };

      const selectedSummary={...calculatedSummary,...(summaryRes.data||{})};
      selectedSummary.total_renovaciones=Number(selectedSummary.total_renovaciones??calculatedSummary.total_renovaciones);
      selectedSummary.con_revision=Number(selectedSummary.con_revision??calculatedSummary.con_revision);
      selectedSummary.importe_previsto=Number(selectedSummary.importe_previsto??calculatedSummary.importe_previsto);

      const summaryById=new Map(((summariesRes.error?[]:summariesRes.data)||[]).map(x=>[x.temporada_id,x]));
      const campaigns=seasons.map(season=>{
        const summary=summaryById.get(season.id)||{};
        return {
          ...season,
          ...summary,
          id:season.id,
          nombre:season.nombre,
          temporada:season.nombre,
          total_renovaciones:Number(summary.total_renovaciones||0),
          importe_previsto:Number(summary.importe_previsto||0)
        };
      });

      // La campaña seleccionada debe usar exactamente los mismos datos reales que los indicadores superiores.
      const selectedCampaign=campaigns.find(c=>c.id===selectedSeason.id);
      if(selectedCampaign){
        selectedCampaign.total_renovaciones=selectedSummary.total_renovaciones;
        selectedCampaign.importe_previsto=selectedSummary.importe_previsto;
        selectedCampaign.estado_campana=selectedSummary.estado_campana;
        selectedCampaign.visible_socios=selectedSummary.visible_socios;
      }

      state={
        campaigns,
        summary:selectedSummary,
        renewals,
        sectors:sectorsRes.data||[],
        tariffs:(tariffsRes.data||[]).map(t=>({
          id:t.id,sector_id:t.sector_id,sector:t.sectores_malaga?.nombre||"Sin sector",
          precio:Number(t.precio||0),activo:t.activo
        })),
        categories:(categoriesRes.data||[]).map(c=>({
          ...c,id:c.id,categoria:c.categoria||c.nombre||"Sin categoría",activa:c.activa??true
        })),
        discounts:(discountsRes.data||[]).map(d=>({
          id:d.id,socio_id:d.socio_id,numero_socio:d.socios?.numero_socio,
          nombre:`${d.socios?.nombre||""} ${d.socios?.apellidos||""}`.trim(),
          concepto:d.concepto,importe:Number(d.importe||0),referencia_club:d.referencia_club
        })),
        paymentMethods:(paymentMethodsRes.data||[]).map(m=>({...m,activo:m.activo===true,predeterminado:m.predeterminado===true}))
      };
    }catch(error){
      console.error("Error al cargar renovaciones:",error);
      state=emptyState();
      toast(`Error al cargar Supabase: ${error.message}`);
    }

    render();
  }


  function applyDemoPayments(){ return; }

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
    $("campaignPreparedDate").textContent=dateTime(s.fecha_preparacion);
    $("campaignOpenDate").textContent=dateTime(s.fecha_apertura);
    $("campaignCloseDate").textContent=dateTime(s.fecha_cierre);
    $("prepareCampaignBtn").disabled=!seasonId||status==="archivada";
    const openButton=$("openCampaignBtn");
    openButton.disabled=!["preparada","cerrada"].includes(status);
    openButton.textContent=status==="cerrada"?"Reabrir campaña":"Abrir campaña";
    $("closeCampaignBtn").disabled=status!=="abierta";
    $("resetCampaignBtn").disabled=!seasonId||status==="archivada"||state.renewals.length===0;
    $("connectionBadge").textContent=connected?"Conectado a Supabase":"Sin conexión a Supabase";
    $("connectionBadge").className=`badge ${connected?"badge-success":"badge-warning"}`;
    renderSeasonSelector();renderCampaigns();renderRenewals();renderSectors();renderTariffs();renderCategories();renderDiscounts();renderPaymentMethodsConfig();renderPayments();renderReadiness();
  }


  function renderSeasonSelector(){
    const campaigns=state.campaigns||[];
    const select=$("seasonSelect");
    if(!campaigns.length){
      select.innerHTML='<option value="">Sin temporadas</option>';
      select.disabled=true;
    }else{
      select.disabled=false;
      select.innerHTML=campaigns.map(c=>`<option value="${esc(c.nombre)}" ${c.nombre===CONFIG.seasonName?"selected":""}>${esc(c.nombre)}</option>`).join("");
      select.value=CONFIG.seasonName;
    }
    $("pageSeasonLabel").textContent=CONFIG.seasonName||"Sin temporada";
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

  function fillRenewalFilters(){
    const sectorSelect=$("sectorFilter"), categorySelect=$("categoryFilter");
    if(!sectorSelect||!categorySelect)return;
    const currentSector=sectorSelect.value, currentCategory=categorySelect.value;
    const sectors=[...new Set(state.renewals.map(r=>r.sector||"Sin asignar"))].sort((a,b)=>a.localeCompare(b,"es"));
    const categories=[...new Set(state.renewals.map(r=>r.categoria_cuota||"Revisar"))].sort((a,b)=>a.localeCompare(b,"es"));
    sectorSelect.innerHTML='<option value="">Todos los sectores</option>'+sectors.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
    categorySelect.innerHTML='<option value="">Todas las categorías</option>'+categories.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if(sectors.includes(currentSector))sectorSelect.value=currentSector;
    if(categories.includes(currentCategory))categorySelect.value=currentCategory;
  }

  function filteredRenewalRows(){
    const q=$("searchInput")?.value.trim().toLowerCase()||"";
    const st=$("statusFilter")?.value||"";
    const sector=$("sectorFilter")?.value||"";
    const category=$("categoryFilter")?.value||"";
    return state.renewals.filter(r=>{
      const person=`${r.numero_socio||""} ${r.nombre||""} ${r.apellidos||""}`.toLowerCase();
      const rowSector=r.sector||"Sin asignar";
      const rowCategory=r.categoria_cuota||"Revisar";
      return (!q||person.includes(q))&&(!st||r.estado===st)&&(!sector||rowSector===sector)&&(!category||rowCategory===category);
    });
  }

  function renderRenewals(){
    fillRenewalFilters();
    const rows=filteredRenewalRows();
    const total=rows.reduce((sum,r)=>sum+Number(r.importe_calculado||0),0);
    const collected=rows.reduce((sum,r)=>sum+Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0),0);
    setText("filteredRenewalsCount",rows.length);
    setText("filteredRenewalsAmount",money(total));
    setText("filteredRenewalsPending",money(Math.max(0,total-collected)));
    $("renewalsTableBody").innerHTML=rows.map(r=>`<tr><td><strong>${esc(r.numero_socio||"—")} · ${esc(r.nombre)} ${esc(r.apellidos)}</strong></td><td>${esc(r.sector||"Sin asignar")}</td><td>${esc(r.categoria_cuota||"Revisar")}</td><td>${money(r.precio_abono)}</td><td>${money(r.cuota_pena)}</td><td>− ${money(r.descuento_club)}</td><td><strong>${money(r.importe_calculado)}</strong></td><td><span class="state-pill ${esc(r.estado)}">${esc((r.estado||"").replaceAll("_"," "))}</span></td><td><div class="row-actions"><button class="btn btn-secondary btn-small" data-payment-id="${esc(r.id)}">Pago</button></div></td></tr>`).join("");
    $("emptyState").classList.toggle("hidden",rows.length>0);
  }

  function clearRenewalFilters(){
    $("searchInput").value="";$("statusFilter").value="";$("sectorFilter").value="";$("categoryFilter").value="";renderRenewals();
  }

  function exportRenewals(){
    const rows=filteredRenewalRows().map(r=>({
      "Nº socio":r.numero_socio||"",
      "Nombre":`${r.nombre||""} ${r.apellidos||""}`.trim(),
      "Sector":r.sector||"Sin asignar",
      "Categoría":r.categoria_cuota||"Revisar",
      "Precio abono":Number(r.precio_abono||0),
      "Cuota peña":Number(r.cuota_pena||0),
      "Descuento":Number(r.descuento_club||0),
      "Total":Number(r.importe_calculado||0),
      "Pagado":Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0),
      "Pendiente":Math.max(0,Number(r.importe_calculado||0)-Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0)),
      "Estado":(r.estado||"").replaceAll("_"," ")
    }));
    if(!rows.length)return toast("No hay renovaciones para exportar con los filtros actuales.");
    window.FrenteExcel.writeFile(`renovaciones-${CONFIG.seasonName.replace("/","-")}.xlsx`,{"Renovaciones":rows});
    toast(`Excel generado con ${rows.length} renovaciones.`);
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


  function renderPaymentMethodsConfig(){
    const target=$("paymentMethodsConfig");if(!target)return;
    const methods=state.paymentMethods.length?state.paymentMethods:DEFAULT_PAYMENT_METHODS;
    target.innerHTML=methods.map(m=>`<label class="payment-method-option"><span><input type="checkbox" data-method-active="${esc(m.codigo)}" ${m.activo?"checked":""}> ${esc(m.nombre)}</span><span><input type="radio" name="defaultPaymentMethod" data-method-default="${esc(m.codigo)}" ${m.predeterminado?"checked":""} ${m.activo?"":"disabled"}> Predeterminado</span></label>`).join("");
  }
  function renderPaymentMethodSelect(selected){const select=$("paymentMethod"),methods=activePaymentMethods();select.innerHTML=methods.map(m=>`<option value="${esc(m.codigo)}">${esc(m.nombre)}</option>`).join("");const preferred=methods.some(m=>m.codigo===selected)?selected:defaultPaymentMethod()?.codigo;if(preferred)select.value=preferred}
  async function savePaymentMethods(){
    const methods=state.paymentMethods.length?state.paymentMethods:DEFAULT_PAYMENT_METHODS;
    const rows=methods.map(m=>({codigo:m.codigo,nombre:m.nombre,activo:document.querySelector(`[data-method-active="${CSS.escape(m.codigo)}"]`)?.checked===true,predeterminado:document.querySelector(`[data-method-default="${CSS.escape(m.codigo)}"]`)?.checked===true,orden:Number(m.orden||0)}));
    const active=rows.filter(m=>m.activo);if(!active.length)return toast("Debe quedar al menos un método de pago activo.");
    if(!rows.some(m=>m.predeterminado&&m.activo)){rows.forEach(m=>m.predeterminado=false);active[0].predeterminado=true}
    try{const {error}=await client.from("metodos_pago_renovacion").upsert(rows,{onConflict:"codigo"});if(error)throw error;toast("Métodos de pago actualizados.");await loadData()}catch(err){toast(err.message||"No se pudo guardar la configuración.")}
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
    $("paymentDate").value=(r.fecha_pago||new Date().toISOString()).slice(0,10);
    $("paymentReceived").value=Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0).toFixed(2);
    renderPaymentMethodSelect(r.metodo_pago);
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
      fecha_pago:$("paymentDate").value||new Date().toISOString().slice(0,10)
    };
    if(payload.importe_recibido<0)return toast("El importe no puede ser negativo.");
    if(!activePaymentMethods().some(m=>m.codigo===payload.metodo_pago))return toast("Selecciona un método de pago habilitado.");
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
      const result=await client.from("renovaciones").update({estado:payload.estado,importe_pagado:payload.importe_recibido,pagado:["pagada","abono_confirmado"].includes(payload.estado),metodo_pago:payload.metodo_pago,referencia_pago:payload.referencia_pago,notas_pago:payload.notas,fecha_pago:payload.fecha_pago}).eq("id",id);
      if(result.error)throw result.error;
      $("paymentDialog").close();
      toast("Pago actualizado.");
      await loadData();
    }catch(err){toast(err.message)}
  }

  function exportPaymentsCsv(){
    const rows=paymentRows().map(r=>({
      "Nº socio":r.numero_socio,
      "Nombre":`${r.nombre||""} ${r.apellidos||""}`.trim(),
      "Sector":r.sector,
      "Categoría":r.categoria_cuota,
      "Total":Number(r.importe_calculado||0),
      "Recibido":Number(r.importe_pagado??(r.pagado?r.importe_calculado:0)??0),
      "Método":paymentMethodLabel(r.metodo_pago),
      "Referencia":r.referencia_pago,
      "Fecha de pago":r.fecha_pago||"",
      "Estado":(r.estado||"").replaceAll("_"," ")
    }));
    window.FrenteExcel.writeFile(`cobros-renovaciones-${CONFIG.seasonName.replace("/","-")}.xlsx`,{"Cobros":rows});
    toast("Excel de cobros generado.");
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

  function openRenewalFromCheck(memberNumber){
    document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));
    const tab=document.querySelector('.tab[data-tab="renovaciones"]');
    if(tab)tab.classList.add("active");
    const panel=$("tab-renovaciones");
    if(panel)panel.classList.add("active");
    $("searchInput").value=String(memberNumber||"");
    renderRenewals();
    $("searchInput").focus();
  }

  function renderReadiness(){
    const checks=readiness();
    $("readinessList").innerHTML=checks.map(x=>`<article class="check-item ${x.ok?"ok":""}"><div class="check-icon">${x.ok?"✓":"!"}</div><div><strong>${esc(x.title)}</strong><span>${esc(x.detail)}</span></div><div class="check-state">${x.ok?"Correcto":"Pendiente"}</div></article>`).join("");

    const renewals=state.renewals||[];
    const needsReview=renewals.filter(r=>r.requiere_revision===true||r.estado==="incidencia");
    const noSector=renewals.filter(r=>!r.sector);
    const zeroAmount=renewals.filter(r=>Number(r.importe_calculado||0)===0);
    const noCategory=renewals.filter(r=>!r.categoria_cuota);

    setText("checkTotalRenewals",renewals.length);
    setText("checkReviewCount",needsReview.length);
    setText("checkNoSectorCount",noSector.length);
    setText("checkZeroAmountCount",zeroAmount.length);

    const incidentMap=new Map();
    const addIncident=(r,reason)=>{
      const key=`${r.numero_socio||r.socio_id||"sin-id"}-${reason}`;
      incidentMap.set(key,{renewal:r,reason});
    };
    needsReview.forEach(r=>addIncident(r,r.motivo_revision||"La renovación necesita revisión"));
    noSector.forEach(r=>addIncident(r,"Socio sin sector asignado"));
    zeroAmount.forEach(r=>addIncident(r,"Importe calculado igual a 0 €"));
    noCategory.forEach(r=>addIncident(r,"Sin categoría de cuota asignada"));

    const incidents=[...incidentMap.values()];
    setText("checkIncidentHint",incidents.length?`${incidents.length} incidencias requieren atención.`:"No hay incidencias pendientes.");
    $("checkIncidentsList").innerHTML=incidents.length?incidents.map(({renewal:r,reason})=>`
      <article class="check-incident-card">
        <div>
          <strong>Socio ${esc(r.numero_socio||"—")} · ${esc(`${r.nombre||""} ${r.apellidos||""}`.trim()||"Sin nombre")}</strong>
          <span>${esc(reason)}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-small" data-check-member="${esc(r.numero_socio||"")}">Ver renovación</button>
      </article>`).join(""):'<div class="empty-state">Todos los registros están preparados correctamente.</div>';

    document.querySelectorAll("[data-check-member]").forEach(btn=>btn.addEventListener("click",()=>openRenewalFromCheck(btn.dataset.checkMember)));
    const all=checks.every(x=>x.ok)&&incidents.length===0;
    const campaignStatus=state.summary?.estado_campana||"borrador";
    if(campaignStatus==="abierta")$("campaignHint").textContent="La campaña está abierta y visible para los socios.";
    else if(campaignStatus==="cerrada")$("campaignHint").textContent="La campaña está cerrada. Un administrador puede reabrirla si se cerró antes de tiempo.";
    else if(campaignStatus==="archivada")$("campaignHint").textContent="La campaña está archivada.";
    else $("campaignHint").textContent=all?"Todos los controles están correctos. La campaña puede abrirse.":"Revisa la pestaña Comprobación antes de abrir la campaña.";
  }

  async function getSeasonId(){
    if(seasonId)return seasonId;
    if(!CONFIG.seasonName)throw new Error("Selecciona una temporada.");
    const r=await client.from("temporadas").select("id").eq("nombre",CONFIG.seasonName).single();
    if(r.error)throw r.error;
    seasonId=r.data.id;
    return seasonId;
  }

  function campaignResultMessage(data){
    let value=Array.isArray(data)?data[0]:data;
    if(value&&typeof value==="object"){
      const procesadas=value.procesadas??value.total_procesadas??value.f1;
      const errores=value.errores??value.total_errores??value.f2;
      const revision=value.revision??value.con_revision??value.f3;
      const importe=value.importe??value.importe_previsto??value.f4;
      if(procesadas!==undefined)return `Campaña preparada: ${procesadas} procesadas, ${errores??0} errores, ${revision??0} en revisión, ${money(importe??0)}.`;
    }
    const text=String(value??"").replace(/^\(|\)$/g,"");
    const parts=text.split(",");
    if(parts.length===4)return `Campaña preparada: ${parts[0]} procesadas, ${parts[1]} errores, ${parts[2]} en revisión, ${money(parts[3])}.`;
    return "Campaña preparada correctamente.";
  }

  function showCampaignResult(message, success=true, successTitle="Campaña preparada", errorTitle="No se pudo completar la operación"){
    const dialog=$("campaignResultDialog");
    const title=$("campaignResultTitle");
    const body=$("campaignResultBody");
    if(!dialog||!title||!body){
      alert(message);
      return;
    }
    title.textContent=success?successTitle:errorTitle;
    body.textContent=message;
    dialog.showModal();
  }

  async function prepareCampaign(){
    const alreadyPrepared=state.renewals.length>0;
    if(alreadyPrepared&&!window.confirm(`La campaña ${CONFIG.seasonName} ya contiene ${state.renewals.length} renovaciones. Se recalcularán los datos existentes sin borrar pagos registrados. ¿Continuar?`))return;
    if(!connected){state.summary.estado_campana="preparada";render();showCampaignResult("Simulación: campaña preparada correctamente.");return}
    const button=$("prepareCampaignBtn");
    const original=button.textContent;
    button.disabled=true;
    button.textContent="Preparando…";
    try{
      const id=await getSeasonId();
      const r=await client.rpc("preparar_campana_completa",{p_temporada_id:id});
      if(r.error)throw r.error;
      const message=campaignResultMessage(r.data);
      const update=await client.from("temporadas").update({
        estado_campana:"preparada",
        renovacion_abierta:false,
        visible_socios:false,
        fecha_cierre:null
      }).eq("id",id);
      if(update.error)throw update.error;
      await loadData();
      showCampaignResult(message,true);
    }catch(e){
      console.error("Error al preparar campaña:",e);
      showCampaignResult(`No se pudo preparar la campaña: ${e.message||e}`,false);
    }finally{
      button.textContent=original;
      const status=state.summary?.estado_campana||"borrador";
      button.disabled=!seasonId||status==="archivada";
    }
  }

  async function resetCampaign(){
    if(!seasonId||state.renewals.length===0)return showCampaignResult("No hay renovaciones que reiniciar en esta campaña.",false);
    const hasPayments=state.renewals.some(r=>
      r.pagado===true||Number(r.importe_pagado||0)>0||["pagada","pago_parcial","abono_confirmado"].includes(r.estado)
    );
    if(hasPayments)return showCampaignResult("No se puede reiniciar la campaña porque existen pagos registrados. Revisa o anula esos cobros antes de continuar.",false,"","Reinicio bloqueado");
    if(!window.confirm(`Vas a eliminar todas las renovaciones de ${CONFIG.seasonName} y dejar la campaña como nueva. Esta acción no se puede deshacer. ¿Continuar?`))return;
    const confirmation=window.prompt('Escribe REINICIAR para confirmar:');
    if(confirmation!=="REINICIAR")return showCampaignResult("Reinicio cancelado: el texto de confirmación no coincide.",false,"","Reinicio cancelado");

    const button=$("resetCampaignBtn");
    const original=button.textContent;
    button.disabled=true;
    button.textContent="Reiniciando…";
    try{
      if(!connected){
        state.renewals=[];
        state.summary={...state.summary,total_renovaciones:0,importe_previsto:0,con_revision:0,estado_campana:"borrador",renovacion_abierta:false,visible_socios:false,fecha_apertura:null,fecha_cierre:null,fecha_preparacion:null};
        render();
        return showCampaignResult("Simulación: campaña reiniciada correctamente.",true,"Campaña reiniciada");
      }
      const id=await getSeasonId();
      const deleted=await client.from("renovaciones").delete().eq("temporada_id",id);
      if(deleted.error)throw deleted.error;
      const updated=await client.from("temporadas").update({
        estado_campana:"borrador",
        renovacion_abierta:false,
        visible_socios:false,
        fecha_apertura:null,
        fecha_cierre:null
      }).eq("id",id);
      if(updated.error)throw updated.error;
      await loadData();
      showCampaignResult(`La campaña ${CONFIG.seasonName} se ha reiniciado. Ya puedes prepararla de nuevo desde cero.`,true,"Campaña reiniciada");
    }catch(error){
      console.error("Error al reiniciar campaña:",error);
      showCampaignResult(`No se pudo reiniciar la campaña: ${error.message||error}`,false,"","No se pudo reiniciar");
    }finally{
      button.textContent=original;
      render();
    }
  }

  async function changeCampaign(action){
    const opening=action==="abrir";
    const current=state.summary?.estado_campana||"borrador";
    const reopening=opening&&current==="cerrada";
    if(opening&&!["preparada","cerrada"].includes(current))return showCampaignResult("La campaña solo puede abrirse cuando está preparada o reabrirse cuando está cerrada.",false);
    if(!opening&&current!=="abierta")return showCampaignResult("Solo puede cerrarse una campaña abierta.",false);

    const question=reopening
      ?`¿Reabrir la campaña ${CONFIG.seasonName}? Volverá a estar disponible para los socios y se eliminará la fecha de cierre.`
      :opening
        ?`¿Abrir la campaña ${CONFIG.seasonName}? Los socios podrán verla y gestionar su renovación.`
        :`¿Cerrar la campaña ${CONFIG.seasonName}? Dejará de estar disponible para los socios. Podrás reabrirla más adelante si se ha cerrado por error.`;
    if(!window.confirm(question))return;

    if(!connected){
      state.summary.estado_campana=opening?"abierta":"cerrada";
      state.summary.renovacion_abierta=opening;
      state.summary.visible_socios=opening;
      if(opening)state.summary.fecha_apertura=new Date().toISOString();
      else state.summary.fecha_cierre=new Date().toISOString();
      render();
      showCampaignResult(`Simulación: campaña ${reopening?"reabierta":opening?"abierta":"cerrada"} correctamente.`,true);
      return;
    }

    const button=$(opening?"openCampaignBtn":"closeCampaignBtn");
    const original=button.textContent;
    button.disabled=true;
    button.textContent=reopening?"Reabriendo…":opening?"Abriendo…":"Cerrando…";
    try{
      const id=await getSeasonId();
      const now=new Date().toISOString();
      const payload=opening?{
        estado_campana:"abierta",
        renovacion_abierta:true,
        visible_socios:true,
        fecha_apertura:now,
        fecha_cierre:null
      }:{
        estado_campana:"cerrada",
        renovacion_abierta:false,
        visible_socios:false,
        fecha_cierre:now
      };
      const result=await client.from("temporadas").update(payload).eq("id",id);
      if(result.error)throw result.error;
      await loadData();
      showCampaignResult(
        `La campaña ${CONFIG.seasonName} se ha ${reopening?"reabierto":opening?"abierto":"cerrado"} correctamente.`,
        true,
        reopening?"Campaña reabierta":opening?"Campaña abierta":"Campaña cerrada"
      );
    }catch(error){
      console.error(`Error al ${reopening?"reabrir":opening?"abrir":"cerrar"} la campaña:`,error);
      showCampaignResult(
        `No se pudo ${reopening?"reabrir":opening?"abrir":"cerrar"} la campaña: ${error.message||error}`,
        false,
        "",
        reopening?"No se pudo reabrir la campaña":opening?"No se pudo abrir la campaña":"No se pudo cerrar la campaña"
      );
    }finally{
      button.textContent=original;
      render();
    }
  }

  function openSectorDialog(s=null){
    const form=$("sectorForm");
    form.reset();
    $("sectorDialogTitle").textContent=s?"Editar sector":"Nuevo sector";
    $("sectorId").value=s?.id||"";
    $("sectorName").value=s?.nombre||"";
    $("sectorCode").value=s?.codigo||"";
    $("sectorStand").value=s?.grada||"";
    $("sectorActive").checked=s?.activo??true;
    $("sectorDialog").showModal();
    setTimeout(()=>$("sectorName").focus(),0);
  }
  async function saveSector(e){
    e.preventDefault();
    const form=e.currentTarget;
    if(!form.reportValidity())return;
    const button=$("saveSectorBtn");
    const original=button.textContent;
    const p={
      nombre:$("sectorName").value.trim(),
      codigo:$("sectorCode").value.trim()||null,
      grada:$("sectorStand").value.trim()||null,
      activo:$("sectorActive").checked
    };
    const id=$("sectorId").value;
    button.disabled=true;
    button.textContent="Guardando…";
    try{
      if(!connected){
        if(id)Object.assign(state.sectors.find(x=>x.id===id),p);
        else state.sectors.push({id:`demo-${Date.now()}`,orden:state.sectors.length+1,...p});
        $("sectorDialog").close();
        render();
        toast("Sector guardado en demostración.");
        return;
      }
      const query=id
        ?client.from("sectores_malaga").update(p).eq("id",id)
        :client.from("sectores_malaga").insert({...p,orden:state.sectors.length+1});
      const r=await query;
      if(r.error)throw r.error;
      $("sectorDialog").close();
      toast(id?"Sector actualizado.":"Sector creado.");
      await loadData();
    }catch(error){
      console.error("Error al guardar sector:",error);
      showCampaignResult(`No se pudo guardar el sector: ${error.message||error}`,false,"","No se pudo guardar el sector");
    }finally{
      button.disabled=false;
      button.textContent=original;
    }
  }

  function fillSectorSelect(selected=""){$("tariffSector").innerHTML='<option value="">Selecciona sector</option>'+state.sectors.filter(s=>s.activo).map(s=>`<option value="${esc(s.id)}" ${s.id===selected?"selected":""}>${esc(s.nombre)}</option>`).join("")}
  function openTariffDialog(t=null){$("tariffDialogTitle").textContent=t?"Editar tarifa":"Nueva tarifa";$("tariffId").value=t?.id||"";fillSectorSelect(t?.sector_id||"");$("tariffPrice").value=t?.precio??"";$("tariffActive").checked=t?.activo??true;$("tariffDialog").showModal()}
  async function saveTariff(e){e.preventDefault();const id=$("tariffId").value,sector_id=$("tariffSector").value,p={sector_id,precio:Number($("tariffPrice").value),activo:$("tariffActive").checked};if(!sector_id)return toast("Selecciona un sector.");if(!connected){const sector=state.sectors.find(s=>s.id===sector_id)?.nombre||"Sector";if(id)Object.assign(state.tariffs.find(x=>x.id===id),{...p,sector});else state.tariffs.push({id:`tar-${Date.now()}`,...p,sector});$("tariffDialog").close();render();toast("Tarifa guardada en demostración.");return}try{const tid=await getSeasonId();const r=id?await client.from("tarifas_sector_temporada").update(p).eq("id",id):await client.from("tarifas_sector_temporada").upsert({...p,temporada_id:tid},{onConflict:"temporada_id,sector_id"});if(r.error)throw r.error;$("tariffDialog").close();toast("Tarifa guardada.");await loadData()}catch(err){toast(err.message)}}

  function openCategoryDialog(c){$("categoryId").value=c.id;$("categoryName").value=c.categoria;$("categoryAmount").value=c.importe;$("categoryFrom").value=c.nacimiento_desde||"";$("categoryTo").value=c.nacimiento_hasta||"";$("categoryAutomatic").checked=!!c.asignacion_automatica;$("categoryActive").checked=c.activa!==false;$("categoryDialog").showModal()}
  async function saveCategory(e){e.preventDefault();const id=$("categoryId").value,p={importe:Number($("categoryAmount").value),nacimiento_desde:$("categoryFrom").value||null,nacimiento_hasta:$("categoryTo").value||null,asignacion_automatica:$("categoryAutomatic").checked,activa:$("categoryActive").checked};if(p.nacimiento_desde&&p.nacimiento_hasta&&p.nacimiento_desde>p.nacimiento_hasta)return toast("La fecha desde no puede ser posterior a la fecha hasta.");if(!connected){Object.assign(state.categories.find(x=>x.id===id),p);$("categoryDialog").close();render();toast("Categoría guardada en demostración.");return}const r=await client.from("categorias_cuota").update(p).eq("id",id);if(r.error)return toast(r.error.message);$("categoryDialog").close();toast("Cuota y fechas guardadas.");await loadData()}

  async function saveDiscount(e){e.preventDefault();const numero=Number($("discountMemberNumber").value),p={concepto:$("discountConcept").value.trim(),importe:Number($("discountAmount").value),referencia_club:$("discountReference").value.trim()||null};if(!connected){state.discounts.push({id:`disc-${Date.now()}`,numero_socio:String(numero).padStart(3,"0"),nombre:"Socio de prueba",...p});$("discountDialog").close();render();toast("Descuento guardado en demostración.");return}try{const [season,member]=await Promise.all([getSeasonId(),client.from("socios").select("id").eq("numero_socio",numero).single()]);if(member.error)throw new Error("No se encontró ese número de socio.");const r=await client.from("descuentos_club").upsert({temporada_id:season,socio_id:member.data.id,...p},{onConflict:"temporada_id,socio_id,concepto"});if(r.error)throw r.error;$("discountDialog").close();toast("Descuento guardado.");await loadData()}catch(err){toast(err.message)}}

  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(`tab-${b.dataset.tab}`).classList.add("active")}));
  $("searchInput").addEventListener("input",renderRenewals);$("statusFilter").addEventListener("change",renderRenewals);$("sectorFilter").addEventListener("change",renderRenewals);$("categoryFilter").addEventListener("change",renderRenewals);$("clearRenewalFiltersBtn").addEventListener("click",clearRenewalFilters);$("exportRenewalsBtn").addEventListener("click",exportRenewals);$("reloadBtn").addEventListener("click",loadData);$("prepareCampaignBtn").addEventListener("click",prepareCampaign);$("openCampaignBtn").addEventListener("click",()=>changeCampaign("abrir"));$("closeCampaignBtn").addEventListener("click",()=>changeCampaign("cerrar"));$("resetCampaignBtn").addEventListener("click",resetCampaign);
  $("refreshChecksBtn").addEventListener("click",async()=>{await loadData();toast("Comprobación actualizada.")});
  $("newSectorBtn").addEventListener("click",()=>openSectorDialog());
  $("sectorForm").addEventListener("submit",saveSector);
  $("cancelSectorBtn").addEventListener("click",()=>$("sectorDialog").close());
  $("sectorsList").addEventListener("click",e=>{const id=e.target.dataset.editSector;if(id)openSectorDialog(state.sectors.find(s=>s.id===id))});
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
  $("savePaymentMethodsBtn")?.addEventListener("click",savePaymentMethods);
  $("paymentMethodsConfig")?.addEventListener("change",e=>{const code=e.target.dataset.methodActive;if(code){const radio=document.querySelector(`[data-method-default="${CSS.escape(code)}"]`);if(radio)radio.disabled=!e.target.checked}});
  $("exportPaymentsBtn").addEventListener("click",exportPaymentsCsv);
  $("downloadBankTemplateBtn")?.addEventListener("click",downloadBankTemplate);
  $("bankCsvInput")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{await importBankCsv(file)}catch(err){clearBankImport();toast(err.message)}});
  $("applyBankMatchesBtn")?.addEventListener("click",applyBankMatches);
  $("clearBankImportBtn")?.addEventListener("click",clearBankImport);
  $("paymentsList").addEventListener("click",e=>{const id=e.target.dataset.paymentId;if(id)openPaymentDialog(id)});
  $("renewalsTableBody").addEventListener("click",e=>{const id=e.target.dataset.paymentId;if(id)openPaymentDialog(id)});
  initClient().then(loadData);
})();
