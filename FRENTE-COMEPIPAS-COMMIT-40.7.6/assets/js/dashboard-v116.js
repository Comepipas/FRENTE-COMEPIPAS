(function(){
  const KEYS={
    members:'frente_members_db_v2',
    fees:'frente_fees_db_v1',
    orders:'frente_orders_db_v1',
    products:'frente_admin_products_v1',
    news:'frente_admin_news_v1',
    media:'frente_media_library_v1',
    entries:'fc_entry_requests_v113',
    audit:'frente_audit_log_v1'
  };

  const read=(key,fallback=[])=>{
    try{
      const value=JSON.parse(localStorage.getItem(key));
      return value||fallback||[];
    }catch{
      return fallback||[];
    }
  };

  const money=v=>new Intl.NumberFormat('es-ES',{
    style:'currency',
    currency:'EUR'
  }).format(Number(v||0));

  const byId=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().toLowerCase();

  function set(id,value){
    const el=byId(id);
    if(el) el.textContent=value;
  }

  function getSupabaseClient(){
    if(window.FRENTE_SUPABASE_CLIENT?.from) return window.FRENTE_SUPABASE_CLIENT;
    if(window.frenteSupabase?.from) return window.frenteSupabase;
    if(window.supabaseClient?.from) return window.supabaseClient;
    if(window.sb?.from) return window.sb;

    const cfg=window.FRENTE_SUPABASE_CONFIG;
    if(
      cfg?.enabled &&
      cfg?.url &&
      cfg?.anonKey &&
      window.supabase?.createClient
    ){
      window.FRENTE_SUPABASE_CLIENT=window.supabase.createClient(
        cfg.url,
        cfg.anonKey,
        {
          auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:true
          }
        }
      );
      return window.FRENTE_SUPABASE_CLIENT;
    }

    return null;
  }

  async function loadMembers(){
    const client=getSupabaseClient();

    if(!client){
      console.warn(
        '[Commit 34.1] No se encontró cliente Supabase. ' +
        'Se usa la copia local como respaldo.'
      );
      return {
        members:read(KEYS.members,window.FRENTE_MEMBERS_DB),
        source:'local'
      };
    }

    const {data,error}=await client
      .from('socios')
      .select('id,estado,categoria,cuenta_activada');

    if(error){
      console.error('[Commit 34.1] Error cargando socios desde Supabase:',error);
      return {
        members:read(KEYS.members,window.FRENTE_MEMBERS_DB),
        source:'local-error',
        error
      };
    }

    return {
      members:Array.isArray(data)?data:[],
      source:'supabase'
    };
  }

  async function boot(){
    if(
      typeof protectAdminPage==='function' &&
      !protectAdminPage('dashboard')
    ) return;

    const memberResult=await loadMembers();
    const members=memberResult.members;

    const fees=read(KEYS.fees,window.FRENTE_FEES);
    const orders=read(KEYS.orders,window.FRENTE_ORDERS);
    const products=read(KEYS.products,window.FRENTE_PRODUCTS);
    const news=read(KEYS.news,window.FRENTE_NEWS);
    const media=read(KEYS.media,window.FRENTE_MEDIA_LIBRARY);
    const entries=read(KEYS.entries,[]);
    const audit=read(KEYS.audit,[]);

    const active=members.filter(x=>norm(x.estado)==='activo').length;

    const pendingActivation=members.filter(x=>{
      if(typeof x.cuenta_activada==='boolean'){
        return x.cuenta_activada===false;
      }
      return norm(x.cuenta).includes('pendiente');
    }).length;

    const blocked=members.filter(x=>norm(x.estado)==='bloqueado').length;
    const children=members.filter(x=>norm(x.categoria)==='infantil').length;
    const youth=members.filter(x=>norm(x.categoria)==='joven').length;
    const adults=members.filter(x=>norm(x.categoria)==='adulto').length;

    const pendingEntries=entries.filter(x=>
      ['Solicitud recibida','Pendiente del club'].includes(x.estado)
    ).length;

    const openOrders=orders.filter(x=>
      !['Completado','Cancelado'].includes(x.estado)
    ).length;

    const pendingFees=fees.filter(x=>norm(x.estado)==='pendiente').length;
    const lowStock=products.filter(x=>Number(x.stock||0)<=5).length;

    set('kpiMembers',active);
    set('kpiActivations',pendingActivation);
    set('kpiEntries',pendingEntries);
    set('kpiOrders',openOrders);
    set('kpiFees',pendingFees);
    set('kpiLowStock',lowStock);
    set('kpiNews',news.length);
    set('kpiMedia',media.length);

    const alerts=[];

    if(memberResult.source!=='supabase'){
      alerts.push({
        title:'Dashboard usando datos locales',
        text:'No se pudieron cargar los socios desde Supabase. Revisa la conexión o la sesión administrativa.'
      });
    }

    if(pendingEntries){
      alerts.push({
        title:`${pendingEntries} solicitudes de entradas pendientes`,
        text:'Revisa las peticiones y el estado comunicado por el club.'
      });
    }

    if(openOrders){
      alerts.push({
        title:`${openOrders} pedidos abiertos`,
        text:'Hay pedidos que todavía no están completados o entregados.'
      });
    }

    if(pendingFees){
      alerts.push({
        title:`${pendingFees} cuotas pendientes`,
        text:'Comprueba los pagos antes de actualizar el estado del socio.'
      });
    }

    if(lowStock){
      alerts.push({
        title:`${lowStock} productos con poco stock`,
        text:'Conviene revisar existencias antes de aceptar nuevos pedidos.'
      });
    }

    const alertBox=byId('v116Alerts');

    if(alertBox){
      alertBox.innerHTML=alerts.length
        ? alerts.map(a=>`
          <div class="v116-alert">
            <span>⚠️</span>
            <div>
              <strong>${a.title}</strong>
              <small>${a.text}</small>
            </div>
          </div>
        `).join('')
        : `
          <div class="v116-alert ok">
            <span>✓</span>
            <div>
              <strong>Todo bajo control</strong>
              <small>Los datos de socios se han cargado desde Supabase.</small>
            </div>
          </div>
        `;
    }

    const memberGroups=[
      ['Activos',active],
      ['Pendientes de activar',pendingActivation],
      ['Bloqueados',blocked],
      ['Infantiles',children],
      ['Jóvenes',youth],
      ['Adultos',adults]
    ];

    renderStatus('memberStatus',memberGroups);

    const entryGroups=[
      ['Recibidas',entries.filter(x=>x.estado==='Solicitud recibida').length],
      ['Pendientes club',entries.filter(x=>x.estado==='Pendiente del club').length],
      ['Asignadas',entries.filter(x=>
        ['Asignación completa','Asignación parcial','Pagada','Entregada'].includes(x.estado)
      ).length],
      ['No asignadas',entries.filter(x=>x.estado==='No asignada').length]
    ];

    renderStatus('entryStatus',entryGroups);

    const activity=byId('v116Activity');

    if(activity){
      activity.innerHTML=audit.length
        ? audit.slice(0,7).map(a=>`
          <div class="v116-activity-row">
            <time>${new Intl.DateTimeFormat('es-ES',{
              dateStyle:'short',
              timeStyle:'short'
            }).format(new Date(a.createdAt))}</time>
            <div>
              <strong>${a.action||'Actividad administrativa'}</strong>
              <small>${a.userName||'Directiva'} · ${a.module||'General'}</small>
            </div>
          </div>
        `).join('')
        : [
          ['Hoy','Dashboard conectado a Supabase','Commit 34.1'],
          ['Completado','Migración principal de socios','Commit 34'],
          ['Pendiente','Revisar socios sin categoría','Control de incidencias']
        ].map(x=>`
          <div class="v116-activity-row">
            <time>${x[0]}</time>
            <div>
              <strong>${x[1]}</strong>
              <small>${x[2]}</small>
            </div>
          </div>
        `).join('');
    }

    const totalIncome=
      fees
        .filter(x=>norm(x.estado)==='pagada')
        .reduce((s,x)=>s+Number(x.importe||0),0)
      +
      orders
        .filter(x=>['Pagado','Preparando','Enviado','Completado'].includes(x.estado))
        .reduce((s,x)=>s+Number(x.total||0),0);

    set('registeredIncome',money(totalIncome));

    const date=byId('todayDate');
    if(date){
      date.textContent=new Intl.DateTimeFormat('es-ES',{
        weekday:'long',
        day:'numeric',
        month:'long',
        year:'numeric'
      }).format(new Date());
    }

    const toggle=byId('sidebarToggle');
    const sidebar=byId('adminSidebar');

    if(toggle&&sidebar){
      toggle.onclick=()=>sidebar.classList.toggle('open');
    }

    document.querySelectorAll('[data-help]').forEach(btn=>{
      btn.onclick=()=>openHelp(btn.dataset.help);
    });

    const close=byId('helpClose');
    if(close){
      close.onclick=()=>byId('helpModal')?.classList.remove('open');
    }
  }

  function renderStatus(id,rows){
    const el=byId(id);
    if(!el) return;

    const max=Math.max(1,...rows.map(x=>x[1]));

    el.innerHTML=rows.map(([label,value])=>`
      <div class="v116-status-item">
        <span>${label}</span>
        <div class="v116-track">
          <i style="width:${value?Math.max(5,value/max*100):0}%"></i>
        </div>
        <strong>${value}</strong>
      </div>
    `).join('');
  }

  function openHelp(text){
    const helpText=byId('helpText');
    const helpModal=byId('helpModal');

    if(helpText) helpText.textContent=text;
    if(helpModal) helpModal.classList.add('open');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    boot().catch(error=>{
      console.error('[Commit 34.1] Error iniciando el dashboard:',error);
    });
  });
})();
