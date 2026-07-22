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
    params.get('type') === 'recovery' ||
    location.hash.includes('type=recovery') ||
    location.hash.includes('access_token=');

  async function hasRecoverySession() {
    if (params.has('code')) {
      const { error } = await client.auth.exchangeCodeForSession(params.get('code'));
      if (error && !/already|expired/i.test(error.message || '')) throw error;
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return Boolean(data.session);
  }

  async function openPasswordForm() {
    requestForm.hidden = true;
    passwordForm.hidden = false;
    title.textContent = 'Crear nueva contraseña';
    intro.textContent = 'Escribe y confirma tu nueva contraseña.';
    MemberAuth.bindPasswordUI('recoveryPassword', 'recoveryPasswordConfirm', 'saveRecoveryPasswordButton');
    MemberAuth.bindPasswordToggles();
    show('Enlace verificado. Ya puedes crear tu nueva contraseña.');
  }

  if (recoveryInUrl) {
    try {
      if (await hasRecoverySession()) await openPasswordForm();
      else throw new Error('El enlace no ha creado una sesión válida.');
    } catch (err) {
      show('El enlace ha caducado o no es válido. Solicita uno nuevo.', true);
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) openPasswordForm();
  });

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
      show('Correo enviado. Abre el enlace recibido para crear la contraseña nueva.');
      requestForm.reset();
    } catch (err) {
      show(err.message || 'No se pudo enviar el correo.', true);
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
      const { data: userData } = await client.auth.getUser();
      let destination = origin === 'admin' ? 'login.html' : 'socios.html';
      if (userData.user) {
        const { data: admin } = await client.from('admin_profiles').select('user_id, activo').eq('user_id', userData.user.id).maybeSingle();
        if (admin && admin.activo !== false) destination = 'login.html';
      }
      await client.auth.signOut();
      show('Contraseña actualizada correctamente. Volviendo al acceso…');
      setTimeout(() => location.replace(destination), 1200);
    } catch (err) {
      show(err.message || 'No se pudo guardar la contraseña.', true);
      saveButton.disabled = false;
    }
  });
});
