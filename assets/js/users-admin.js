(function(){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function render(){
    const body=document.getElementById('usersTableBody');
    if(!body)return;
    const session=window.getAuthSession?.();
    body.innerHTML=session?`<tr><td><strong>${esc(session.nombre||'Administrador')}</strong><br><small>${esc(session.email||'Cuenta de Supabase')}</small></td><td>${esc(window.FRENTE_ROLES?.[session.rol]?.nombre||session.rol||'Administrador')}</td><td><span class="status-pill fee-ok">Activo</span></td><td><small>Sesión validada por Supabase</small></td></tr>`:'<tr><td colspan="4">No hay una sesión administrativa activa.</td></tr>';
    const newButton=document.getElementById('newUserButton');
    const resetButton=document.getElementById('resetUsers');
    if(newButton){newButton.disabled=true;newButton.title='Las altas administrativas se realizan de forma segura en Supabase Auth.';}
    if(resetButton){resetButton.hidden=true;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(window.protectAdminPage&&!protectAdminPage('usuarios'))return;
    render();
  });
})();
