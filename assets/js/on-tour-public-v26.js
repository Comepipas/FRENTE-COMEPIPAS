(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time = value => value ? new Date(value).getTime() : NaN;
  function classify(trips, now = Date.now()) {
    const upcoming = [], past = [];
    for (const trip of trips) {
      if (trip.visible === false || !['abierto','cerrado','finalizado'].includes(trip.estado)) continue;
      (trip.estado === 'finalizado' || time(trip.fecha_salida) < now ? past : upcoming).push(trip);
    }
    upcoming.sort((a,b) => (time(a.fecha_salida) || Infinity) - (time(b.fecha_salida) || Infinity));
    past.sort((a,b) => (time(b.fecha_salida) || 0) - (time(a.fecha_salida) || 0));
    return {upcoming, past};
  }
  function canRequest(trip, now = Date.now()) {
    return trip.estado === 'abierto' && Number.isFinite(time(trip.fecha_salida)) && time(trip.fecha_salida) >= now &&
      (!trip.apertura || time(trip.apertura) <= now) && (!trip.cierre || time(trip.cierre) >= now);
  }
  window.FrenteOnTourPublic = {classify, canRequest};
  const date = value => Number.isFinite(time(value)) ? new Date(value).toLocaleString('es-ES', {dateStyle:'long',timeStyle:'short'}) : 'Fecha por confirmar';
  function safeImage(value) {
    try { const url = new URL(value || '', location.href); return value && ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    const box = document.querySelector('#publicTravels');
    if (!box) return;
    try {
      const {upcoming, past} = classify(await OnTourV25.trips(false));
      box.innerHTML = upcoming.length ? upcoming.map(trip => {
        const photo = safeImage(trip.imagen_url);
        const open = canRequest(trip);
        return `<article class="on-tour-card">${photo ? `<div class="on-tour-card-cover"><img src="${esc(photo)}" alt="${esc(trip.estadio || trip.titulo)}" loading="lazy"></div>` : ''}<div class="on-tour-card-body"><span class="on-tour-badge">${open ? 'Solicitudes abiertas' : 'Solicitudes no disponibles'}</span><h3>${esc(trip.titulo)}</h3><div class="on-tour-destination"><strong>${esc(trip.estadio || trip.destino || 'Destino por confirmar')}</strong><span>${esc(trip.ciudad || '')}</span></div><p>${esc(date(trip.fecha_salida))}</p><p>${esc(trip.descripcion || '')}</p>${open ? `<a class="btn btn-primary on-tour-request-cta" href="area-socio.html?on_tour=${encodeURIComponent(trip.id)}#trips">Solicitar entradas</a><p class="privacy-note">La solicitud no garantiza la entrada. La directiva comunicará la adjudicación.</p>` : '<p>Este desplazamiento no admite solicitudes en este momento.</p>'}</div></article>`;
      }).join('') : '<section class="on-tour-empty" role="status"><h2>No hay próximos desplazamientos ON TOUR</h2><p>Cuando abramos uno nuevo, podrás consultarlo y solicitar tus entradas aquí.</p></section>';
      if (upcoming.length && !upcoming.some(trip => canRequest(trip))) box.insertAdjacentHTML('afterbegin', '<p class="on-tour-list-message" role="status">Actualmente no hay ningún ON TOUR con solicitudes abiertas.</p>');
      if (past.length) {
        const history = document.createElement('section');
        history.className = 'section on-tour-history';
        history.innerHTML = `<div class="container"><details><summary>Desplazamientos realizados (${past.length})</summary><ul>${past.map(trip => `<li><strong>${esc(trip.titulo)}</strong><span>${esc(trip.estadio || trip.destino || '')}</span><time>${esc(date(trip.fecha_salida))}</time></li>`).join('')}</ul></details></div>`;
        document.querySelector('.on-tour-page').appendChild(history);
      }
    } catch (_) {
      box.innerHTML = '<p role="alert">No se pudieron cargar los desplazamientos. Recarga la página para intentarlo de nuevo.</p>';
    }
  });
})();
