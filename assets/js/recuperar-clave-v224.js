document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const requestForm = document.getElementById('requestRecoveryForm');
  const passwordForm = document.getElementById('setRecoveryPasswordForm');
  const message = document.getElementById('recoveryMessage');
  const title = document.getElementById('recoveryTitle');
  const intro = document.getElementById('recoveryIntro');
  const back = document.getElementById('recoveryBackLink');
  const requestButton = document.getElementById('requestRecoveryButton');
  const saveButton = document.getElementById('saveRecoveryPasswordButton');
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const origin = params.get('origen') === 'admin' ? 'admin' : 'socio';
  back.href = origin === 'admin' ? 'login.html' : 'socios.html';

  const show = (text, error = false) => {
    message.textContent = text;
    message.classList.toggle('auth-error', error);
  };

  let client;
  try {
    client = await MemberAuth.client();
  } catch (err) {
    show(err.message || 'No se pudo conectar con Supabase.', true);
    return;
  }

  const recoveryInUrl =
    params.has('code') ||
    params.has('token_hash') ||
    params.get('type') === 'recovery' ||
    hash.get('type') === 'recovery' ||
    hash.has('access_token');

  async function createRecoverySession() {
    // No se acepta una sesión anterior: debe validarse el enlace recibido.
    if (hash.has('access_token') && hash.has('refresh_token')) {
      const { error } = await client.auth.setSession({
        access_token: hash.get('access_token'),
        refresh_token: hash.get('refresh_token')
      });
      if (error) throw error;
    } else if (params.has('code')) {
      const { error } = await client.auth.exchangeCodeForSession(params.get('code'));
      if (error) throw error;
    } else if (params.has('token_hash')) {
      const { error } = await client.auth.verifyOtp({
        token_hash: params.get('token_hash'),
        type: 'recovery'
      });
      if (error) throw error;
    } else {
      throw new Error('El enlace no contiene una sesión de recuperación.');
    }

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('No se pudo iniciar la recuperación.');
    history.replaceState({}, document.title, `recuperar-clave.html?origen=${origin}`);
    return true;
  }

  function openPasswordForm() {
    requestForm.hidden = true;
    passwordForm.hidden = false;
    title.textContent = 'Crear nueva contraseña';
    intro.textContent = 'Escribe y confirma tu nueva contraseña.';
    MemberAuth.bindPasswordUI('recoveryPassword', 'recoveryPasswordConfirm', 'saveRecoveryPasswordButton');
    MemberAuth.bindPasswordToggles();
    show('Enlace verificado. Ya puedes crear tu nueva contraseña.');
  }

  if (recoveryInUrl) {
    requestForm.hidden = true;
    show('Comprobando el enlace de recuperación…');
    try {
      await createRecoverySession();
      openPasswordForm();
    } catch (err) {
      requestForm.hidden = false;
      show('El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.', true);
    }
  }

  requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    requestButton.disabled = true;
    show('Enviando enlace…');
    try {
      const redirect = new URL('recuperar-clave.html', location.href);
      redirect.searchParams.set('origen', origin);
      const { error } = await client.auth.resetPasswordForEmail(
        document.getElementById('recoveryEmail').value.trim(),
        { redirectTo: redirect.href }
      );
      if (error) throw error;
      show('Correo enviado. Abre únicamente el último enlace recibido.');
      requestForm.reset();
    } catch (err) {
      const detail = String(err?.message || '');
      show(detail.toLowerCase().includes('rate limit')
        ? 'Has solicitado demasiados correos. Espera unos minutos y vuelve a intentarlo.'
        : 'No se pudo enviar el correo de recuperación.', true);
    } finally {
      requestButton.disabled = false;
    }
  });

  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('recoveryPassword').value;
    const confirm = document.getElementById('recoveryPasswordConfirm').value;
    const status = MemberAuth.passwordStatus(password, confirm);
    if (!status.valid) return show('La contraseña no cumple todos los requisitos.', true);
    saveButton.disabled = true;
    show('Guardando contraseña…');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      show('Contraseña actualizada correctamente. Volviendo al acceso…');
      setTimeout(() => location.replace(origin === 'admin' ? 'login.html' : 'socios.html'), 1200);
    } catch (err) {
      show('No se pudo guardar la contraseña. Solicita un enlace nuevo.', true);
      saveButton.disabled = false;
    }
  });
});
