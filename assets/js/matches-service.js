const MATCHES_CACHE_KEY="frente_matches_cache_v12";
function getMatchesConfig(){return window.FRENTE_MATCHES_CONFIG||{mode:"manual",manualMatches:[]}}
function readMatchesCache(){try{return JSON.parse(localStorage.getItem(MATCHES_CACHE_KEY))}catch{return null}}
function saveMatchesCache(v){localStorage.setItem(MATCHES_CACHE_KEY,JSON.stringify(v))}
function normalizeMatch(m,i=0){return{id:m.id||`match-${i}`,competition:m.competition||m.competicion||"Partido",home:m.home||m.local||"",away:m.away||m.visitante||"",date:m.date||m.fecha||m.fecha_partido||"",stadium:m.stadium||m.estadio||"",status:m.status||m.estado||"Programado",confirmed:m.confirmed??m.confirmado??true,timeConfirmed:m.timeConfirmed??m.horario_confirmado??m.confirmed??m.confirmado??true,source:m.source||m.fuente||"Calendario de la Peña"}}
function normalizeDbMatch(m,i=0){
  const title=String(m.titulo||''); const rival=m.rival||title.replace(/^.*?·\s*/, '').trim()||'Rival por confirmar';
  const local=String(m.local_visitante||m.condicion||'').toLowerCase();
  const isHome=local==='local'||local==='casa'||/málaga\s*cf\s*(vs|v|-)/i.test(title);
  return normalizeMatch({id:m.id,competition:m.competicion||'Partido',home:isHome?'Málaga CF':rival,away:isHome?rival:'Málaga CF',date:m.fecha_partido,stadium:m.estadio,status:m.estado,confirmed:true,source:'Partidos administrados'},i);
}
function fixtureName(value){
  const name=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases={atleti:'atleticodemadrid',atleticomadrid:'atleticodemadrid',malaga:'malagacf'};
  return aliases[name]||name;
}
function fixtureKey(m){
  const names=[fixtureName(m.home),fixtureName(m.away)].sort();
  return names.join('|');
}
function manualMatches(){
  const configured=(getMatchesConfig().manualMatches||[]).map(normalizeMatch);
  let saved=[];
  try{saved=(JSON.parse(localStorage.getItem("frente_matches_manual_v11"))||[]).map(normalizeMatch)}catch{}
  // El calendario completo configurado nunca desaparece por tener datos antiguos en localStorage.
  // Los partidos editados manualmente sustituyen su mismo enfrentamiento.
  const byFixture=new Map(configured.map(m=>[fixtureKey(m),m]));
  saved.forEach(m=>byFixture.set(fixtureKey(m),m));
  return [...byFixture.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
}
async function fetchSupabaseMatches(){
  if(!window.FrenteSupabase?.init) return [];
  const db=(await window.FrenteSupabase.init()).client;
  const {data,error}=await db.from('ticket_matches').select('id,titulo,rival,competicion,fecha_partido,estadio,estado,local_visitante').order('fecha_partido',{ascending:true});
  if(error)throw error; return (data||[]).map(normalizeDbMatch);
}
async function fetchRemoteMatches(){const c=getMatchesConfig();if(!c.remoteUrl)throw new Error("No hay URL remota configurada");const r=await fetch(c.remoteUrl,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();return (Array.isArray(d)?d:(d.matches||d.partidos||[])).map(normalizeMatch)}
async function loadMatches(force=false){
  const c=getMatchesConfig(),cache=readMatchesCache(),ttl=Number(c.refreshMinutes||15)*60000;
  if(!force&&cache?.updatedAt&&Date.now()-new Date(cache.updatedAt).getTime()<ttl&&Array.isArray(cache.matches)&&cache.matches.length>1)return cache;
  try{const shared=await fetchSupabaseMatches();if(shared.length){
    const fallback=manualMatches();
    // Se agrupa por enfrentamiento, no por fecha, para evitar duplicados cuando
    // el administrador corrige día u hora de un partido ya presente en el calendario base.
    const byKey=new Map(fallback.map(m=>[fixtureKey(m),m]));
    shared.forEach(m=>{const previous=byKey.get(fixtureKey(m))||{};byKey.set(fixtureKey(m),{...previous,...m,stadium:m.stadium||previous.stadium||'',timeConfirmed:m.timeConfirmed??previous.timeConfirmed??true})});
    const merged=[...byKey.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const p={matches:merged,updatedAt:new Date().toISOString(),mode:'supabase+calendar',error:null};saveMatchesCache(p);return p
  }}catch(e){console.warn('[38.5.2] Calendario compartido no disponible:',e.message||e)}
  if(c.mode==="remote"){try{const p={matches:await fetchRemoteMatches(),updatedAt:new Date().toISOString(),mode:"remote",error:null};saveMatchesCache(p);return p}catch(e){const p={matches:manualMatches(),updatedAt:new Date().toISOString(),mode:"manual-fallback",error:e.message};saveMatchesCache(p);return p}}
  const p={matches:manualMatches(),updatedAt:new Date().toISOString(),mode:"manual",error:null};saveMatchesCache(p);return p;
}
function isTeam(n){return (getMatchesConfig().teamAliases||[]).some(a=>String(a).toLowerCase()===String(n||"").toLowerCase())}
function getNextMatch(rows){const now=Date.now();return (rows||[]).filter(m=>m.date&&new Date(m.date).getTime()>=now-7200000).sort((a,b)=>new Date(a.date)-new Date(b.date))[0]||null}
function nextOpponent(m){return !m?"":isTeam(m.home)?m.away:m.home}
function matchVenueLabel(m){return !m?"":isTeam(m.home)?`Local · ${m.stadium||"Estadio por confirmar"}`:`Visitante · ${m.stadium||"Estadio por confirmar"}`}
