(function(){
  const KEYS={members:'frente_members_db_v2',fees:'frente_fees_db_v1',orders:'frente_orders_db_v1',products:'frente_admin_products_v1',news:'frente_admin_news_v1',media:'frente_media_library_v1',entries:'fc_entry_requests_v113',audit:'frente_audit_log_v1'};
  const read=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem(key));return value||fallback||[]}catch{return fallback||[]}};
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const byId=id=>document.getElementById(id);
  function set(id,value){const el=byId(id);if(el)el.textContent=value}
  function boot(){
    if(typeof protectAdminPage==='function' && !protectAdminPage('dashboard')) return;
    const members=read(KEYS.members,window.FRENTE_MEMBERS_DB);
    const fees=read(KEYS.fees,window.FRENTE_FEES);
    const orders=read(KEYS.orders,window.FRENTE_ORDERS);
    const products=read(KEYS.products,window.FRENTE_PRODUCTS);
    const news=read(KEYS.news,window.FRENTE_NEWS);
    const media=read(KEYS.media,window.FRENTE_MEDIA_LIBRARY);
    const entries=read(KEYS.entries,[]);
    const audit=read(KEYS.audit,[]);
    const active=members.filter(x=>x.estado==='Activo').length;
    const pendingActivation=members.filter(x=>String(x.cuenta||'').toLowerCase().includes('pendiente')).length;
    const pendingEntries=entries.filter(x=>['Solicitud recibida','Pendiente del club'].includes(x.estado)).length;
    const openOrders=orders.filter(x=>!['Completado','Cancelado'].includes(x.estado)).length;
    const pendingFees=fees.filter(x=>x.estado==='Pendiente').length;
    const lowStock=products.filter(x=>Number(x.stock||0)<=5).length;
    set('kpiMembers',active);set('kpiActivations',pendingActivation);set('kpiEntries',pendingEntries);set('kpiOrders',openOrders);
    set('kpiFees',pendingFees);set('kpiLowStock',lowStock);set('kpiNews',news.length);set('kpiMedia',media.length);
    const alerts=[];
    if(pendingEntries) alerts.push({title:`${pendingEntries} solicitudes de entradas pendientes`,text:'Revisa las peticiones y el estado comunicado por el club.'});
    if(openOrders) alerts.push({title:`${openOrders} pedidos abiertos`,text:'Hay pedidos que todavía no están completados o entregados.'});
    if(pendingFees) alerts.push({title:`${pendingFees} cuotas pendientes`,text:'Comprueba los pagos antes de actualizar el estado del socio.'});
    if(lowStock) alerts.push({title:`${lowStock} productos con poco stock`,text:'Conviene revisar existencias antes de aceptar nuevos pedidos.'});
    const alertBox=byId('v116Alerts');
    if(alertBox) alertBox.innerHTML=alerts.length?alerts.map(a=>`<div class="v116-alert"><span>⚠️</span><div><strong>${a.title}</strong><small>${a.text}</small></div></div>`).join(''):'<div class="v116-alert ok"><span>✓</span><div><strong>Todo bajo control</strong><small>No hay avisos prioritarios en este dispositivo.</small></div></div>';
    const memberGroups=[['Activos',active],['Pendientes de activar',pendingActivation],['Bloqueados',members.filter(x=>x.estado==='Bloqueado').length],['Infantiles',members.filter(x=>x.categoria==='Infantil').length],['Jóvenes',members.filter(x=>x.categoria==='Joven').length],['Adultos',members.filter(x=>x.categoria==='Adulto').length]];
    renderStatus('memberStatus',memberGroups);
    const entryGroups=[['Recibidas',entries.filter(x=>x.estado==='Solicitud recibida').length],['Pendientes club',entries.filter(x=>x.estado==='Pendiente del club').length],['Asignadas',entries.filter(x=>['Asignación completa','Asignación parcial','Pagada','Entregada'].includes(x.estado)).length],['No asignadas',entries.filter(x=>x.estado==='No asignada').length]];
    renderStatus('entryStatus',entryGroups);
    const activity=byId('v116Activity');
    if(activity){activity.innerHTML=audit.length?audit.slice(0,7).map(a=>`<div class="v116-activity-row"><time>${new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(a.createdAt))}</time><div><strong>${a.action||'Actividad administrativa'}</strong><small>${a.userName||'Directiva'} · ${a.module||'General'}</small></div></div>`).join(''):[['Hoy','Panel de directiva preparado','V11.6 Profesional'],['Pendiente','Conectar la base de datos','Supabase'],['Pendiente','Importar socios existentes','Excel / CSV']].map(x=>`<div class="v116-activity-row"><time>${x[0]}</time><div><strong>${x[1]}</strong><small>${x[2]}</small></div></div>`).join('')}
    const totalIncome=fees.filter(x=>x.estado==='Pagada').reduce((s,x)=>s+Number(x.importe||0),0)+orders.filter(x=>['Pagado','Preparando','Enviado','Completado'].includes(x.estado)).reduce((s,x)=>s+Number(x.total||0),0);
    set('registeredIncome',money(totalIncome));
    const date=byId('todayDate');if(date)date.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    const toggle=byId('sidebarToggle'),sidebar=byId('adminSidebar');if(toggle&&sidebar)toggle.onclick=()=>sidebar.classList.toggle('open');
    document.querySelectorAll('[data-help]').forEach(btn=>btn.onclick=()=>openHelp(btn.dataset.help));
    const close=byId('helpClose');if(close)close.onclick=()=>byId('helpModal').classList.remove('open');
  }
  function renderStatus(id,rows){const el=byId(id);if(!el)return;const max=Math.max(1,...rows.map(x=>x[1]));el.innerHTML=rows.map(([label,value])=>`<div class="v116-status-item"><span>${label}</span><div class="v116-track"><i style="width:${value?Math.max(5,value/max*100):0}%"></i></div><strong>${value}</strong></div>`).join('')}
  function openHelp(text){byId('helpText').textContent=text;byId('helpModal').classList.add('open')}
  document.addEventListener('DOMContentLoaded',boot);
})();
