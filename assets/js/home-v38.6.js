(()=>{"use strict";
const BUILD="38.6.1";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const img=v=>{v=String(v||"").trim();if(!v)return"assets/images/news/temporada.jpg";return /^(https?:|data:|\/)/i.test(v)?v:`assets/images/news/${v}`};
const TEAM_LOGOS={
  "Málaga CF":"https://upload.wikimedia.org/wikipedia/en/6/6e/M%C3%A1laga_CF_logo.svg",
  "Atlético de Madrid":"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
  "RC Deportivo":"https://upload.wikimedia.org/wikipedia/en/4/4e/Deportivo_La_Coruna_logo.svg",
  "Real Madrid":"https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"
};
const LOCAL_TEAM_LOGOS={
  "Málaga CF":"assets/images/teams/malaga-cf.svg",
  "Atlético de Madrid":"assets/images/teams/atletico-de-madrid.svg",
  "RC Deportivo":"assets/images/teams/rc-deportivo.svg",
  "Real Madrid":"assets/images/teams/real-madrid.svg"
};
const STADIUM_IMAGES={
  "Riyadh Air Metropolitano":"https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Wanda_Metropolitano_2018.jpg/1280px-Wanda_Metropolitano_2018.jpg",
  "La Rosaleda":"https://upload.wikimedia.org/wikipedia/commons/7/71/Estadio_La_Rosaleda.jpg",
  "Santiago Bernabéu":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Estadio_Santiago_Bernab%C3%A9u_2024.jpg/1280px-Estadio_Santiago_Bernab%C3%A9u_2024.jpg"
};
const LOCAL_STADIUM_IMAGES={
  "Riyadh Air Metropolitano":"assets/images/stadiums/riyadh-air-metropolitano.jpg",
  "La Rosaleda":"assets/images/stadiums/la-rosaleda.jpg",
  "Santiago Bernabéu":"assets/images/stadiums/santiago-bernabeu.jpg"
};
const teamLogo=t=>TEAM_LOGOS[t]||`assets/images/teams/${slug(t)}.svg?v=${BUILD}`;
const localTeamLogo=t=>LOCAL_TEAM_LOGOS[t]||"assets/images/brand/escudo-transparente.png";
const stadiumImage=s=>STADIUM_IMAGES[s]||`assets/images/stadiums/${slug(s||"estadio")}.jpg?v=${BUILD}`;
const localStadiumImage=s=>LOCAL_STADIUM_IMAGES[s]||"assets/images/home/viajes.jpg";
const roundOf=m=>Number(String(m.competition||"").match(/jornada\s*(\d+)/i)?.[1]||999);
const fmt=m=>{if(!m?.date)return"Fecha por confirmar";const d=new Date(m.date);const base=new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"2-digit",month:"short"}).format(d);return m.timeConfirmed===false?`${base} · horario por confirmar`:`${base}, ${new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(d)}`};
function officialRows(){
  const rows=(window.FRENTE_MATCHES_CONFIG?.manualMatches||[]).map((m,i)=>({...m,_i:i}));
  return rows.sort((a,b)=>roundOf(a)-roundOf(b)||new Date(a.date)-new Date(b.date));
}
function nextRows(){
  const rows=officialRows(), now=Date.now();
  const future=rows.filter(m=>m.date&&new Date(m.date).getTime()>=now-6*60*60*1000);
  return (future.length?future:rows).slice(0,3);
}
function isMalaga(n){return /^(málaga|malaga)\s*cf$/i.test(String(n||"").trim())}
function opponent(m){return isMalaga(m.home)?m.away:m.home}
function venue(m){return isMalaga(m.home)?`Local · ${m.stadium||"La Rosaleda"}`:`Visitante · ${m.stadium||"Estadio por confirmar"}`}
function teamLine(team){return `<div class="v386-team"><span class="v386-crest"><img src="${esc(teamLogo(team))}" alt="Escudo de ${esc(team)}" loading="lazy" onerror="this.onerror=null;this.src='${esc(localTeamLogo(team))}'"></span><span>${esc(team)}</span></div>`}
async function news(){const box=document.querySelector("#v10NewsGrid");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando noticias…</div>';try{const db=(await FrenteSupabase.init()).client;const {data,error}=await db.from("news").select("id,titulo,categoria,fecha,imagen,resumen,destacada,created_at").order("destacada",{ascending:false}).order("fecha",{ascending:false}).limit(3);if(error)throw error;box.innerHTML=(data||[]).map(n=>`<article class="v27-news-card"><img src="${esc(img(n.imagen))}" alt="${esc(n.titulo)}"><div class="v27-card-body"><span class="v10-eyebrow">${esc(n.categoria)}</span><h3>${esc(n.titulo)}</h3><p>${esc(n.resumen||"")}</p><a class="v27-home-link" href="noticia.html?id=${encodeURIComponent(n.id)}">Leer noticia →</a></div></article>`).join("")||'<div class="v27-home-empty">Todavía no hay noticias publicadas.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudieron cargar las noticias.</div>'}}
async function gallery(){const box=document.querySelector("#v10Gallery");if(!box)return;box.innerHTML='<div class="v27-loading">Cargando galería…</div>';try{const rows=(await GalleryV26.albums(false)).slice(0,6);box.innerHTML=rows.map(a=>`<a class="v27-gallery-card" href="album.html?album=${encodeURIComponent(a.slug)}"><img src="${esc(a.portada_url||"assets/images/gallery/rosaleda.jpg")}" alt="${esc(a.titulo)}"><div class="v27-card-body"><small>${esc(a.temporada||"")}</small><h3>${esc(a.titulo)}</h3></div></a>`).join("")||'<div class="v27-home-empty">Todavía no hay álbumes publicados.</div>'}catch(e){console.error(e);box.innerHTML='<div class="v27-home-empty">No se pudo cargar la galería.</div>'}}
function renderMatches(){const box=document.querySelector("#v27NextMatches");if(!box)return;const rows=nextRows();box.innerHTML=rows.map(m=>`<article class="v386-match"><img class="v386-stadium" src="${esc(stadiumImage(m.stadium))}" alt="${esc(m.stadium||"Estadio")}" loading="lazy" onerror="this.onerror=null;this.src='${esc(localStadiumImage(m.stadium))}'"><div class="v386-shade"></div><div class="v386-content"><span class="v10-eyebrow">${esc(m.competition||"Partido")}</span><h3>${esc(opponent(m)||"Rival por confirmar")}</h3><div class="v386-teams">${teamLine(m.home)}<span class="v386-vs">VS</span>${teamLine(m.away)}</div><div class="v386-meta"><strong>${esc(fmt(m))}</strong><span>${esc(venue(m))}</span></div></div></article>`).join("")||'<div class="v27-home-empty">No hay partidos configurados.</div>'}
function canvasCalendar(){const rows=officialRows();const W=1500, cols=2, margin=70, gap=24, cardW=(W-margin*2-gap)/2, cardH=112, header=220, H=header+Math.ceil(rows.length/cols)*(cardH+14)+90;const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#eef5fa";x.fillRect(0,0,W,H);x.fillStyle="#003b70";x.fillRect(0,0,W,180);x.fillStyle="#fff";x.font="900 52px Arial";x.fillText("CALENDARIO COMPLETO MÁLAGA CF 2026/27",margin,78);x.font="700 23px Arial";x.fillText("38 jornadas · Casa y fuera · Horarios sujetos a confirmación oficial",margin,125);rows.forEach((m,i)=>{const col=i%2,row=Math.floor(i/2),px=margin+col*(cardW+gap),py=header+row*(cardH+14);x.fillStyle="#fff";x.fillRect(px,py,cardW,cardH);x.fillStyle="#0072b5";x.fillRect(px,py,86,cardH);x.fillStyle="#fff";x.font="900 20px Arial";x.textAlign="center";x.fillText(`J${roundOf(m)}`,px+43,py+64);x.textAlign="left";x.fillStyle="#10213b";x.font="900 21px Arial";x.fillText(`${m.home}  –  ${m.away}`,px+108,py+39);x.font="600 17px Arial";x.fillStyle="#526579";x.fillText(fmt(m),px+108,py+70);x.fillText(m.stadium||"Estadio por confirmar",px+108,py+94)});x.textAlign="left";x.fillStyle="#334a62";x.font="600 16px Arial";x.fillText("Frente Comepipas · La imagen se genera con los 38 partidos configurados en la web.",margin,H-36);return c.toDataURL("image/png")}
function openCalendar(){const modal=document.getElementById("v386CalendarModal"),image=document.getElementById("v386CalendarImage");if(!modal||!image)return;image.src=canvasCalendar();modal.hidden=false;document.body.classList.add("v386-modal-open");modal.querySelector("button")?.focus()}
function closeCalendar(){const modal=document.getElementById("v386CalendarModal");if(!modal)return;modal.hidden=true;document.body.classList.remove("v386-modal-open")}
document.addEventListener("DOMContentLoaded",()=>{try{["frente_matches_cache_v12","frente_matches_manual_v11"].forEach(k=>localStorage.removeItem(k))}catch{}news();gallery();renderMatches();document.getElementById("viewMalagaCalendar")?.addEventListener("click",openCalendar);document.querySelectorAll("[data-close-calendar]").forEach(b=>b.addEventListener("click",closeCalendar));document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCalendar()})});
})();
