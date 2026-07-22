const TRIPS = (()=>{try{return JSON.parse(localStorage.getItem("frente_admin_trips_v1")) || window.FRENTE_TRIPS || [];}catch{return window.FRENTE_TRIPS || [];}})();
const RESERVATIONS_KEY = "frente_comepipas_trip_reservations_v1";

function getReservations(){
  try { return JSON.parse(localStorage.getItem(RESERVATIONS_KEY)) || []; }
  catch { return []; }
}

function saveReservations(data){
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(data));
  renderTrips();
  renderReservations();
}

function formatDate(value){
  const date = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-ES",{
    day:"2-digit",month:"long",year:"numeric"
  }).format(date);
}

function money(value){
  return new Intl.NumberFormat("es-ES",{
    style:"currency",currency:"EUR"
  }).format(value);
}

function reserveTrip(id){
  const reservations = getReservations();
  if(reservations.includes(id)){
    alert("Ya tienes una reserva para este viaje.");
    return;
  }

  const trip = TRIPS.find(item => item.id === id);
  if(!trip || getAvailable(trip) <= 0){
    alert("No quedan plazas disponibles.");
    return;
  }

  reservations.push(id);
  saveReservations(reservations);
}

function cancelTrip(id){
  saveReservations(getReservations().filter(item => item !== id));
}

function getAvailable(trip){
  const reserved = getReservations().includes(trip.id) ? 1 : 0;
  return Math.max(0, trip.disponibles - reserved);
}

function renderTrips(){
  const grid = document.getElementById("tripsGrid");
  if(!grid) return;

  const reservations = getReservations();

  grid.innerHTML = TRIPS.map(trip=>{
    const reserved = reservations.includes(trip.id);
    const available = getAvailable(trip);
    return `
      <article class="travel-card">
        <img src="assets/images/cards/${trip.imagen}" alt="Viaje a ${trip.destino}">
        <div class="travel-card-body">
          <span class="tag">${formatDate(trip.fecha)}</span>
          <h3>${trip.destino}</h3>
          <p>${trip.descripcion}</p>

          <div class="travel-details">
            <span><b>Salida:</b> ${trip.salida}</span>
            <span><b>Precio:</b> ${money(trip.precio)}</span>
            <span><b>Plazas:</b> ${available} disponibles</span>
          </div>

          <div class="travel-progress">
            <span style="width:${Math.min(100,((trip.plazas-available)/trip.plazas)*100)}%"></span>
          </div>

          ${
            reserved
            ? `<button class="btn btn-dark-outline cancel-trip" data-id="${trip.id}">Cancelar reserva</button>`
            : `<button class="btn btn-primary reserve-trip" data-id="${trip.id}" ${available===0?"disabled":""}>
                 ${available===0?"Completo":"Reservar plaza"}
               </button>`
          }
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".reserve-trip").forEach(button=>{
    button.addEventListener("click",()=>reserveTrip(button.dataset.id));
  });

  grid.querySelectorAll(".cancel-trip").forEach(button=>{
    button.addEventListener("click",()=>cancelTrip(button.dataset.id));
  });
}

function renderReservations(){
  const box = document.getElementById("myReservations");
  if(!box) return;

  const reservations = getReservations()
    .map(id=>TRIPS.find(trip=>trip.id===id))
    .filter(Boolean);

  if(!reservations.length){
    box.innerHTML = '<div class="travel-empty">Todavía no tienes viajes reservados.</div>';
    return;
  }

  box.innerHTML = reservations.map(trip=>`
    <div class="reservation-row">
      <div>
        <strong>${trip.destino}</strong>
        <span>${formatDate(trip.fecha)} · ${trip.salida}</span>
      </div>
      <div>
        <b>${money(trip.precio)}</b>
        <button class="cancel-mini" data-id="${trip.id}">Cancelar</button>
      </div>
    </div>
  `).join("");

  box.querySelectorAll(".cancel-mini").forEach(button=>{
    button.addEventListener("click",()=>cancelTrip(button.dataset.id));
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  renderTrips();
  renderReservations();
});
