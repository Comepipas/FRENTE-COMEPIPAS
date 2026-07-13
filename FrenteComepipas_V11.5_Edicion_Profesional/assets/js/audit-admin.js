
function auditFiltered(){
  const search=(document.getElementById("auditSearch")?.value||"").toLowerCase();
  const module=document.getElementById("auditModule")?.value||"Todos";
  const action=document.getElementById("auditAction")?.value||"Todos";
  const user=document.getElementById("auditUser")?.value||"Todos";
  const dateFrom=document.getElementById("auditDateFrom")?.value||"";
  const dateTo=document.getElementById("auditDateTo")?.value||"";

  return getAuditLog().filter(entry=>{
    const hay=`${entry.userName} ${entry.action} ${entry.module} ${entry.entity} ${entry.detail}`.toLowerCase();
    const date=String(entry.createdAt||"").slice(0,10);

    return hay.includes(search)
      && (module==="Todos"||entry.module===module)
      && (action==="Todos"||entry.action===action)
      && (user==="Todos"||entry.userName===user)
      && (!dateFrom||date>=dateFrom)
      && (!dateTo||date<=dateTo);
  });
}

function auditFormatDate(value){
  return new Intl.DateTimeFormat("es-ES",{
    dateStyle:"short",
    timeStyle:"medium"
  }).format(new Date(value));
}

function renderAuditStats(){
  const log=getAuditLog();
  const today=new Date().toISOString().slice(0,10);
  const todayCount=log.filter(x=>String(x.createdAt).slice(0,10)===today).length;
  const warnings=log.filter(x=>x.severity==="warning").length;
  const users=new Set(log.map(x=>x.userName)).size;

  document.getElementById("auditTotal").textContent=log.length;
  document.getElementById("auditToday").textContent=todayCount;
  document.getElementById("auditWarnings").textContent=warnings;
  document.getElementById("auditUsers").textContent=users;
}

function populateAuditFilters(){
  const log=getAuditLog();

  const setOptions=(id,values,allLabel)=>{
    const select=document.getElementById(id);
    if(!select)return;
    const current=select.value||allLabel;
    select.innerHTML=`<option>${allLabel}</option>`+[...new Set(values.filter(Boolean))].sort().map(v=>`<option>${v}</option>`).join("");
    select.value=[...select.options].some(o=>o.value===current)?current:allLabel;
  };

  setOptions("auditModule",log.map(x=>x.module),"Todos");
  setOptions("auditAction",log.map(x=>x.action),"Todos");
  setOptions("auditUser",log.map(x=>x.userName),"Todos");
}

function renderAuditTable(){
  const body=document.getElementById("auditTableBody");
  if(!body)return;

  const rows=auditFiltered();

  body.innerHTML=rows.length?rows.map(entry=>`
    <tr>
      <td>${auditFormatDate(entry.createdAt)}</td>
      <td><strong>${entry.userName}</strong><br><small>${entry.userRole}</small></td>
      <td>${entry.module}</td>
      <td><span class="audit-action audit-${entry.severity}">${entry.action}</span></td>
      <td>${entry.entity||"-"}</td>
      <td>${entry.detail||"-"}</td>
    </tr>
  `).join(""):'<tr><td colspan="6" class="members-empty">No hay actividad para estos filtros.</td></tr>';
}

function renderAudit(){
  renderAuditStats();
  populateAuditFilters();
  renderAuditTable();
}

function exportAuditCSV(){
  const headers=["fecha","usuario","rol","modulo","accion","entidad","detalle","nivel"];
  const rows=[headers.join(",")];

  auditFiltered().forEach(entry=>{
    const values=[
      entry.createdAt,
      entry.userName,
      entry.userRole,
      entry.module,
      entry.action,
      entry.entity,
      entry.detail,
      entry.severity
    ];

    rows.push(values.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","));
  });

  const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="auditoria-frente-comepipas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function seedAudit(){
  if(getAuditLog().length) return;

  const user=auditCurrentUser();
  const now=Date.now();
  const examples=[
    {
      id:"audit-demo-1",
      createdAt:new Date(now-1000*60*8).toISOString(),
      userId:user?.id||"admin-1",
      userName:user?.nombre||"Administrador principal",
      userRole:user?.rol||"superadmin",
      action:"Inicio de sesión",
      module:"Seguridad",
      entity:"Sesión administrativa",
      detail:"Acceso correcto al panel",
      severity:"info"
    },
    {
      id:"audit-demo-2",
      createdAt:new Date(now-1000*60*35).toISOString(),
      userId:user?.id||"admin-1",
      userName:user?.nombre||"Administrador principal",
      userRole:user?.rol||"superadmin",
      action:"Actualización",
      module:"Configuración",
      entity:"Datos generales",
      detail:"Configuración del sitio revisada",
      severity:"info"
    },
    {
      id:"audit-demo-3",
      createdAt:new Date(now-1000*60*90).toISOString(),
      userId:user?.id||"admin-1",
      userName:user?.nombre||"Administrador principal",
      userRole:user?.rol||"superadmin",
      action:"Copia de seguridad",
      module:"Copias de seguridad",
      entity:"Backup completo",
      detail:"Copia local generada",
      severity:"info"
    }
  ];
  saveAuditLog(examples);
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("dashboard"))return;

  seedAudit();
  renderAudit();

  ["auditSearch","auditModule","auditAction","auditUser","auditDateFrom","auditDateTo"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener(id==="auditSearch"?"input":"change",renderAuditTable);
  });

  document.getElementById("exportAudit")?.addEventListener("click",exportAuditCSV);

  document.getElementById("clearAudit")?.addEventListener("click",()=>{
    if(confirm("¿Eliminar todo el historial de auditoría?")){
      localStorage.removeItem(AUDIT_KEY);
      seedAudit();
      renderAudit();
    }
  });

  window.addEventListener("frente:audit",renderAudit);
});
