
const TRIPS_ADMIN_KEY = "frente_admin_trips_v1";
const BOOKINGS_KEY = "frente_trip_bookings_v1";
const MEMBERS_KEY = "frente_members_db_v2";

function readJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) || fallback || []; }
  catch { return fallback || []; }
}
function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function getTripsAdmin(){ return readJSON(TRIPS_ADMIN_KEY, window.FRENTE_TRIPS); }
function getBookings(){ return readJSON(BOOKINGS_KEY, window.FRENTE_TRIP_BOOKINGS); }
function getMembersAdmin(){ return readJSON(MEMBERS_KEY, window.FRENTE_MEMBERS_DB); }

function euro(v){
  return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
}
function bookingSlug(){ return "RES-" + Date.now(); }

function tripById(id){ return getTripsAdmin().find(t=>t.id===id); }
function bookedSeats(tripId){
  return getBookings()
    .filter(b=>b.viajeId===tripId && !["Cancelada","Lista de espera"].includes(b.estado))
    .reduce((sum,b)=>sum+Number(b.plazas||0),0);
}
function waitingSeats(tripId){
  return getBookings()
    .filter(b=>b.viajeId===tripId && b.estado==="Lista de espera")
    .reduce((sum,b)=>sum+Number(b.plazas||0),0);
}
function availableSeats(trip){
  return Math.max(0, Number(trip.plazas||0)-bookedSeats(trip.id));
}

function renderTripStats(){
  const trips=getTripsAdmin(),bookings=getBookings();
  const totalSeats=trips.reduce((s,t)=>s+Number(t.plazas||0),0);
  const occupied=bookings.filter(b=>!["Cancelada","Lista de espera"].includes(b.estado)).reduce((s,b)=>s+Number(b.plazas||0),0);
  const pendingPayments=bookings.filter(b=>b.pago==="Pendiente" && b.estado!=="Cancelada").length;
  const income=bookings.filter(b=>b.pago==="Pagado" && b.estado!=="Cancelada").reduce((s,b)=>s+Number(b.importe||0),0);

  document.getElementById("tripCount").textContent=trips.length;
  document.getElementById("tripOccupied").textContent=`${occupied}/${totalSeats}`;
  document.getElementById("tripPendingPayments").textContent=pendingPayments;
  document.getElementById("tripIncome").textContent=euro(income);
}

function renderTripsAdmin(){
  const body=document.getElementById("tripsAdminBody");
  if(!body)return;
  const search=(document.getElementById("tripSearch")?.value||"").toLowerCase();

  const trips=getTripsAdmin().filter(t=>`${t.destino} ${t.fecha}`.toLowerCase().includes(search));
  body.innerHTML=trips.length?trips.map(t=>{
    const occupied=bookedSeats(t.id),available=availableSeats(t),waiting=waitingSeats(t.id);
    return `<tr>
      <td><strong>${t.destino}</strong><br><small>${t.fecha} · ${t.salida}</small></td>
      <td>${euro(t.precio)}</td>
      <td>${t.plazas}</td>
      <td>${occupied}</td>
      <td>${available}</td>
      <td>${waiting}</td>
      <td class="members-actions-cell">
        <button data-view-trip="${t.id}">Pasajeros</button>
        <button data-edit-trip="${t.id}">Editar</button>
        <button class="danger" data-delete-trip="${t.id}">Eliminar</button>
      </td>
    </tr>`;
  }).join(""):'<tr><td colspan="7" class="members-empty">No hay viajes.</td></tr>';

  body.querySelectorAll("[data-view-trip]").forEach(b=>b.onclick=()=>openPassengers(b.dataset.viewTrip));
  body.querySelectorAll("[data-edit-trip]").forEach(b=>b.onclick=()=>openTripForm(b.dataset.editTrip));
  body.querySelectorAll("[data-delete-trip]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar este viaje y sus reservas?")){
      writeJSON(TRIPS_ADMIN_KEY,getTripsAdmin().filter(t=>t.id!==b.dataset.deleteTrip));
      writeJSON(BOOKINGS_KEY,getBookings().filter(x=>x.viajeId!==b.dataset.deleteTrip));
      renderAll();
    }
  });
}

function renderBookings(){
  const body=document.getElementById("bookingsBody");
  if(!body)return;
  const search=(document.getElementById("bookingSearch")?.value||"").toLowerCase();
  const status=document.getElementById("bookingStatus")?.value||"Todos";
  const payment=document.getElementById("bookingPayment")?.value||"Todos";

  const rows=getBookings().filter(b=>{
    const trip=tripById(b.viajeId);
    const hay=`${b.id} ${b.nombre} ${b.email} ${trip?.destino||""}`.toLowerCase();
    return hay.includes(search)
      && (status==="Todos"||b.estado===status)
      && (payment==="Todos"||b.pago===payment);
  });

  body.innerHTML=rows.length?rows.map(b=>{
    const trip=tripById(b.viajeId);
    return `<tr>
      <td>${b.id}</td>
      <td><strong>${b.nombre}</strong><br><small>${b.email}</small></td>
      <td>${trip?.destino||"Viaje eliminado"}</td>
      <td>${b.plazas}</td>
      <td><span class="status-pill ${b.estado==="Confirmada"?"fee-ok":"fee-pending"}">${b.estado}</span></td>
      <td><span class="status-pill ${b.pago==="Pagado"?"fee-ok":"fee-pending"}">${b.pago}</span></td>
      <td>${euro(b.importe)}</td>
      <td class="members-actions-cell">
        <button data-edit-booking="${b.id}">Editar</button>
        ${b.pago!=="Pagado"?`<button data-pay-booking="${b.id}">Cobrar</button>`:""}
        <button class="danger" data-cancel-booking="${b.id}">Cancelar</button>
      </td>
    </tr>`;
  }).join(""):'<tr><td colspan="8" class="members-empty">No hay reservas.</td></tr>';

  body.querySelectorAll("[data-edit-booking]").forEach(b=>b.onclick=()=>openBookingForm(b.dataset.editBooking));
  body.querySelectorAll("[data-pay-booking]").forEach(b=>b.onclick=()=>markPaid(b.dataset.payBooking));
  body.querySelectorAll("[data-cancel-booking]").forEach(b=>b.onclick=()=>{
    writeJSON(BOOKINGS_KEY,getBookings().map(x=>x.id===b.dataset.cancelBooking?{...x,estado:"Cancelada"}:x));
    renderAll();
  });
}

function renderAll(){
  renderTripStats();
  renderTripsAdmin();
  renderBookings();
}

function openTripForm(id=""){
  const form=document.getElementById("tripAdminForm");
  form.reset(); form.elements.id.value="";
  document.getElementById("tripAdminModalTitle").textContent=id?"Editar viaje":"Nuevo viaje";
  if(id){
    const trip=tripById(id);
    Object.entries(trip||{}).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v??""});
  }
  document.getElementById("tripAdminModal").classList.add("open");
}

function openBookingForm(id=""){
  const form=document.getElementById("bookingForm");
  form.reset(); form.elements.id.value="";
  const trips=getTripsAdmin(),members=getMembersAdmin().filter(m=>m.estado!=="Baja");
  form.elements.viajeId.innerHTML=trips.map(t=>`<option value="${t.id}">${t.destino} · ${t.fecha}</option>`).join("");
  form.elements.socioId.innerHTML='<option value="">Sin vincular</option>'+members.map(m=>`<option value="${m.id}">${m.numero} · ${m.nombre}</option>`).join("");
  document.getElementById("bookingModalTitle").textContent=id?"Editar reserva":"Nueva reserva";

  if(id){
    const b=getBookings().find(x=>x.id===id);
    Object.entries(b||{}).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v??""});
  }else{
    form.elements.plazas.value=1;
    form.elements.estado.value="Pendiente";
    form.elements.pago.value="Pendiente";
    form.elements.fechaReserva.value=new Date().toISOString().slice(0,10);
  }
  document.getElementById("bookingModal").classList.add("open");
}

function openPassengers(tripId){
  const trip=tripById(tripId),body=document.getElementById("passengersBody");
  const rows=getBookings().filter(b=>b.viajeId===tripId && b.estado!=="Cancelada");
  document.getElementById("passengersTitle").textContent=`Pasajeros · ${trip?.destino||""}`;
  body.innerHTML=rows.length?rows.map(b=>`<div class="passenger-row"><div><strong>${b.nombre}</strong><span>${b.telefono||""} · ${b.plazas} plaza(s)</span></div><div><span>${b.estado}</span><b>${b.pago}</b></div></div>`).join(""):'<p class="admin-empty">No hay pasajeros.</p>';
  document.getElementById("passengersModal").classList.add("open");
}

function markPaid(id){
  writeJSON(BOOKINGS_KEY,getBookings().map(b=>b.id===id?{...b,pago:"Pagado",metodoPago:b.metodoPago||"Efectivo"}:b));
  renderAll();
}

function exportBookings(){
  const headers=["id","viaje","nombre","email","telefono","plazas","estado","pago","metodoPago","importe","fechaReserva","observaciones"];
  const rows=[headers.join(",")];
  getBookings().forEach(b=>{
    const t=tripById(b.viajeId);
    const vals=[b.id,t?.destino||"",b.nombre,b.email,b.telefono,b.plazas,b.estado,b.pago,b.metodoPago,b.importe,b.fechaReserva,b.observaciones];
    rows.push(vals.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","));
  });
  const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="reservas-viajes-frente-comepipas.csv";a.click();URL.revokeObjectURL(url);
}

function importBookings(file){
  const reader=new FileReader();
  reader.onload=()=>{
    const lines=String(reader.result).split(/\r?\n/).filter(Boolean);
    if(lines.length<2)return;
    const headers=lines[0].split(",").map(h=>h.replace(/^"|"$/g,""));
    const imported=lines.slice(1).map(line=>{
      const values=line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)||[];
      const obj={};
      headers.forEach((h,i)=>obj[h]=String(values[i]||"").replace(/^"|"$/g,"").replace(/""/g,'"'));
      const trip=getTripsAdmin().find(t=>t.destino===obj.viaje);
      return {
        id:obj.id||bookingSlug(),viajeId:trip?.id||"",nombre:obj.nombre,email:obj.email,telefono:obj.telefono,
        plazas:Number(obj.plazas||1),estado:obj.estado||"Pendiente",pago:obj.pago||"Pendiente",
        metodoPago:obj.metodoPago||"",importe:Number(obj.importe||0),fechaReserva:obj.fechaReserva||"",observaciones:obj.observaciones||""
      };
    }).filter(x=>x.viajeId);
    writeJSON(BOOKINGS_KEY,[...getBookings(),...imported]);
    renderAll();
  };
  reader.readAsText(file,"utf-8");
}

document.addEventListener("DOMContentLoaded",()=>{
  renderAll();
  document.getElementById("tripSearch")?.addEventListener("input",renderTripsAdmin);
  document.getElementById("bookingSearch")?.addEventListener("input",renderBookings);
  document.getElementById("bookingStatus")?.addEventListener("change",renderBookings);
  document.getElementById("bookingPayment")?.addEventListener("change",renderBookings);
  document.getElementById("newTripButton")?.addEventListener("click",()=>openTripForm());
  document.getElementById("newBookingButton")?.addEventListener("click",()=>openBookingForm());
  document.getElementById("exportBookings")?.addEventListener("click",exportBookings);
  document.getElementById("importBookings")?.addEventListener("change",e=>e.target.files[0]&&importBookings(e.target.files[0]));

  document.getElementById("tripAdminForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.currentTarget).entries()),trips=getTripsAdmin();
    d.precio=Number(d.precio||0);d.plazas=Number(d.plazas||0);d.disponibles=d.plazas;
    if(d.id)writeJSON(TRIPS_ADMIN_KEY,trips.map(t=>t.id===d.id?{...t,...d}:t));
    else{d.id="viaje-"+Date.now();writeJSON(TRIPS_ADMIN_KEY,[...trips,d])}
    document.getElementById("tripAdminModal").classList.remove("open");renderAll();
  });

  document.getElementById("bookingForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.currentTarget).entries()),bookings=getBookings(),trip=tripById(d.viajeId);
    d.plazas=Number(d.plazas||1);
    if(d.socioId){
      const member=getMembersAdmin().find(m=>m.id===d.socioId);
      if(member){d.nombre=member.nombre;d.email=member.email;d.telefono=member.telefono}
    }
    d.importe=Number(trip?.precio||0)*d.plazas;
    const available=availableSeats(trip)+(d.id?(bookings.find(b=>b.id===d.id)?.plazas||0):0);
    if(d.plazas>available && d.estado!=="Lista de espera")d.estado="Lista de espera";
    if(d.id)writeJSON(BOOKINGS_KEY,bookings.map(b=>b.id===d.id?{...b,...d}:b));
    else{d.id=bookingSlug();writeJSON(BOOKINGS_KEY,[...bookings,d])}
    document.getElementById("bookingModal").classList.remove("open");renderAll();
  });

  document.querySelectorAll(".store-modal-close").forEach(b=>b.onclick=()=>b.closest(".store-modal").classList.remove("open"));
  document.querySelectorAll(".store-modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
});
