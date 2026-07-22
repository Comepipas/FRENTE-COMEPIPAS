
const ADV_KEYS = {
  members:"frente_members_db_v2",
  fees:"frente_fees_db_v1",
  products:"frente_admin_products_v1",
  orders:"frente_orders_db_v1",
  trips:"frente_admin_trips_v1",
  bookings:"frente_trip_bookings_v1",
  news:"frente_admin_news_v1",
  media:"frente_media_library_v1",
  audit:"frente_audit_log_v1"
};

function advRead(key,fallback=[]){
  try{return JSON.parse(localStorage.getItem(key))||fallback||[]}
  catch{return fallback||[]}
}

function advMoney(v){
  return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
}

function monthLabel(dateString){
  const d=new Date(dateString+"T12:00:00");
  return new Intl.DateTimeFormat("es-ES",{month:"short"}).format(d);
}

function monthlySeries(){
  const fees=advRead(ADV_KEYS.fees,window.FRENTE_FEES);
  const orders=advRead(ADV_KEYS.orders,window.FRENTE_ORDERS);
  const months=[];

  for(let i=5;i>=0;i--){
    const d=new Date();
    d.setMonth(d.getMonth()-i);
    months.push({
      key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label:new Intl.DateTimeFormat("es-ES",{month:"short"}).format(d),
      fees:0,
      orders:0
    });
  }

  fees.filter(f=>f.estado==="Pagada"&&f.fechaPago).forEach(f=>{
    const m=months.find(x=>f.fechaPago.startsWith(x.key));
    if(m)m.fees+=Number(f.importe||0);
  });

  orders.filter(o=>["Pagado","Preparando","Enviado","Completado"].includes(o.estado)&&o.fecha).forEach(o=>{
    const m=months.find(x=>o.fecha.startsWith(x.key));
    if(m)m.orders+=Number(o.total||0);
  });

  return months;
}

function renderBars(containerId,items,valueKey,labelKey,formatter=v=>v){
  const el=document.getElementById(containerId);
  if(!el)return;
  const max=Math.max(...items.map(x=>Number(x[valueKey]||0)),1);

  el.innerHTML=items.map(item=>`
    <div class="dash-bar-row">
      <span>${item[labelKey]}</span>
      <div class="dash-bar-track">
        <i style="width:${Math.max(4,(Number(item[valueKey]||0)/max)*100)}%"></i>
      </div>
      <strong>${formatter(item[valueKey])}</strong>
    </div>
  `).join("");
}

function renderIncomeChart(){
  const series=monthlySeries();
  const el=document.getElementById("incomeChart");
  if(!el)return;
  const max=Math.max(...series.map(x=>x.fees+x.orders),1);

  el.innerHTML=series.map(m=>`
    <div class="income-column">
      <div class="income-stack" title="${m.label}: ${advMoney(m.fees+m.orders)}">
        <span class="income-orders" style="height:${(m.orders/max)*180}px"></span>
        <span class="income-fees" style="height:${(m.fees/max)*180}px"></span>
      </div>
      <small>${m.label}</small>
    </div>
  `).join("");
}

function renderAdvancedDashboard(){
  const members=advRead(ADV_KEYS.members,window.FRENTE_MEMBERS_DB);
  const fees=advRead(ADV_KEYS.fees,window.FRENTE_FEES);
  const products=advRead(ADV_KEYS.products,window.FRENTE_PRODUCTS);
  const orders=advRead(ADV_KEYS.orders,window.FRENTE_ORDERS);
  const trips=advRead(ADV_KEYS.trips,window.FRENTE_TRIPS);
  const bookings=advRead(ADV_KEYS.bookings,window.FRENTE_TRIP_BOOKINGS);
  const news=advRead(ADV_KEYS.news,window.FRENTE_NEWS);
  const media=advRead(ADV_KEYS.media,window.FRENTE_MEDIA_LIBRARY);
  const audit=advRead(ADV_KEYS.audit,[]);

  const activeMembers=members.filter(m=>m.estado==="Activo").length;
  const pendingFees=fees.filter(f=>f.estado==="Pendiente").length;
  const feeIncome=fees.filter(f=>f.estado==="Pagada").reduce((s,f)=>s+Number(f.importe||0),0);
  const orderIncome=orders.filter(o=>["Pagado","Preparando","Enviado","Completado"].includes(o.estado)).reduce((s,o)=>s+Number(o.total||0),0);
  const openOrders=orders.filter(o=>!["Completado","Cancelado"].includes(o.estado)).length;
  const lowStock=products.filter(p=>Number(p.stock||0)<=5).length;
  const occupied=bookings.filter(b=>!["Cancelada","Lista de espera"].includes(b.estado)).reduce((s,b)=>s+Number(b.plazas||0),0);
  const totalSeats=trips.reduce((s,t)=>s+Number(t.plazas||0),0);

  const map={
    advMembers:activeMembers,
    advPendingFees:pendingFees,
    advOpenOrders:openOrders,
    advIncome:advMoney(feeIncome+orderIncome),
    advTrips:trips.length,
    advOccupancy:`${occupied}/${totalSeats}`,
    advNews:news.length,
    advMedia:media.length
  };
  Object.entries(map).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v});

  renderIncomeChart();

  const memberTypes=[
    {label:"Socios",value:members.filter(m=>m.tipo==="Socio").length},
    {label:"Junta",value:members.filter(m=>m.tipo==="Junta directiva").length},
    {label:"Honor",value:members.filter(m=>m.tipo==="Socio de honor").length}
  ];
  renderBars("memberChart",memberTypes,"value","label");

  const orderStates=["Pendiente","Pagado","Preparando","Enviado","Completado","Cancelado"].map(label=>({
    label,
    value:orders.filter(o=>o.estado===label).length
  }));
  renderBars("ordersChart",orderStates,"value","label");

  const tripRows=trips.map(t=>{
    const occ=bookings.filter(b=>b.viajeId===t.id&&!["Cancelada","Lista de espera"].includes(b.estado)).reduce((s,b)=>s+Number(b.plazas||0),0);
    return {label:t.destino,value:occ,total:Number(t.plazas||0)};
  });
  const tripEl=document.getElementById("tripsChart");
  if(tripEl){
    tripEl.innerHTML=tripRows.length?tripRows.map(t=>`
      <div class="dash-bar-row">
        <span>${t.label}</span>
        <div class="dash-bar-track"><i style="width:${t.total?Math.min(100,(t.value/t.total)*100):0}%"></i></div>
        <strong>${t.value}/${t.total}</strong>
      </div>
    `).join(""):'<p class="admin-empty">No hay viajes.</p>';
  }

  const stockRows=products
    .slice()
    .sort((a,b)=>Number(a.stock||0)-Number(b.stock||0))
    .slice(0,6)
    .map(p=>({label:p.nombre,value:Number(p.stock||0)}));
  renderBars("stockChart",stockRows,"value","label");

  const activity=document.getElementById("advancedActivity");
  if(activity){
    activity.innerHTML=audit.length?audit.slice(0,8).map(a=>`
      <div class="advanced-activity-row">
        <span>${a.module}</span>
        <div><strong>${a.action}</strong><small>${a.userName} · ${new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short"}).format(new Date(a.createdAt))}</small></div>
      </div>
    `).join(""):'<p class="admin-empty">No hay actividad registrada.</p>';
  }

  const alerts=[];
  if(pendingFees>0)alerts.push(`${pendingFees} cuota(s) pendiente(s)`);
  if(openOrders>0)alerts.push(`${openOrders} pedido(s) abierto(s)`);
  if(lowStock>0)alerts.push(`${lowStock} producto(s) con stock bajo`);
  if(totalSeats>0&&occupied/totalSeats>.85)alerts.push("Alta ocupación en viajes");

  const alertEl=document.getElementById("dashboardAlerts");
  if(alertEl){
    alertEl.innerHTML=alerts.length?alerts.map(x=>`<div class="dashboard-alert-item">${x}</div>`).join(""):'<div class="dashboard-alert-ok">Sin avisos críticos.</div>';
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("dashboard"))return;
  renderAdvancedDashboard();
});
