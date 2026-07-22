
function agendaId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`}

function agendaFilteredEvents(){
  const q=(document.getElementById("agendaSearch")?.value||"").toLowerCase();
  const type=document.getElementById("agendaTypeFilter")?.value||"Todos";
  return (getAgendaData().events||[]).filter(e=>
    `${e.titulo} ${e.tipo} ${e.lugar} ${e.descripcion}`.toLowerCase().includes(q)
    &&(type==="Todos"||e.tipo===type)
  ).sort((a,b)=>`${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
}

function renderAgendaAdmin(){
  const data=getAgendaData(),today=new Date().toISOString().slice(0,10);
  document.getElementById("agendaEventsTotal").textContent=data.events?.length||0;
  document.getElementById("agendaUpcomingTotal").textContent=(data.events||[]).filter(e=>e.fecha>=today).length;
  document.getElementById("agendaNoticesTotal").textContent=(data.notices||[]).filter(n=>n.activo!==false).length;
  document.getElementById("agendaFeaturedTotal").textContent=(data.events||[]).filter(e=>e.destacado).length;

  const typeSelect=document.getElementById("agendaTypeFilter"),current=typeSelect?.value||"Todos";
  if(typeSelect){
    const types=[...new Set((data.events||[]).map(e=>e.tipo))].sort();
    typeSelect.innerHTML='<option>Todos</option>'+types.map(t=>`<option>${t}</option>`).join("");
    typeSelect.value=types.includes(current)?current:"Todos";
  }

  const body=document.getElementById("agendaEventsBody");
  body.innerHTML=agendaFilteredEvents().map(e=>`
    <tr><td><strong>${e.titulo}</strong><br><small>${e.descripcion||""}</small></td><td>${e.tipo}</td><td>${agendaDate(e.fecha)} ${e.hora||""}</td><td>${e.lugar||"-"}</td><td>${e.publico?"Web ":""}${e.socios?"Socios ":""}${e.destacado?"Destacado":""}</td>
    <td class="members-actions-cell"><button data-edit-event="${e.id}">Editar</button><button data-copy-event="${e.id}">Duplicar</button><button class="danger" data-delete-event="${e.id}">Eliminar</button></td></tr>`).join("")||'<tr><td colspan="6">No hay eventos.</td></tr>';

  body.querySelectorAll("[data-edit-event]").forEach(b=>b.onclick=()=>openEventForm(b.dataset.editEvent));
  body.querySelectorAll("[data-copy-event]").forEach(b=>b.onclick=()=>{
    const data=getAgendaData(),item=data.events.find(e=>e.id===b.dataset.copyEvent);
    data.events.push({...item,id:agendaId("evento"),titulo:item.titulo+" (copia)",destacado:false});
    saveAgendaData(data);renderAgendaAdmin();
  });
  body.querySelectorAll("[data-delete-event]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar este evento?")){const data=getAgendaData();data.events=data.events.filter(e=>e.id!==b.dataset.deleteEvent);saveAgendaData(data);renderAgendaAdmin()}
  });

  const noticeBody=document.getElementById("agendaNoticesBody");
  noticeBody.innerHTML=(data.notices||[]).map(n=>`
    <tr><td><strong>${n.titulo}</strong><br><small>${n.texto}</small></td><td>${n.nivel}</td><td>${n.fechaInicio||"-"} → ${n.fechaFin||"-"}</td><td>${n.portada?"Portada ":""}${n.socios?"Socios ":""}${n.admin?"Admin":""}</td><td>${n.activo!==false?"Activo":"Inactivo"}</td>
    <td class="members-actions-cell"><button data-edit-notice="${n.id}">Editar</button><button class="danger" data-delete-notice="${n.id}">Eliminar</button></td></tr>`).join("")||'<tr><td colspan="6">No hay avisos.</td></tr>';
  noticeBody.querySelectorAll("[data-edit-notice]").forEach(b=>b.onclick=()=>openNoticeForm(b.dataset.editNotice));
  noticeBody.querySelectorAll("[data-delete-notice]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar este aviso?")){const data=getAgendaData();data.notices=data.notices.filter(n=>n.id!==b.dataset.deleteNotice);saveAgendaData(data);renderAgendaAdmin()}
  });
}

function openEventForm(id=""){
  const f=document.getElementById("agendaEventForm");f.reset();f.elements.id.value="";
  const item=(getAgendaData().events||[]).find(e=>e.id===id);
  if(item)Object.entries(item).forEach(([k,v])=>{if(f.elements[k])f.elements[k].type==="checkbox"?f.elements[k].checked=!!v:f.elements[k].value=v??""});
  else{f.elements.fecha.value=new Date().toISOString().slice(0,10);f.elements.tipo.value="Evento";f.elements.publico.checked=true;f.elements.socios.checked=true}
  document.getElementById("agendaEventModal").classList.add("open");
}

function openNoticeForm(id=""){
  const f=document.getElementById("agendaNoticeForm");f.reset();f.elements.id.value="";
  const item=(getAgendaData().notices||[]).find(n=>n.id===id);
  if(item)Object.entries(item).forEach(([k,v])=>{if(f.elements[k])f.elements[k].type==="checkbox"?f.elements[k].checked=!!v:f.elements[k].value=v??""});
  else{f.elements.fechaInicio.value=new Date().toISOString().slice(0,10);f.elements.nivel.value="Informativo";f.elements.socios.checked=true;f.elements.admin.checked=true;f.elements.activo.checked=true}
  document.getElementById("agendaNoticeModal").classList.add("open");
}

function exportAgendaCsv(){
  const rows=[["tipo","titulo","fecha","hora","lugar","descripcion"].join(",")];
  (getAgendaData().events||[]).forEach(e=>rows.push(["Evento",e.titulo,e.fecha,e.hora,e.lugar,e.descripcion].map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")));
  const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="agenda-frente-comepipas.csv";a.click();URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded",()=>{
  if(window.protectAdminPage&&!protectAdminPage("calendario"))return;
  renderAgendaAdmin();
  document.getElementById("newAgendaEvent")?.addEventListener("click",()=>openEventForm());
  document.getElementById("newAgendaNotice")?.addEventListener("click",()=>openNoticeForm());
  document.getElementById("agendaSearch")?.addEventListener("input",renderAgendaAdmin);
  document.getElementById("agendaTypeFilter")?.addEventListener("change",renderAgendaAdmin);
  document.getElementById("exportAgenda")?.addEventListener("click",exportAgendaCsv);
  document.getElementById("agendaEventForm")?.addEventListener("submit",e=>{
    e.preventDefault();const f=e.currentTarget,item=Object.fromEntries(new FormData(f).entries()),data=getAgendaData();
    ["publico","socios","destacado"].forEach(k=>item[k]=f.elements[k].checked);
    if(item.id)data.events=data.events.map(x=>x.id===item.id?{...x,...item}:x);else{item.id=agendaId("evento");data.events.push(item)}
    saveAgendaData(data);document.getElementById("agendaEventModal").classList.remove("open");renderAgendaAdmin();
  });
  document.getElementById("agendaNoticeForm")?.addEventListener("submit",e=>{
    e.preventDefault();const f=e.currentTarget,item=Object.fromEntries(new FormData(f).entries()),data=getAgendaData();
    ["portada","socios","admin","activo"].forEach(k=>item[k]=f.elements[k].checked);
    if(item.id)data.notices=data.notices.map(x=>x.id===item.id?{...x,...item}:x);else{item.id=agendaId("aviso");data.notices.push(item)}
    saveAgendaData(data);document.getElementById("agendaNoticeModal").classList.remove("open");renderAgendaAdmin();
  });
  document.querySelectorAll(".store-modal-close").forEach(b=>b.onclick=()=>b.closest(".store-modal").classList.remove("open"));
});
