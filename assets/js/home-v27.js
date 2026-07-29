(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const img=v=>{v=String(v||"").trim();if(!v)return"assets/images/news/temporada.jpg";return /^(https?:|data:|\/)/i.test(v)?v:`assets/images/news/${v}`};
const fmt=v=>v?new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"Fecha por confirmar";
async function news(){const box=document.querySelector("#v10NewsGrid");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando noticias…</div>';try{const db=(await FrenteSupabase.init()).client;const {data,error}=await db.from("news").select("id,titulo,categoria,fecha,imagen,resumen,destacada,created_at").order("destacada",{ascending:false}).order("fecha",{ascending:false}).limit(3);if(error)throw error;box.innerHTML=(data||[]).map(n=>`<article class="v27-news-card"><img src="${esc(img(n.imagen))}" alt="${esc(n.titulo)}"><div class="v27-card-body"><span class="v10-eyebrow">${esc(n.categoria)}</span><h3>${esc(n.titulo)}</h3><p>${esc(n.resumen||"")}</p><a class="v27-home-link" href="noticia.html?id=${encodeURIComponent(n.id)}">Leer noticia →</a></div></article>`).join("")||'<div class="v27-home-empty">Todavía no hay noticias publicadas.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudieron cargar las noticias desde Supabase.</div>'}}
async function gallery(){const box=document.querySelector("#v10Gallery");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando galería…</div>';try{const rows=(await GalleryV26.albums(false)).slice(0,6);box.innerHTML=rows.map(a=>`<a class="v27-gallery-card" href="album.html?album=${encodeURIComponent(a.slug)}"><img src="${esc(a.portada_url||"assets/images/gallery/rosaleda.jpg")}" alt="${esc(a.titulo)}"><div class="v27-card-body"><small>${esc(a.temporada||"")}</small><h3>${esc(a.titulo)}</h3></div></a>`).join("")||'<div class="v27-home-empty">Todavía no hay álbumes publicados.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudo cargar la galería desde Supabase.</div>'}}
async function matches(){const box=document.querySelector("#v27NextMatches");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando partidos…</div>';try{const p=await loadMatches();const rows=(p.matches||[]).filter(m=>m.date&&new Date(m.date).getTime()>=Date.now()-7200000).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);box.innerHTML=rows.map(m=>`<article class="v27-match"><span class="v10-eyebrow">${esc(m.competition||"Partido")}</span><h3>${esc(nextOpponent(m)||"Rival por confirmar")}</h3><div class="v27-match-teams"><span>${esc(m.home)}</span><small>VS</small><span>${esc(m.away)}</span></div><div class="v27-match-meta"><div>${esc(fmt(m.date))}</div><div>${esc(matchVenueLabel(m))}</div></div><a class="v27-home-link" href="calendario.html">Ver calendario →</a></article>`).join("")||'<div class="v27-home-empty">No hay próximos partidos configurados.</div>'}catch(e){box.innerHTML=`<div class="v27-home-empty">${esc(e.message)}</div>`}}
document.addEventListener("DOMContentLoaded",()=>{news();gallery();matches()});})();
(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function icsDate(value){const d=new Date(value);return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`}
  function escIcs(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
  async function downloadCalendar(){
    const button=document.getElementById('downloadMalagaCalendar'); if(!button)return;
    const old=button.textContent; button.disabled=true; button.textContent='Preparando calendario…';
    try{
      const configured=(window.FRENTE_MATCHES_CONFIG?.manualMatches||[]).map(normalizeMatch);
      const payload=await loadMatches(true);
      const overrides=payload.matches||[];
      const byFixture=new Map(configured.map(m=>[fixtureKey(m),m]));
      overrides.forEach(m=>byFixture.set(fixtureKey(m),m));
      const rows=[...byFixture.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
      const events=rows.map((m,i)=>{
        const start=new Date(m.date); const end=new Date(start.getTime()+2*60*60*1000);
        const provisional=m.timeConfirmed===false||m.confirmed===false;
        return ['BEGIN:VEVENT',`UID:malagacf-2627-${i+1}@frentecomepipas.es`,`DTSTAMP:${icsDate(new Date())}`,`DTSTART:${icsDate(start)}`,`DTEND:${icsDate(end)}`,`SUMMARY:${escIcs(`${m.home} - ${m.away}`)}`,`LOCATION:${escIcs(m.stadium||'Por confirmar')}`,`DESCRIPTION:${escIcs(`${m.competition||'LALIGA EA SPORTS'}${provisional?' · Fecha u horario provisional':''}`)}`,'END:VEVENT'].join('\r\n')
      }).join('\r\n');
      const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Frente Comepipas//Calendario Málaga CF 2026-27//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Málaga CF 2026/27',events,'END:VCALENDAR'].join('\r\n');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'})); a.download='calendario-malaga-cf-2026-27.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }catch(e){alert(`No se ha podido preparar el calendario: ${e.message||e}`)}finally{button.disabled=false;button.textContent=old}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('downloadMalagaCalendar');
    if(!button)return;
    button.textContent='Descargar calendario del Málaga CF';
    button.addEventListener('click',downloadCalendar);
  });
})();
