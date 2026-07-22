
const BACKUP_HISTORY_KEY = "frente_backup_history_v1";

const BACKUP_KEYS = {
  siteSettings: "frente_site_settings_v1",
  adminUsers: "frente_admin_users_v1",
  members: "frente_members_db_v2",
  fees: "frente_fees_db_v1",
  products: "frente_admin_products_v1",
  orders: "frente_orders_db_v1",
  trips: "frente_admin_trips_v1",
  tripBookings: "frente_trip_bookings_v1",
  news: "frente_admin_news_v1",
  media: "frente_media_library_v1",
  events: "frente_events_db_v1"
};

function safeParse(value, fallback=null){
  try{
    return value ? JSON.parse(value) : fallback;
  }catch{
    return fallback;
  }
}

function getBackupHistory(){
  return safeParse(localStorage.getItem(BACKUP_HISTORY_KEY), []) || [];
}

function saveBackupHistory(history){
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
}

function collectBackupData(){
  const data = {};
  Object.entries(BACKUP_KEYS).forEach(([name,key])=>{
    data[name] = safeParse(localStorage.getItem(key), null);
  });

  return {
    app: "Frente Comepipas",
    version: "V9.2",
    createdAt: new Date().toISOString(),
    origin: location.origin,
    data
  };
}

function downloadJSON(filename, payload){
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function createFullBackup(){
  const backup = collectBackupData();
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const filename = `frente-comepipas-backup-${stamp}.json`;

  downloadJSON(filename, backup);

  const history = getBackupHistory();
  history.unshift({
    id: "backup-" + Date.now(),
    filename,
    createdAt: backup.createdAt,
    modules: Object.values(backup.data).filter(value=>value!==null).length,
    size: JSON.stringify(backup).length
  });

  saveBackupHistory(history.slice(0,20));
  renderBackupHistory();
  renderBackupStats();
}

function exportModule(moduleName){
  const key = BACKUP_KEYS[moduleName];
  if(!key) return;
  const value = safeParse(localStorage.getItem(key), null);
  const payload = {
    app:"Frente Comepipas",
    version:"V9.2",
    module:moduleName,
    createdAt:new Date().toISOString(),
    data:value
  };
  downloadJSON(`frente-comepipas-${moduleName}.json`, payload);
}

function restoreBackupObject(backup){
  if(!backup || backup.app!=="Frente Comepipas" || !backup.data){
    throw new Error("El archivo no parece una copia válida de Frente Comepipas.");
  }

  Object.entries(BACKUP_KEYS).forEach(([name,key])=>{
    if(Object.prototype.hasOwnProperty.call(backup.data,name)){
      const value = backup.data[name];
      if(value===null || typeof value==="undefined"){
        localStorage.removeItem(key);
      }else{
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  });

  const history = getBackupHistory();
  history.unshift({
    id:"restore-"+Date.now(),
    filename:"Restauración manual",
    createdAt:new Date().toISOString(),
    modules:Object.keys(backup.data).length,
    size:JSON.stringify(backup).length,
    restored:true
  });
  saveBackupHistory(history.slice(0,20));
}

function importBackupFile(file){
  const reader = new FileReader();

  reader.onload = ()=>{
    try{
      const backup = JSON.parse(String(reader.result));
      restoreBackupObject(backup);
      document.getElementById("backupMessage").textContent = "Copia restaurada correctamente.";
      renderBackupHistory();
      renderBackupStats();
      setTimeout(()=>location.reload(),1200);
    }catch(error){
      document.getElementById("backupMessage").textContent = error.message || "No se pudo restaurar la copia.";
    }
  };

  reader.readAsText(file,"utf-8");
}

function clearAllProjectData(){
  Object.values(BACKUP_KEYS).forEach(key=>localStorage.removeItem(key));
  renderBackupStats();
  document.getElementById("backupMessage").textContent = "Datos locales eliminados. Se usarán los datos base del proyecto.";
}

function renderBackupStats(){
  const configured = Object.values(BACKUP_KEYS).filter(key=>localStorage.getItem(key)!==null).length;
  const history = getBackupHistory();
  const last = history[0];

  document.getElementById("backupModules").textContent = configured;
  document.getElementById("backupCount").textContent = history.length;
  document.getElementById("backupLast").textContent = last
    ? new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short"}).format(new Date(last.createdAt))
    : "Nunca";
}

function formatBytes(bytes){
  if(bytes<1024) return bytes+" B";
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/(1024*1024)).toFixed(1)+" MB";
}

function renderBackupHistory(){
  const target = document.getElementById("backupHistory");
  if(!target) return;
  const history = getBackupHistory();

  target.innerHTML = history.length ? history.map(item=>`
    <div class="backup-history-row">
      <div>
        <strong>${item.restored ? "Restauración" : "Copia de seguridad"}</strong>
        <span>${item.filename}</span>
      </div>
      <div>
        <span>${new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.createdAt))}</span>
        <b>${item.modules} módulos · ${formatBytes(item.size||0)}</b>
      </div>
    </div>
  `).join("") : '<p class="admin-empty">Todavía no hay copias registradas.</p>';
}

function renderModuleButtons(){
  const target = document.getElementById("backupModulesGrid");
  if(!target) return;

  const labels = {
    siteSettings:"Configuración",
    adminUsers:"Usuarios",
    members:"Socios",
    fees:"Cuotas",
    products:"Productos",
    orders:"Pedidos",
    trips:"Viajes",
    tripBookings:"Reservas",
    news:"Noticias",
    media:"Multimedia",
    events:"Eventos"
  };

  target.innerHTML = Object.keys(BACKUP_KEYS).map(name=>`
    <button class="backup-module-button" data-export-module="${name}">
      <strong>${labels[name] || name}</strong>
      <span>Descargar JSON</span>
    </button>
  `).join("");

  target.querySelectorAll("[data-export-module]").forEach(button=>{
    button.addEventListener("click",()=>exportModule(button.dataset.exportModule));
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("dashboard")) return;

  renderBackupStats();
  renderBackupHistory();
  renderModuleButtons();

  document.getElementById("createBackupButton")?.addEventListener("click",createFullBackup);

  document.getElementById("restoreBackupInput")?.addEventListener("change",event=>{
    const file = event.target.files?.[0];
    if(!file) return;

    if(confirm("La restauración sustituirá los datos locales actuales. ¿Continuar?")){
      importBackupFile(file);
    }
    event.target.value="";
  });

  document.getElementById("clearProjectData")?.addEventListener("click",()=>{
    if(confirm("¿Eliminar todos los datos locales personalizados? Esta acción no puede deshacacerse sin una copia.")){
      clearAllProjectData();
    }
  });

  document.getElementById("clearBackupHistory")?.addEventListener("click",()=>{
    if(confirm("¿Borrar únicamente el historial de copias?")){
      localStorage.removeItem(BACKUP_HISTORY_KEY);
      renderBackupHistory();
      renderBackupStats();
    }
  });
});
