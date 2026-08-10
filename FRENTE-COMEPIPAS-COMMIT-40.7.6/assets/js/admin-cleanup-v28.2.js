
(function(){
  'use strict';
  const NAV=[
    ['','Resumen','admin.html'],
    ['GESTIÓN','Socios','socios-admin.html'],['','Campañas de abonados','campanas-admin.html'],['','Cuotas y pagos','cuotas-admin.html'],['','ON TOUR','viajes-admin.html'],['','Material y solicitudes','tienda-admin.html'],
    ['CONTENIDO WEB','Noticias','noticias-admin.html'],['','Galería y multimedia','multimedia-admin.html'],['','Calendario y partidos','calendario-admin.html'],['','Historia de la Peña','historia-admin.html'],
    ['ADMINISTRACIÓN','Documentos','documentos-admin.html'],['','Comunicaciones','comunicaciones-admin.html'],['','Usuarios y permisos','usuarios-admin.html'],['','Configuración','configuracion-admin.html'],['','Copias y auditoría','backups-admin.html'],
    ['','Ver web pública','index.html']
  ];
  function current(){return location.pathname.split('/').pop()||'admin.html'}
  function rebuildSidebar(){
    const nav=document.querySelector('.admin-pro-nav'); if(!nav)return;
    const page=current(); nav.innerHTML='';
    NAV.forEach(([group,label,href])=>{
      if(group){const h=document.createElement('span');h.className='fc-nav-heading';h.textContent=group;nav.appendChild(h)}
      const a=document.createElement('a');a.href=href;a.textContent=label;
      if(page===href || (page==='partidos-admin.html'&&href==='calendario-admin.html'))a.classList.add('active');
      nav.appendChild(a);
    });
    const version=document.querySelector('.admin-pro-brand span');if(version)version.textContent='Panel de administración · Commit 28.2 LOCAL';
  }
  function addBack(){
    if(current()==='admin.html')return;
    const main=document.querySelector('.admin-pro-main,.admin-content');if(!main||main.querySelector('.fc-back-panel'))return;
    const a=document.createElement('a');a.className='fc-back-panel';a.href='admin.html';a.textContent='← Volver al panel';main.prepend(a);
  }
  function compactTables(){document.querySelectorAll('[class*="table-wrap"],.members-table-wrap,.table-responsive').forEach(x=>x.classList.add('fc-compact-table'))}
  document.addEventListener('DOMContentLoaded',()=>{rebuildSidebar();addBack();compactTables()});
})();
