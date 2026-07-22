
document.addEventListener("DOMContentLoaded",()=>{
  const root=document.getElementById("homeAgendaV106"),notice=document.getElementById("homeNoticesV106"),today=new Date().toISOString().slice(0,10);
  const events=(getAgendaData().events||[]).filter(e=>e.publico!==false&&e.fecha>=today).sort((a,b)=>`${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)).slice(0,3);
  if(root)root.innerHTML=events.map(e=>`<a class="home-agenda-card" href="calendario.html?month=${e.fecha.slice(0,7)}"><span>${e.tipo}</span><strong>${e.titulo}</strong><p>${agendaDate(e.fecha)}${e.hora?" · "+e.hora:""}</p><small>${e.lugar||""}</small></a>`).join("");
  const notices=activeAgendaNotices("portada");
  if(notice){notice.innerHTML=notices.map(n=>`<div class="home-notice level-${agendaSlug(n.nivel)}"><strong>${n.titulo}</strong><span>${n.texto}</span></div>`).join("");notice.hidden=!notices.length}
});
