(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#fc408ContactForm');
    if (!form) return;
    const status = document.querySelector('#fc408ContactStatus');
    const button = form.querySelector('button[type=submit]');
    let sending = false, pending = null;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      const fd = new FormData(form);
      const payload = Object.fromEntries(['nombre','email','telefono','asunto','mensaje'].map(key => [key,String(fd.get(key)||'').trim()]));
      payload.privacidad_aceptada = fd.get('privacidad_aceptada') === 'on';
      const limits = {nombre:[3,160],email:[5,254],telefono:[6,30],mensaje:[10,4000]};
      for (const [key,[min,max]] of Object.entries(limits)) {
        if (payload[key].length < min || payload[key].length > max) {
          status.textContent = `Revisa el campo ${key}: debe tener entre ${min} y ${max} caracteres.`;
          form.elements.namedItem(key)?.focus();
          return;
        }
      }
      const fingerprint = JSON.stringify(payload);
      if (!pending || pending.fingerprint !== fingerprint) pending = {fingerprint,id:crypto.randomUUID()};
      const requestId = pending.id;
      sending = true; button.disabled = true; form.setAttribute('aria-busy','true');
      status.textContent = 'Guardando tu solicitud…';
      try {
        const c = (await window.FrenteSupabase.init()).client;
        // Public INSERT is allowed; requesting the row back would require private SELECT access.
        const result = await c.from('contact_requests').insert({...payload,id:requestId,user_agent:navigator.userAgent});
        if (result.error) {
          if (result.error.code === '23505') {
            status.textContent = `Esta referencia ya existe. No hemos creado otra solicitud. Consulta con la Peña para comprobarla: ${requestId}`;
            return;
          }
          throw result.error;
        }
        form.reset(); pending = null;
        let notified = false;
        try {
          const response = await c.functions.invoke('send-request-notification',{body:{tipo:'alta',request_id:requestId}});
          notified = !response.error && response.data?.ok === true;
        } catch (_) { /* The request has already been saved. Do not submit it again. */ }
        status.textContent = notified
          ? `Solicitud guardada y aviso enviado a la Peña. Referencia: ${requestId}`
          : `Tu solicitud está guardada, pero no se pudo confirmar el aviso por correo. No necesitas enviarla otra vez. Referencia: ${requestId}`;
      } catch (_) {
        status.textContent = `No hemos podido confirmar el guardado. Conservamos tus datos para reintentar. Si el problema continúa, contacta con la Peña indicando la referencia ${requestId}.`;
      } finally {
        sending = false; button.disabled = false; form.removeAttribute('aria-busy');
      }
    });
  });
})();
