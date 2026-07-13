async function showStatus(){
 const cfg=window.SUPABASE_CONFIG||{},box=document.getElementById('connectionStatus');
 box.innerHTML=`<strong>Modo:</strong> ${cfg.enabled?'Supabase':'Local'}<br><strong>URL:</strong> ${cfg.url||'Sin configurar'}<br><strong>Cliente:</strong> ${window.FC_SUPABASE?.ready?'Preparado':window.FC_SUPABASE?.error||'No iniciado'}`;
 if(cfg.enabled){const result=await window.FC_DATA.test();box.className='connection-status '+(result.ok?'ok':'error');box.insertAdjacentHTML('beforeend',`<br><strong>Prueba:</strong> ${result.message}`)}
}
document.addEventListener('DOMContentLoaded',()=>{
 showStatus();
 document.getElementById('testConnection')?.addEventListener('click',showStatus);
 document.getElementById('migrateData')?.addEventListener('click',async()=>{
  const out=document.getElementById('migrationResult');out.textContent='Migrando...';
  try{const r=await window.FC_DATA.migrateLocal();out.textContent='Migración terminada: '+Object.entries(r).map(([k,v])=>`${k}: ${v}`).join(', ')}catch(e){out.textContent='Error: '+e.message}
 });
});
