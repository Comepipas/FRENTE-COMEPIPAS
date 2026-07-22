
document.addEventListener("DOMContentLoaded",()=>{
 const C=window.FRENTE_HOME_CONFIG||{};
 const fmt=v=>new Intl.NumberFormat("es-ES").format(v);
 const root=document.getElementById("v10Counters");
 if(root){
  root.innerHTML=(C.counters||[]).map((x,i)=>`<article class="v10-counter-card"><span data-ci="${i}" class="v10-counter-number">0</span><strong>${x.label}</strong></article>`).join("");
  const ob=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){root.querySelectorAll("[data-ci]").forEach(el=>{const x=C.counters[+el.dataset.ci],t=+x.value||0,s=performance.now();const step=n=>{const p=Math.min(1,(n-s)/1400),v=Math.floor(t*(1-Math.pow(1-p,3)));el.textContent=fmt(v)+(x.suffix||"");if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)});ob.disconnect()}}),{threshold:.35});ob.observe(root);
 }
 const q=document.getElementById("v10QuickLinks");
 if(q)q.innerHTML=(C.quickLinks||[]).map(x=>`<a class="v10-quick-card" href="${x.href}" style="background-image:url('assets/images/home/${x.image}')"><span></span><div><small>Explorar</small><h3>${x.title}</h3><p>${x.text}</p><b>→</b></div></a>`).join("");
 const t=C.featuredTrip||{},box=document.getElementById("v10FeaturedTrip");
 if(box){
  const occ=Math.max(0,(+t.totalSeats||0)-(+t.availableSeats||0)),pct=t.totalSeats?Math.round(occ/t.totalSeats*100):0;
  box.style.backgroundImage=`linear-gradient(90deg,rgba(0,24,54,.95),rgba(0,24,54,.5)),url('assets/images/home/${t.image}')`;
  box.innerHTML=`<div><span class="v10-eyebrow">${t.title}</span><h2>${t.destination}</h2><p>Málaga CF vs ${t.rival}</p><div class="v10-trip-meta"><div><small>Precio</small><strong>${t.price} €</strong></div><div><small>Plazas libres</small><strong>${t.availableSeats}</strong></div><div><small>Ocupación</small><strong>${pct}%</strong></div></div><div class="v10-trip-progress"><span style="width:${pct}%"></span></div><a class="v10-btn v10-btn-primary" href="${t.href}">Reservar plaza</a></div><div class="v10-trip-countdown"><span>Cuenta atrás</span><div class="v10-countdown-grid"><div><strong id="cd">00</strong><small>Días</small></div><div><strong id="ch">00</strong><small>Horas</small></div><div><strong id="cm">00</strong><small>Min</small></div><div><strong id="cs">00</strong><small>Seg</small></div></div></div>`;
  const target=new Date(t.date).getTime(),tick=()=>{const d=Math.max(0,target-Date.now());cd.textContent=String(Math.floor(d/86400000)).padStart(2,"0");ch.textContent=String(Math.floor(d%86400000/3600000)).padStart(2,"0");cm.textContent=String(Math.floor(d%3600000/60000)).padStart(2,"0");cs.textContent=String(Math.floor(d%60000/1000)).padStart(2,"0")};tick();setInterval(tick,1000);
 }
 document.querySelectorAll(".v10-reveal").forEach(el=>new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add("is-visible")),{threshold:.15}).observe(el));
});
