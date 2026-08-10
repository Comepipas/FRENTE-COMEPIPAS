
const FRENTE_AGENDA_KEY="frente_agenda_v106";

function getAgendaData(){
  try{
    return JSON.parse(localStorage.getItem(FRENTE_AGENDA_KEY))
      || window.FRENTE_AGENDA_DEFAULTS
      || {events:[],notices:[]};
  }catch{
    return window.FRENTE_AGENDA_DEFAULTS || {events:[],notices:[]};
  }
}

function saveAgendaData(data){
  localStorage.setItem(FRENTE_AGENDA_KEY,JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("frente:agenda-updated",{detail:data}));
}

function agendaDate(value,withTime=false){
  if(!value)return "-";
  const date=new Date(value+(value.length===10?"T12:00:00":""));
  return new Intl.DateTimeFormat("es-ES",withTime
    ? {dateStyle:"medium",timeStyle:"short"}
    : {day:"2-digit",month:"short",year:"numeric"}).format(date);
}

function agendaSlug(value){
  return String(value||"").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function activeAgendaNotices(target){
  const today=new Date().toISOString().slice(0,10);
  return (getAgendaData().notices||[]).filter(n=>
    n.activo!==false &&
    (!n.fechaInicio||n.fechaInicio<=today) &&
    (!n.fechaFin||n.fechaFin>=today) &&
    (!target||n[target]===true)
  );
}
