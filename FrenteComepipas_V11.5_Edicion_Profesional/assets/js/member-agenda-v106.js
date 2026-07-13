
document.addEventListener("DOMContentLoaded",()=>{
  const eventsRoot=document.getElementById("memberAgendaEvents"),noticesRoot=document.getElementById("memberAgendaNotices");
  const today=new Date().toISOString().slice(0,10);
  const events=(getAgendaData().events||[]).filter(e=>e.socios&&e.fecha>=today).sort((a,b)=>`${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0,8);
  if(eventsRoot)eventsRoot.innerHTML=events.map(e=>`<article class="member-agenda-item"><div><span>${e.tipo}</span><strong>${e.titulo}</strong><p>${agendaDate(e.fecha)}${e.hora?" · "+e.hora:""}${e.lugar?" · "+e.lugar:""}</p></div></article>`).join("")||"<p>No hay próximos eventos.</p>";
  const notices=activeAgendaNotices("socios");
  if(noticesRoot)noticesRoot.innerHTML=notices.map(n=>`<article class="member-note note-${n.nivel==="Urgente"?"danger":n.nivel==="Importante"?"warning":"info"}"><div><strong>${n.titulo}</strong><p>${n.texto}</p></div></article>`).join("")||"<p>No hay avisos activos.</p>";
});
