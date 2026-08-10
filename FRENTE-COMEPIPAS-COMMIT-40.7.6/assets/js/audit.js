
const AUDIT_KEY = "frente_audit_log_v1";

function getAuditLog(){
  try{
    return JSON.parse(localStorage.getItem(AUDIT_KEY)) || [];
  }catch{
    return [];
  }
}

function saveAuditLog(entries){
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
}

function auditCurrentUser(){
  try{
    return JSON.parse(localStorage.getItem("frente_admin_auth_session_v1"));
  }catch{
    return null;
  }
}

function logAudit(action,module,entity="",detail="",severity="info"){
  const user = auditCurrentUser();
  const entry = {
    id: "audit-" + Date.now() + "-" + Math.random().toString(36).slice(2,7),
    createdAt: new Date().toISOString(),
    userId: user?.id || "system",
    userName: user?.nombre || "Sistema local",
    userRole: user?.rol || "sistema",
    action,
    module,
    entity,
    detail,
    severity
  };

  const log = getAuditLog();
  log.unshift(entry);
  saveAuditLog(log.slice(0,2000));
  window.dispatchEvent(new CustomEvent("frente:audit",{detail:entry}));
  return entry;
}

function installAuditStorageWatcher(){
  if(window.__frenteAuditStorageInstalled) return;
  window.__frenteAuditStorageInstalled = true;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  const modules = {
    "frente_site_settings_v1":"Configuración",
    "frente_admin_users_v1":"Usuarios",
    "frente_members_db_v2":"Socios",
    "frente_fees_db_v1":"Cuotas",
    "frente_admin_products_v1":"Productos",
    "frente_orders_db_v1":"Pedidos",
    "frente_admin_trips_v1":"Viajes",
    "frente_trip_bookings_v1":"Reservas de viaje",
    "frente_admin_news_v1":"Noticias",
    "frente_media_library_v1":"Multimedia",
    "frente_backup_history_v1":"Copias de seguridad"
  };

  localStorage.setItem = function(key,value){
    const previous = localStorage.getItem(key);
    originalSetItem(key,value);

    if(key === AUDIT_KEY || !modules[key]) return;

    let action = previous === null ? "Creación" : "Actualización";
    let detail = "Datos guardados en el navegador";

    try{
      const oldValue = previous ? JSON.parse(previous) : null;
      const newValue = JSON.parse(value);

      if(Array.isArray(oldValue) && Array.isArray(newValue)){
        if(newValue.length > oldValue.length) action = "Alta";
        else if(newValue.length < oldValue.length) action = "Eliminación";
        detail = `Registros: ${oldValue.length} → ${newValue.length}`;
      }
    }catch{}

    logAudit(action,modules[key],key,detail,action==="Eliminación"?"warning":"info");
  };

  localStorage.removeItem = function(key){
    const existed = localStorage.getItem(key) !== null;
    originalRemoveItem(key);
    if(existed && modules[key]){
      logAudit("Restauración o limpieza",modules[key],key,"Se eliminaron los datos personalizados del módulo","warning");
    }
  };
}

installAuditStorageWatcher();
