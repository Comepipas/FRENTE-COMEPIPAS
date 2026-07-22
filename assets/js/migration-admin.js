
function renderMigrationStatus(status){
  const badge=document.getElementById("migrationStatus");
  const detail=document.getElementById("migrationDetail");

  if(status.mode==="online"){
    badge.textContent="Conectado";
    badge.className="migration-status is-online";
    detail.textContent="Supabase está disponible. Ya puedes migrar o descargar datos.";
  }else{
    badge.textContent="Modo local";
    badge.className="migration-status is-local";
    detail.textContent=status.configured
      ? `No se pudo conectar: ${status.error || "error desconocido"}`
      : "Añade la URL y la clave pública en assets/js/supabase-config.js.";
  }
}

function renderLocalInventory(){
  const target=document.getElementById("migrationInventory");
  if(!target)return;

  target.innerHTML=Object.entries(window.FrenteSync.resources).map(([name,cfg])=>{
    const value=window.FrenteSync.readLocal(cfg.key);
    const count=Array.isArray(value) ? value.length : value ? 1 : 0;

    return `
      <div class="migration-inventory-row">
        <span>${name}</span>
        <strong>${count} registro(s)</strong>
      </div>
    `;
  }).join("");
}

function showMigrationResults(results){
  const target=document.getElementById("migrationResults");
  if(!target)return;

  target.innerHTML=results.map(result=>`
    <div class="migration-result ${result.error ? "has-error":"is-ok"}">
      <strong>${result.name}</strong>
      <span>${result.error || `${result.count} registro(s)`}</span>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded",async()=>{
  if(window.protectAdminPage && !protectAdminPage("dashboard")) return;

  renderLocalInventory();

  const status=await window.FrenteSync.status();
  renderMigrationStatus(status);

  document.getElementById("testSupabaseButton")?.addEventListener("click",async()=>{
    const button=document.getElementById("testSupabaseButton");
    button.disabled=true;
    button.textContent="Comprobando...";

    const status=await window.FrenteSync.status();
    renderMigrationStatus(status);

    button.disabled=false;
    button.textContent="Comprobar conexión";
  });

  document.getElementById("pushToSupabase")?.addEventListener("click",async()=>{
    if(window.FrenteSupabase.mode!=="online"){
      alert("Primero debes conectar Supabase.");
      return;
    }

    if(!confirm("¿Migrar los datos locales a Supabase?")){
      return;
    }

    const progress=document.getElementById("migrationProgress");
    const results=await window.FrenteSync.pushAll(info=>{
      progress.textContent=`${info.index}/${info.total} · ${info.message}`;
    });

    progress.textContent="Migración terminada.";
    showMigrationResults(results);

    if(window.logAudit){
      logAudit("Migración","Supabase","Datos locales","Migración local → Supabase completada","info");
    }
  });

  document.getElementById("pullFromSupabase")?.addEventListener("click",async()=>{
    if(window.FrenteSupabase.mode!=="online"){
      alert("Primero debes conectar Supabase.");
      return;
    }

    if(!confirm("Esto sustituirá los datos locales con los datos online. ¿Continuar?")){
      return;
    }

    const progress=document.getElementById("migrationProgress");
    const results=await window.FrenteSync.pullAll(info=>{
      progress.textContent=`${info.index}/${info.total} · ${info.message}`;
    });

    progress.textContent="Descarga terminada.";
    showMigrationResults(results);
    renderLocalInventory();

    if(window.logAudit){
      logAudit("Sincronización","Supabase","Datos online","Supabase → local completado","info");
    }
  });
});
