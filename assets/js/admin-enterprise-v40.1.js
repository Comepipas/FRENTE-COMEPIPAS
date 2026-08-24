(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v||0));
  const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  const norm=v=>String(v??'').trim().toLowerCase();
  const dateOf=o=>o?.created_at||o?.updated_at||o?.fecha||o?.alta||o?.date||'';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ago=value=>{if(!value)return 'Sin fecha';const d=new Date(value);if(Number.isNaN(d.getTime()))return safe(value);const sec=Math.max(0,(Date.now()-d)/1000);if(sec<60)return 'Ahora';if(sec<3600)return `Hace ${Math.floor(sec/60)} min`;if(sec<86400)return `Hace ${Math.floor(sec/3600)} h`;if(sec<604800)return `Hace ${Math.floor(sec/86400)} d`;return d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})};
  const label=(o,fallback)=>o?.titulo||o?.nombre||o?.cliente||o?.description||o?.accion||fallback;
  const readLocal=key=>{try{const x=JSON.parse(localStorage.getItem(key));return Array.isArray(x)?x:[]}catch{return []}};

  async function getData(){
    let online=false;
    try{const state=await window.FrenteSupabase.init();online=state?.mode==='online'||window.FrenteSupabase.mode==='online'}catch{}
    const api=window.FrenteAPI;
    const names=['members','fees','orders','trips','news','products','audit'];
    const settled=await Promise.allSettled(names.map(n=>api[n].list({orderBy:n==='audit'?'created_at':undefined,ascending:false,limit:n==='audit'?20:undefined})));
    const data={};names.forEach((n,i)=>data[n]=settled[i].status==='fulfilled'?(settled[i].value||[]):[]);
    return {online,data,failures:settled.filter(x=>x.status==='rejected').length};
  }

  function renderActivity(d){
    const items=[];
    d.audit.forEach(x=>items.push({icon:'◎',type:'Auditoría',title:label(x,'Movimiento administrativo'),detail:x.entidad||x.module||'Sistema',date:dateOf(x)}));
    d.members.slice(-5).forEach(x=>items.push({icon:'♙',type:'Socio',title:`${x.nombre||''} ${x.apellidos||''}`.trim()||'Socio actualizado',detail:x.estado||x.status||'Ficha de socio',date:dateOf(x)}));
    d.orders.slice(-5).forEach(x=>items.push({icon:'◇',type:'Material',title:label(x,'Solicitud de material'),detail:x.estado||x.status||'Solicitud registrada',date:dateOf(x)}));
    d.news.slice(-4).forEach(x=>items.push({icon:'▤',type:'Noticia',title:label(x,'Noticia'),detail:x.publicada===false?'Borrador':'Contenido publicado',date:dateOf(x)}));
    d.trips.slice(-4).forEach(x=>items.push({icon:'➜',type:'ON TOUR',title:label(x,x.destino||'Desplazamiento'),detail:x.estado||'Actividad programada',date:dateOf(x)}));
    items.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const root=$('#dashboardActivity');
    root.innerHTML=items.length?items.slice(0,7).map(x=>`<div class="activity-item"><span class="activity-icon">${x.icon}</span><div class="activity-copy"><strong>${safe(x.title)}</strong><small>${safe(x.type)} · ${safe(x.detail)}</small></div><span class="activity-time">${ago(x.date)}</span></div>`).join(''):'<div class="empty-state">Todavía no hay movimientos recientes registrados.</div>';
  }

  function renderAlerts(d,online,failures){
    const pending=d.fees.filter(x=>['pendiente','impagada','vencida'].includes(norm(x.estado||x.status))).length;
    const open=d.orders.filter(x=>!['completado','cancelado','entregado'].includes(norm(x.estado||x.status))).length;
    const stock=d.products.filter(x=>x.disponible===false||Number(x.stock??999)<=5).length;
    const alerts=[];
    if(!online)alerts.push({level:'danger',title:'Supabase sin conexión',detail:'Se muestran los datos locales disponibles. Revisa la configuración.'});
    if(failures)alerts.push({level:'danger',title:`${failures} fuente${failures===1?'':'s'} de datos no disponible${failures===1?'':'s'}`,detail:'El resto del dashboard continúa operativo.'});
    if(pending)alerts.push({level:'warn',title:`${pending} cuota${pending===1?'':'s'} pendiente${pending===1?'':'s'}`,detail:'Conviene revisar pagos o iniciar un recordatorio.'});
    if(open)alerts.push({level:'warn',title:`${open} solicitud${open===1?'':'es'} por atender`,detail:'Hay peticiones de material todavía abiertas.'});
    if(stock)alerts.push({level:'danger',title:`${stock} producto${stock===1?'':'s'} con stock bajo`,detail:'Revisa la disponibilidad del inventario.'});
    if(!alerts.length)alerts.push({level:'ok',title:'Todo bajo control',detail:'No hay incidencias que requieran atención inmediata.'});
    const count=alerts.filter(x=>x.level!=='ok').length;text('alertsCount',count);text('navAlerts',count);
    $('#dashboardAlerts').innerHTML=alerts.slice(0,4).map(x=>`<div class="alert-item ${x.level}"><i class="alert-dot"></i><div><strong>${safe(x.title)}</strong><small>${safe(x.detail)}</small></div></div>`).join('');
    return {pending,open,stock,count};
  }

  function renderHealth(online,failures,alerts){
    const database=online&&!failures;const inventory=alerts.stock===0;const operations=alerts.pending+alerts.open===0;
    const percent=Math.round(([database,inventory,operations].filter(Boolean).length/3)*100);
    text('healthPercent',`${percent}%`);text('healthScore',percent===100?'Óptimo':percent>=67?'Estable':'Atención');
    $('#healthRing').style.setProperty('--health',percent);
    [['healthDatabase',database,online?'Operativo':'Sin conexión'],['healthStock',inventory,inventory?'Correcto':'Revisar'],['healthOperations',operations,operations?'Al día':'Pendiente']].forEach(([id,ok,label])=>{text(id,label);const dot=document.getElementById(id).parentElement.querySelector('i');dot.className=ok?'ok':id==='healthDatabase'?'error':'warn'});
  }

  async function load(){
    const button=$('#refreshDashboard');button?.classList.add('loading');
    const status=$('#dashboardConnection');status.className='connection-pill is-loading';status.querySelector('span').textContent='Actualizando datos';
    try{
      const {online,data,failures}=await getData();
      const active=data.members.filter(x=>['activo','active'].includes(norm(x.estado||x.status))).length;
      const paid=data.fees.filter(x=>['pagada','pagado','paid'].includes(norm(x.estado||x.status)));
      const income=paid.reduce((a,x)=>a+Number(x.importe||x.amount||0),0);
      const alerts=renderAlerts(data,online,failures);
      text('dashMembers',active);text('dashPendingFees',alerts.pending);text('dashOpenOrders',alerts.open);text('dashIncome',money(income));text('dashTrips',data.trips.length);text('dashNews',data.news.length);text('dashLowStock',alerts.stock);
      text('membersTrend',`${data.members.length} fichas totales`);text('feesTrend',alerts.pending?'Requieren revisión':'Todo al día');text('incomeTrend',`${paid.length} pagos contabilizados`);text('ordersTrend',alerts.open?'Pendientes de gestión':'Sin pendientes');
      renderActivity(data);renderHealth(online,failures,alerts);
      status.className=`connection-pill ${online?'is-online':'is-error'}`;status.querySelector('span').textContent=online?'Supabase conectado':'Modo local';
    }catch(err){
      ['dashMembers','dashPendingFees','dashOpenOrders','dashIncome','dashTrips','dashNews','dashLowStock'].forEach(id=>text(id,'—'));
      status.className='connection-pill is-error';status.querySelector('span').textContent='Datos no disponibles';
      $('#dashboardActivity').innerHTML='<div class="empty-state">No se pudieron cargar los datos. Puedes volver a intentarlo.</div>';
      $('#dashboardAlerts').innerHTML=`<div class="alert-item danger"><i class="alert-dot"></i><div><strong>Error de actualización</strong><small>${safe(err?.message||'Error desconocido')}</small></div></div>`;
    }finally{button?.classList.remove('loading')}
  }

  function setupUI(){
    text('dashboardDate',new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date()));
    $('#refreshDashboard')?.addEventListener('click',load);
    $('#sidebarOpen')?.addEventListener('click',()=>$('#enterpriseSidebar').classList.add('open'));
    $('#sidebarClose')?.addEventListener('click',()=>$('#enterpriseSidebar').classList.remove('open'));
    const input=$('#dashboardSearch'),results=$('#searchResults');const links=[...document.querySelectorAll('.enterprise-nav a')];
    input?.addEventListener('input',()=>{const q=norm(input.value);if(!q){results.classList.remove('open');return}const found=links.filter(a=>norm(a.textContent).includes(q)).slice(0,7);results.innerHTML=found.length?found.map(a=>`<a href="${safe(a.getAttribute('href'))}">${safe(a.textContent.trim())}</a>`).join(''):'<span class="empty-state">Sin resultados</span>';results.classList.add('open')});
    document.addEventListener('click',e=>{if(!e.target.closest('.topbar-search'))results?.classList.remove('open')});
  }
  document.addEventListener('DOMContentLoaded',()=>{setupUI();load()});
})();
