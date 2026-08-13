(function(){
  'use strict';
  const fmt=new Intl.NumberFormat('es-ES');
  const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2});
  const state=value=>String(value||'').trim().toLowerCase();
  function setKpi(id,value,detail,tone){
    const card=document.getElementById(id);
    if(!card)return;
    card.className='erp-kpi '+(tone||'positive');
    const strong=card.querySelector('strong'),small=card.querySelector('small');
    if(strong)strong.textContent=value;
    if(small)small.textContent=detail;
  }
  function linkKpi(id,href,label){
    const card=document.getElementById(id);
    if(!card)return;
    card.tabIndex=0;
    card.setAttribute('role','link');
    card.setAttribute('aria-label',label);
    card.style.cursor='pointer';
    card.onclick=()=>location.href=href;
    card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();location.href=href}};
  }
  async function optional(db,table,columns='*'){
    const result=await db.from(table).select(columns).limit(10000);
    if(result.error)throw result.error;
    return result.data||[];
  }
  async function refreshLiveDashboard(){
    const system=document.getElementById('system');
    const button=document.getElementById('refreshDash');
    if(button)button.disabled=true;
    if(system)system.className='erp-connection loading';
    try{
      const db=(await window.FrenteSupabase.init()).client;
      const required=await Promise.all([
        optional(db,'socios','id,nombre,apellidos,estado,updated_at'),
        optional(db,'cuotas_socios','id,estado,importe,updated_at')
      ]);
      const optionalResults=await Promise.allSettled([
        optional(db,'material_requests','id,estado,created_at'),
        optional(db,'travel_events','id,estado,visible,fecha_salida'),
        optional(db,'material_items','id,disponibilidad,activa'),
        optional(db,'news','id,estado,status,created_at')
      ]);
      const members=required[0],fees=required[1];
      const extras=optionalResults.map(result=>result.status==='fulfilled'?result.value:[]);
      const active=members.filter(row=>state(row.estado)==='activo');
      const pending=fees.filter(row=>state(row.estado)==='pendiente');
      const paid=fees.filter(row=>['pagada','pagado','cobrada','cobrado'].includes(state(row.estado)));
      const income=paid.reduce((sum,row)=>sum+Number(row.importe||0),0);
      const requests=extras[0].filter(row=>!['entregado','cancelado','cerrado'].includes(state(row.estado)));
      setKpi('kMembers',fmt.format(active.length),fmt.format(members.length)+' socios registrados','positive');
      setKpi('kIncome',eur.format(income),fmt.format(paid.length)+' cuotas cobradas','positive');
      setKpi('kPending',fmt.format(pending.length),pending.length?'Requieren seguimiento':'Cobros al día',pending.length?'warning':'positive');
      setKpi('kOps',fmt.format(requests.length),fmt.format(requests.length)+' solicitudes de material abiertas',requests.length?'info':'positive');
      linkKpi('kPending','socios-admin.html?cuota=pendiente','Abrir socios con cuotas pendientes');
      linkKpi('kOps','tienda-admin.html?estado=abierta','Abrir solicitudes de material pendientes');
      const trips=document.getElementById('nTrips'),news=document.getElementById('nNews'),products=document.getElementById('nProducts');
      if(trips)trips.textContent=fmt.format(extras[1].length);
      if(news&&extras[3].length)news.textContent=fmt.format(extras[3].length);
      if(products)products.textContent=fmt.format(extras[2].length);
      if(system)system.className='erp-connection online';
      const connection=document.getElementById('dashConnection'),latency=document.getElementById('latency'),updated=document.getElementById('lastUpdate');
      if(connection)connection.textContent='Supabase operativo';
      if(latency)latency.textContent='Socios y cuotas sincronizados';
      if(updated)updated.textContent='Última actualización: '+new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date());
      const alerts=document.getElementById('alerts');
      if(alerts)alerts.innerHTML=pending.length
        ?`<a class="erp-alert warning" href="cuotas-admin.html"><b>€</b><span><strong>${fmt.format(pending.length)} cuotas pendientes</strong><small>Requieren seguimiento.</small></span><i>Revisar ›</i></a>`
        :'<div class="erp-alert ok"><b>✓</b><span><strong>Sin alertas económicas</strong><small>Las cuotas registradas están conciliadas.</small></span></div>';
    }catch(error){
      if(system)system.className='erp-connection offline';
      const connection=document.getElementById('dashConnection'),latency=document.getElementById('latency');
      if(connection)connection.textContent='Supabase sin conexión';
      if(latency)latency.textContent='No se pudieron consultar socios y cuotas';
      console.error('Dashboard Enterprise:',error);
    }finally{
      if(button)button.disabled=false;
    }
  }
  function start(){
    setTimeout(refreshLiveDashboard,1800);
    document.getElementById('refreshDash')?.addEventListener('click',event=>{
      event.stopImmediatePropagation();
      refreshLiveDashboard();
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
