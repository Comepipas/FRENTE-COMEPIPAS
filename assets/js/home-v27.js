(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const img=v=>{v=String(v||"").trim();if(!v)return"assets/images/news/temporada.jpg";return /^(https?:|data:|\/)/i.test(v)?v:`assets/images/news/${v}`};
const fmt=v=>v?new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"Fecha por confirmar";
async function news(){const box=document.querySelector("#v10NewsGrid");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando noticias…</div>';try{const db=(await FrenteSupabase.init()).client;const {data,error}=await db.from("news").select("id,titulo,categoria,fecha,imagen,resumen,destacada,created_at").order("destacada",{ascending:false}).order("fecha",{ascending:false}).limit(3);if(error)throw error;box.innerHTML=(data||[]).map(n=>`<article class="v27-news-card"><img src="${esc(img(n.imagen))}" alt="${esc(n.titulo)}"><div class="v27-card-body"><span class="v10-eyebrow">${esc(n.categoria)}</span><h3>${esc(n.titulo)}</h3><p>${esc(n.resumen||"")}</p><a class="v27-home-link" href="noticia.html?id=${encodeURIComponent(n.id)}">Leer noticia →</a></div></article>`).join("")||'<div class="v27-home-empty">Todavía no hay noticias publicadas.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudieron cargar las noticias desde Supabase.</div>'}}
async function gallery(){const box=document.querySelector("#v10Gallery");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando galería…</div>';try{const rows=(await GalleryV26.albums(false)).slice(0,6);box.innerHTML=rows.map(a=>`<a class="v27-gallery-card" href="album.html?album=${encodeURIComponent(a.slug)}"><img src="${esc(a.portada_url||"assets/images/gallery/rosaleda.jpg")}" alt="${esc(a.titulo)}"><div class="v27-card-body"><small>${esc(a.temporada||"")}</small><h3>${esc(a.titulo)}</h3></div></a>`).join("")||'<div class="v27-home-empty">Todavía no hay álbumes publicados.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudo cargar la galería desde Supabase.</div>'}}
const TEAM_MEDIA={
  "Málaga CF":{logo:"https://upload.wikimedia.org/wikipedia/en/6/6e/M%C3%A1laga_CF_logo.svg"},
  "Atlético de Madrid":{logo:"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg"},
  "RC Deportivo":{logo:"https://upload.wikimedia.org/wikipedia/en/4/4e/Deportivo_La_Coruna_logo.svg"},
  "Real Madrid":{logo:"https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"}
};
const STADIUM_MEDIA={
  "Riyadh Air Metropolitano":"https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Wanda_Metropolitano_2018.jpg/1280px-Wanda_Metropolitano_2018.jpg",
  "La Rosaleda":"assets/images/gallery/rosaleda.jpg",
  "Santiago Bernabéu":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Estadio_Santiago_Bernab%C3%A9u_2024.jpg/1280px-Estadio_Santiago_Bernab%C3%A9u_2024.jpg"
};
function logoFor(team){return TEAM_MEDIA[team]?.logo||"assets/images/brand/escudo-transparente.png"}
function stadiumFor(stadium,isHome){return STADIUM_MEDIA[stadium]||(isHome?"assets/images/gallery/rosaleda.jpg":"assets/images/home/viajes.jpg")}
function teamLine(team){return `<div class="v27-team-line"><img src="${esc(logoFor(team))}" alt="Escudo de ${esc(team)}" onerror="this.src='assets/images/brand/escudo-transparente.png'"><span>${esc(team)}</span></div>`}
async function matches(){
  const box=document.querySelector("#v27NextMatches");if(!box)return;
  box.innerHTML='<div class="v27-loading">Cargando partidos…</div>';
  try{
    // La portada utiliza el calendario oficial base para evitar registros antiguos o
    // incompletos guardados en Supabase. El panel de calendario sigue siendo editable.
    const rows=manualMatches().filter(m=>m.date&&new Date(m.date).getTime()>=Date.now()-7200000).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);
    box.innerHTML=rows.map(m=>{
      const home=isTeam(m.home); const bg=stadiumFor(m.stadium,home);
      return `<article class="v27-match"><img class="v27-match-stadium" src="${esc(bg)}" alt="${esc(m.stadium||'Estadio')}" onerror="this.src='${home?'assets/images/gallery/rosaleda.jpg':'assets/images/home/viajes.jpg'}'"><div class="v27-match-content"><span class="v10-eyebrow">${esc(m.competition||"Partido")}</span><h3>${esc(nextOpponent(m)||"Rival por confirmar")}</h3><div class="v27-match-teams">${teamLine(m.home)}<small class="v27-vs">VS</small>${teamLine(m.away)}</div><div class="v27-match-meta"><div>${esc(fmt(m.date))}</div><div>${esc(matchVenueLabel(m))}</div></div><a class="v27-home-link" href="calendario.html">Ver calendario →</a></div></article>`
    }).join("")||'<div class="v27-home-empty">No hay próximos partidos configurados.</div>'
  }catch(e){box.innerHTML=`<div class="v27-home-empty">${esc(e.message)}</div>`}
}
document.addEventListener("DOMContentLoaded",()=>{news();gallery();matches()});})();
(function(){
  function wrap(ctx,text,x,y,maxWidth,lineHeight){const words=String(text).split(' ');let line='',yy=y;for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,yy);line=word;yy+=lineHeight}else line=test}if(line)ctx.fillText(line,x,yy);return yy}
  function formatDate(m){const d=new Date(m.date);const date=new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(d);return m.timeConfirmed===false?date+' · horario por confirmar':date+' · '+new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(d)}
  async function downloadCalendarImage(){
    const button=document.getElementById('downloadMalagaCalendar');if(!button)return;const old=button.textContent;button.disabled=true;button.textContent='Preparando imagen…';
    try{
      const rows=manualMatches();const width=1600,pad=76,rowH=82,height=250+rows.length*rowH+100;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
      c.fillStyle='#f4f8fb';c.fillRect(0,0,width,height);c.fillStyle='#003b70';c.fillRect(0,0,width,190);
      c.fillStyle='#fff';c.font='900 54px Montserrat, sans-serif';c.fillText('CALENDARIO MÁLAGA CF 2026/27',pad,82);c.font='700 24px Montserrat, sans-serif';c.fillText('Frente Comepipas · Fechas y horarios oficiales cuando estén confirmados',pad,132);
      c.font='800 21px Montserrat, sans-serif';
      rows.forEach((m,i)=>{const y=220+i*rowH;c.fillStyle=i%2?'#ffffff':'#eaf3f9';c.fillRect(55,y-28,width-110,rowH-6);c.fillStyle='#0068a8';c.fillText(String(i+1).padStart(2,'0'),pad,y+12);c.fillStyle='#10213b';c.font='900 22px Montserrat, sans-serif';c.fillText(`${m.home}  —  ${m.away}`,pad+70,y+12);c.font='600 18px Montserrat, sans-serif';c.fillStyle='#526579';c.fillText(formatDate(m),850,y+10);c.fillText(m.stadium||'Estadio por confirmar',1230,y+10);c.font='800 21px Montserrat, sans-serif'});
      c.fillStyle='#003b70';c.font='700 17px Montserrat, sans-serif';c.fillText('Los horarios marcados como pendientes pueden cambiar cuando LALIGA los confirme.',pad,height-45);
      const a=document.createElement('a');a.download='calendario-malaga-cf-2026-27.png';a.href=canvas.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
    }catch(e){alert(`No se ha podido preparar la imagen: ${e.message||e}`)}finally{button.disabled=false;button.textContent=old}
  }
  document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('downloadMalagaCalendar');if(b)b.addEventListener('click',downloadCalendarImage)});
})();
