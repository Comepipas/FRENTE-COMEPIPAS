
const EVENTS = window.FRENTE_EVENTS || [];
let currentDate = new Date();
currentDate.setDate(1);

function formatEventDate(value){
  const date = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-ES", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  }).format(date);
}

function eventTypeClass(type){
  return "event-" + String(type).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-");
}

function getFilteredEvents(){
  const type = document.getElementById("calendarType")?.value || "Todos";
  return EVENTS.filter(item => type === "Todos" || item.tipo === type);
}

function renderCalendar(){
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calendarTitle");
  if(!grid || !title) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  title.textContent = new Intl.DateTimeFormat("es-ES", {
    month:"long", year:"numeric"
  }).format(currentDate);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const filtered = getFilteredEvents();

  let html = "";
  ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(day=>{
    html += `<div class="calendar-weekday">${day}</div>`;
  });

  for(let i=0;i<startOffset;i++){
    html += '<div class="calendar-day calendar-empty-day"></div>';
  }

  for(let day=1; day<=lastDay.getDate(); day++){
    const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const dayEvents = filtered.filter(item=>item.fecha === iso);

    html += `
      <div class="calendar-day">
        <span class="calendar-number">${day}</span>
        <div class="calendar-day-events">
          ${dayEvents.map(item=>`
            <button class="calendar-event ${eventTypeClass(item.tipo)}" data-event-id="${item.id}">
              ${item.hora ? item.hora + " · " : ""}${item.titulo}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
  grid.querySelectorAll("[data-event-id]").forEach(button=>{
    button.addEventListener("click",()=>openEvent(button.dataset.eventId));
  });
}

function renderUpcomingEvents(){
  const target = document.getElementById("upcomingEvents");
  if(!target) return;

  const now = new Date();
  now.setHours(0,0,0,0);

  const upcoming = getFilteredEvents()
    .filter(item => new Date(item.fecha + "T12:00:00") >= now)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha))
    .slice(0,6);

  if(!upcoming.length){
    target.innerHTML = '<div class="event-empty">No hay próximos eventos.</div>';
    return;
  }

  target.innerHTML = upcoming.map(item=>`
    <article class="event-list-card">
      <div class="event-date-box">
        <strong>${new Date(item.fecha+"T12:00:00").getDate()}</strong>
        <span>${new Intl.DateTimeFormat("es-ES",{month:"short"}).format(new Date(item.fecha+"T12:00:00"))}</span>
      </div>
      <div>
        <span class="tag">${item.tipo}</span>
        <h3>${item.titulo}</h3>
        <p>${item.hora} · ${item.lugar}</p>
        <button data-event-id="${item.id}">Ver detalles</button>
      </div>
    </article>
  `).join("");

  target.querySelectorAll("[data-event-id]").forEach(button=>{
    button.addEventListener("click",()=>openEvent(button.dataset.eventId));
  });
}

function openEvent(id){
  const item = EVENTS.find(event=>event.id===id);
  if(!item) return;

  document.getElementById("eventModalTitle").textContent = item.titulo;
  document.getElementById("eventModalMeta").textContent =
    `${formatEventDate(item.fecha)} · ${item.hora} · ${item.lugar}`;
  document.getElementById("eventModalDescription").textContent = item.descripcion || "";
  document.getElementById("eventModal").classList.add("open");
}

function closeEvent(){
  document.getElementById("eventModal")?.classList.remove("open");
}

document.addEventListener("DOMContentLoaded",()=>{
  const params = new URLSearchParams(location.search);
  const today = params.get("month");
  if(today && /^\d{4}-\d{2}$/.test(today)){
    const [year, month] = today.split("-").map(Number);
    currentDate = new Date(year, month-1, 1);
  }

  renderCalendar();
  renderUpcomingEvents();

  document.getElementById("calendarPrev")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()-1);
    renderCalendar();
  });

  document.getElementById("calendarNext")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()+1);
    renderCalendar();
  });

  document.getElementById("calendarToday")?.addEventListener("click",()=>{
    currentDate = new Date();
    currentDate.setDate(1);
    renderCalendar();
  });

  document.getElementById("calendarType")?.addEventListener("change",()=>{
    renderCalendar();
    renderUpcomingEvents();
  });

  document.getElementById("eventModalClose")?.addEventListener("click",closeEvent);
  document.getElementById("eventModal")?.addEventListener("click",event=>{
    if(event.target.id === "eventModal") closeEvent();
  });
});
