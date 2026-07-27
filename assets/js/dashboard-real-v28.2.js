
const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
const set=(id,value,empty=false)=>{const el=document.getElementById(id);if(el){el.textContent=value;el.dataset.empty=empty?'true':'false'}};
async function loadDashboardReal(){
  const status=document.getElementById('dashConnection');
  if(status){status.textContent='Conectando…';status.className='fc-loading-badge'}
  ['dashMembers','dashPendingFees','dashOpenOrders','dashIncome','dashTrips','dashNews','dashLowStock'].forEach(id=>set(id,'Cargando…',true));
  try{
    await window.FrenteSupabase.init();
    const api=window.FrenteAPI;
    const results=await Promise.allSettled([api.members.list(),api.fees.list(),api.orders.list(),api.trips.list(),api.news.list(),api.products.list()]);
    const val=i=>results[i].status==='fulfilled'?(results[i].value||[]):[];
    const members=val(0),fees=val(1),orders=val(2),trips=val(3),news=val(4),products=val(5);
    set('dashMembers',members.filter(x=>String(x.estado||x.status||'').toLowerCase()==='activo').length);
    set('dashPendingFees',fees.filter(x=>String(x.estado||x.status||'').toLowerCase()==='pendiente').length);
    set('dashOpenOrders',orders.filter(x=>!['completado','cancelado','entregado'].includes(String(x.estado||x.status||'').toLowerCase())).length);
    const income=fees.filter(x=>['pagada','pagado'].includes(String(x.estado||x.status||'').toLowerCase())).reduce((a,b)=>a+Number(b.importe||b.amount||0),0);
    set('dashIncome',money(income));set('dashTrips',trips.length);set('dashNews',news.length);
    set('dashLowStock',products.filter(x=>x.disponible===false || Number(x.stock||999)<=0).length);
    if(status){status.textContent='Supabase conectado';status.className='fc-online-badge'}
    const target=document.getElementById('dashboardActivity');if(target){target.innerHTML='<p class="admin-empty">La actividad se mostrará cuando existan movimientos reales registrados en Supabase.</p>'}
  }catch(err){
    ['dashMembers','dashPendingFees','dashOpenOrders','dashIncome','dashTrips','dashNews','dashLowStock'].forEach(id=>set(id,'Sin datos',true));
    if(status){status.textContent='Sin conexión';status.className='fc-local-badge';status.title=err?.message||''}
    const target=document.getElementById('dashboardActivity');if(target)target.innerHTML='<p class="admin-empty">No se pudieron cargar datos reales de Supabase.</p>';
  }
}
document.addEventListener('DOMContentLoaded',loadDashboardReal);
