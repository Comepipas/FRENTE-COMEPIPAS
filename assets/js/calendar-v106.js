
let agendaMonth=new Date();
agendaMonth.setDate(1);

function agendaTypeClass(type){
  return "event-"+agendaSlug(type);
}

function filteredAgendaEvents(){
  const type=document.getElementById("calendarType")?.value||"Todos";
  return (getAgendaData().events||[])
    .filter(e=>e.publico!==false)
    .filter(e=>type==="Todos"||e.tipo===type);
}

function fillAgendaTypes(){
  const select=document.getElementById("calendarType");
  if(!select)return;
  const current=select.value||"Todos";
  const types=[...new Set((getAgendaData().events||[]).filter(e=>e.publico!==false).map(e=>e.tipo))].sort();
  select.innerHTML='<option>Todos</option>'+types.map(t=>`<option>${t}</option>`).join("");
  select.value=types.includes(current)?current:"Todos";
}

function renderAgendaCalendar(){
  const grid=document.getElementById("calendarGrid"),title=document.getElementById("calendarTitle");
  if(!grid||!title)return;
  const year=agendaMonth.getFullYear(),month=agendaMonth.getMonth();
  title.textContent=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(agendaMonth);
  const first=new Date(year,month,1),last=new Date(year,month+1,0),offset=(first.getDay()+6)%7;
  let html=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>`<div class="calendar-weekday">${d}</div>`).join("");
  for(let i=0;i<offset;i++)html+='<div class="calendar-day calendar-empty-day"></div>';
  const rows=filteredAgendaEvents();
  for(let day=1;day<=last.getDate();day++){
    const iso=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const items=rows.filter(e=>e.fecha===iso);
    html+=`<div class="calendar-day"><span class="calendar-number">${day}</span><div class="calendar-day-events">${
      items.map(e=>`<button class="calendar-event ${agendaTypeClass(e.tipo)}" data-agenda-event="${e.id}">${e.hora?e.hora+" · ":""}${e.titulo}</button>`).join("")
    }</div></div>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll("[data-agenda-event]").forEach(b=>b.onclick=()=>openAgendaEvent(b.dataset.agendaEvent));
}

function renderAgendaUpcoming(){
  const target=document.getElementById("upcomingEvents");
  if(!target)return;
  const today=new Date().toISOString().slice(0,10);
  const rows=filteredAgendaEvents().filter(e=>e.fecha>=today).sort((a,b)=>`${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0,8);
  target.innerHTML=rows.length?rows.map(e=>`
    <article class="event-list-card">
      <div class="event-date-box"><strong>${new Date(e.fecha+"T12:00:00").getDate()}</strong><span>${new Intl.DateTimeFormat("es-ES",{month:"short"}).format(new Date(e.fecha+"T12:00:00"))}</span></div>
      <div><span class="tag">${e.tipo}</span><h3>${e.titulo}</h3><p>${e.hora||""}${e.hora&&e.lugar?" · ":""}${e.lugar||""}</p><button data-agenda-event="${e.id}">Ver detalles</button></div>
    </article>`).join(""):'<div class="event-empty">No hay próximos eventos.</div>';
  target.querySelectorAll("[data-agenda-event]").forEach(b=>b.onclick=()=>openAgendaEvent(b.dataset.agendaEvent));
}

function openAgendaEvent(id){
  const e=(getAgendaData().events||[]).find(x=>x.id===id);
  if(!e)return;
  document.getElementById("eventModalTitle").textContent=e.titulo;
  document.getElementById("eventModalMeta").textContent=`${agendaDate(e.fecha)}${e.hora?" · "+e.hora:""}${e.lugar?" · "+e.lugar:""}`;
  document.getElementById("eventModalDescription").textContent=e.descripcion||"";
  document.getElementById("eventModal").classList.add("open");
}

function closeAgendaEvent(){document.getElementById("eventModal")?.classList.remove("open")}

function renderPublicNotices(){
  const root=document.getElementById("publicAgendaNotices");
  if(!root)return;
  const rows=activeAgendaNotices("portada");
  root.innerHTML=rows.map(n=>`<article class="agenda-public-notice level-${agendaSlug(n.nivel)}"><strong>${n.titulo}</strong><p>${n.texto}</p></article>`).join("");
  root.hidden=!rows.length;
}

document.addEventListener("DOMContentLoaded",()=>{
  fillAgendaTypes();renderAgendaCalendar();renderAgendaUpcoming();renderPublicNotices();
  document.getElementById("calendarPrev")?.addEventListener("click",()=>{agendaMonth.setMonth(agendaMonth.getMonth()-1);renderAgendaCalendar()});
  document.getElementById("calendarNext")?.addEventListener("click",()=>{agendaMonth.setMonth(agendaMonth.getMonth()+1);renderAgendaCalendar()});
  document.getElementById("calendarToday")?.addEventListener("click",()=>{agendaMonth=new Date();agendaMonth.setDate(1);renderAgendaCalendar()});
  document.getElementById("calendarType")?.addEventListener("change",()=>{renderAgendaCalendar();renderAgendaUpcoming()});
  document.getElementById("eventModalClose")?.addEventListener("click",closeAgendaEvent);
  document.getElementById("eventModal")?.addEventListener("click",e=>{if(e.target.id==="eventModal")closeAgendaEvent()});
  window.addEventListener("frente:agenda-updated",()=>{fillAgendaTypes();renderAgendaCalendar();renderAgendaUpcoming();renderPublicNotices()});
});
