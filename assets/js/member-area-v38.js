(() => {
  'use strict';

  const VALID_TABS = new Set([
    'overview', 'trips', 'tickets', 'renewal', 'fees', 'purchases',
    'documents', 'notifications', 'agenda', 'material'
  ]);

  const TAB_TITLES = {
    overview: 'Mi familia y datos',
    trips: 'ON TOUR',
    tickets: 'Entradas',
    renewal: 'Mi pago registrado',
    fees: 'Mis cuotas',
    purchases: 'Mis compras',
    documents: 'Documentos',
    notifications: 'Notificaciones',
    agenda: 'Agenda',
    material: 'Material de la Peña'
  };

  const fmtDate = value => value
    ? new Intl.DateTimeFormat('es-ES').format(new Date(`${value}T12:00:00`))
    : '—';

  const euro = value => Number.isFinite(Number(value))
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value))
    : '—';

  const set = (id, value) => {
    document.querySelectorAll(`#${id}`).forEach(element => {
      element.textContent = value ?? '—';
    });
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const labelRelation = value => ({
    padre: 'Padre', madre: 'Madre', tutor_legal: 'Tutor legal'
  })[value] || 'Tutor/a';

  let currentProfile = null;
  let activeTab = 'home';
  let lastTrigger = null;

  function setLoading(isLoading) {
    document.body.classList.toggle('member-area-loading', isLoading);
    document.querySelector('.member-area-page')?.setAttribute('aria-busy', String(isLoading));
  }

  function friendlyError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    if (message.includes('network') || message.includes('fetch')) return 'No hay conexión con el servidor. Comprueba Internet y vuelve a intentarlo.';
    if (message.includes('jwt') || message.includes('session')) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
    return error?.message || 'Se ha producido un error inesperado.';
  }

  function normalizeTab(tab) {
    if (!tab || tab === 'home') return 'home';
    return VALID_TABS.has(tab) ? tab : 'home';
  }

  function tabFromHash() {
    const raw = window.location.hash.replace(/^#/, '').trim();
    return normalizeTab(raw);
  }

  function setHash(tab, replace = false) {
    const target = tab === 'home'
      ? `${window.location.pathname}${window.location.search}`
      : `${window.location.pathname}${window.location.search}#${tab}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ memberTab: tab }, '', target);
  }

  async function loadFamily() {
    const section = document.getElementById('memberFamilySection');
    const list = document.getElementById('memberFamilyList');
    if (!section || !list) return;

    try {
      const client = await MemberAuth.client();
      const { data, error } = await client.rpc('my_linked_minors');
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        section.hidden = true;
        return;
      }

      section.hidden = false;
      list.innerHTML = rows.map(item => `
        <article class="member-family-item">
          <div>
            <strong>${escapeHtml([item.nombre, item.apellidos].filter(Boolean).join(' '))}</strong>
            <small>${escapeHtml(labelRelation(item.parentesco))} · ${escapeHtml(item.categoria || 'Menor')}</small>
            <p class="member-family-note">Perfil vinculado a tu cuenta.</p>
          </div>
          <div>
            <span>${item.numero_socio ? `Socio nº ${escapeHtml(String(item.numero_socio).padStart(3, '0'))}` : 'Número pendiente'}</span>
            <strong>${item.cuota_al_dia ? 'Al día' : 'Pendiente'}</strong>
          </div>
        </article>
      `).join('');
    } catch (error) {
      console.warn('[Commit 38.5] Menores vinculados:', error.message || error);
      section.hidden = true;
    }
  }

  function seasonLabel(record) {
    return String(record.campanas?.temporada || record.temporada || '').trim() || 'Sin temporada';
  }

  async function loadCampaignRecords(profile) {
    const client = await MemberAuth.client();
    const { data, error } = await client
      .from('campanas_registros')
      .select('importe_pagado,precio_abono,cuota_final,forma_pago,estado,zona_club,fecha_pago,created_at,campanas(temporada)')
      .eq('socio_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function renderFees(rows) {
    const body = document.getElementById('memberFeesBody');
    if (!body) return;
    const withFee = rows.filter(r => r.cuota_final != null || r.importe_pagado != null);
    body.innerHTML = withFee.length ? withFee.map(record => `
      <tr>
        <td>${escapeHtml(seasonLabel(record))}</td>
        <td>${record.cuota_final != null ? euro(record.cuota_final) : 'No desglosada'}</td>
        <td>${escapeHtml(String(record.estado || 'Registrado').replaceAll('_', ' '))}</td>
        <td>${escapeHtml(fmtDate(String(record.fecha_pago || record.created_at || '').slice(0, 10)))}</td>
      </tr>`).join('') : '<tr><td colspan="4">Todavía no hay cuotas importadas y vinculadas a tu ficha.</td></tr>';
  }

  async function loadRealPayment(profile) {
    const box = document.getElementById('memberRealPayment');
    const empty = document.getElementById('memberNoRealPayment');
    try {
      const rows = await loadCampaignRecords(profile);
      renderFees(rows);
      const record = rows.find(item => {
        const season = seasonLabel(item).toLowerCase();
        return season === '2026/27' || season === '26/27' || season.includes('2026-2027');
      });
      if (!record) {
        set('renewalStatus', 'Sin registro'); set('memberRenewalSummary', 'Pendiente de sincronización');
        set('memberFeeSummary', rows.length ? 'Consulta tu historial' : 'Sin cuotas sincronizadas');
        if (box) box.hidden = true; if (empty) empty.hidden = false; return;
      }
      set('realSeasonTicket', record.precio_abono != null ? euro(record.precio_abono) : 'No desglosado');
      set('realPeñaFee', record.cuota_final != null ? euro(record.cuota_final) : 'No desglosada');
      set('realPaidTotal', record.importe_pagado != null ? euro(record.importe_pagado) : 'No disponible');
      set('realPaymentMethod', record.forma_pago || 'No indicada');
      set('realPaymentStatus', record.estado || 'Registrado');
      set('realPaymentSector', record.zona_club || profile.sector || 'No indicado');
      set('renewalStatus', String(record.estado || 'Registrado').replaceAll('_', ' '));
      set('memberRenewalSummary', record.importe_pagado != null ? `${euro(record.importe_pagado)} registrado` : 'Registro encontrado');
      set('memberFeeSummary', record.cuota_final != null ? `${euro(record.cuota_final)} · ${String(record.estado || 'registrada').replaceAll('_',' ')}` : 'Cuota incluida en el registro');
      set('memberFee', record.estado === 'pagado' ? 'Al día' : String(record.estado || 'Registrada').replaceAll('_',' '));
      if (box) box.hidden = false; if (empty) empty.hidden = true;
    } catch (error) {
      console.warn('[Commit 38.5] Pago y cuotas no disponibles:', error.message || error);
      renderFees([]); set('renewalStatus', 'No disponible'); set('memberRenewalSummary', 'Pendiente de sincronización'); set('memberFeeSummary', 'No se pudo consultar');
      if (box) box.hidden = true; if (empty) empty.hidden = false;
    }
  }

  async function load() {
    const status = document.getElementById('memberAreaStatus');

    try {
      const session = await MemberAuth.session();
      if (!session) {
        window.location.replace('socios.html');
        return;
      }

      const profile = await MemberAuth.profile();
      if (!profile) {
        await MemberAuth.signOut();
        window.location.replace('activar-cuenta.html');
        return;
      }

      currentProfile = profile;
      const fullName = [profile.nombre, profile.apellidos].filter(Boolean).join(' ');

      set('memberName', fullName);
      set('memberFirstName', profile.nombre || 'socio');
      set('memberNumber', profile.numero_socio
        ? `Socio nº ${String(profile.numero_socio).padStart(3, '0')}`
        : 'Número de socio pendiente');
      set('memberStatus', profile.estado || 'Activo');
      set('memberType', profile.categoria || 'Sin categoría');
      set('memberFee', profile.cuota_al_dia ? 'Al día' : 'Pendiente');
      set('memberFeeSummary', profile.cuota_al_dia ? 'Todo al día' : 'Tienes una cuota pendiente');
      set('memberMainNotice', profile.cuota_al_dia ? 'Tu ficha está al día' : 'Tienes una gestión pendiente');
      set('memberMainNoticeMeta', profile.cuota_al_dia ? 'Consulta avisos y novedades de la Peña' : 'Revisa tus cuotas y comunicaciones');
      set('memberEmail', profile.email);
      set('memberPhone', profile.telefono);
      set('memberAddress', profile.direccion);
      set('memberSince', fmtDate(profile.fecha_alta));
      set('memberBirthDate', fmtDate(profile.fecha_nacimiento));
      set('memberAge', profile.edad_actual != null ? `${profile.edad_actual} años` : '—');

      const photo = profile.foto_url || 'assets/images/socios/socio-demo.jpg';
      ['memberPhoto', 'memberCardPhoto'].forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.src = photo;
        element.addEventListener('error', () => {
          element.src = 'assets/images/socios/socio-demo.jpg';
        }, { once: true });
      });

      const form = document.getElementById('memberContactForm');
      if (form) {
        form.telefono.value = profile.telefono || '';
        form.direccion.value = profile.direccion || '';
        if (!form.dataset.bound) {
          form.dataset.bound = 'true';
          form.addEventListener('submit', async event => {
            event.preventDefault();
            const output = document.getElementById('memberContactMessage');
            const submit = form.querySelector('[type="submit"]');
            const telefono = form.telefono.value.trim();
            const direccion = form.direccion.value.trim();
            if (telefono && !/^[+()0-9 .-]{7,20}$/.test(telefono)) {
              if (output) output.textContent = 'Revisa el formato del teléfono.';
              form.telefono.focus();
              return;
            }
            if (output) output.textContent = 'Guardando…';
            if (submit) submit.disabled = true;
            try {
              const updated = await MemberAuth.updateContact({ telefono, direccion });
              set('memberPhone', updated.telefono || '—');
              set('memberAddress', updated.direccion || '—');
              if (output) output.textContent = 'Datos de contacto actualizados correctamente.';
            } catch (error) {
              if (output) output.textContent = friendlyError(error);
            } finally {
              if (submit) submit.disabled = false;
            }
          });
        }
      }

      await Promise.allSettled([loadFamily(), loadRealPayment(profile)]);
      status?.remove();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      if (status) status.textContent = `No se pudo cargar el área privada: ${friendlyError(error)}`;
    }
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const drawer = document.getElementById('webMenuDrawer');
    const button = document.getElementById('webMenuButton');
    drawer?.setAttribute('hidden', '');
    drawer?.setAttribute('aria-hidden', 'true');
    button?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (restoreFocus) button?.focus();
  }

  function openMenu() {
    const drawer = document.getElementById('webMenuDrawer');
    const button = document.getElementById('webMenuButton');
    drawer?.removeAttribute('hidden');
    drawer?.setAttribute('aria-hidden', 'false');
    button?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    requestAnimationFrame(() => drawer?.querySelector('[data-close-web-menu]')?.focus());
  }

  function focusWorkspace() {
    const toolbar = document.getElementById('memberWorkspaceBar');
    if (!toolbar) return;
    toolbar.setAttribute('tabindex', '-1');
    toolbar.focus({ preventScroll: true });
  }

  function openTab(requestedTab, options = {}) {
    const tab = normalizeTab(requestedTab);
    const isHome = tab === 'home';
    const main = document.querySelector('.member-main');
    const toolbar = document.getElementById('memberWorkspaceBar');
    const title = document.getElementById('memberWorkspaceTitle');

    activeTab = tab;

    document.querySelectorAll('[data-member-panel]').forEach(panel => {
      const selected = !isHome && panel.dataset.memberPanel === tab;
      panel.classList.toggle('active', selected);
      panel.hidden = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
    });

    document.querySelectorAll('[data-open-member-tab], [data-menu-tab]').forEach(control => {
      const controlTab = control.dataset.openMemberTab || control.dataset.menuTab;
      const selected = (isHome && controlTab === 'home') || (!isHome && controlTab === tab);
      control.classList.toggle('active', selected);
      if (selected) control.setAttribute('aria-current', 'page');
      else control.removeAttribute('aria-current');
    });

    main?.classList.toggle('module-open', !isHome);
    if (toolbar) toolbar.hidden = isHome;
    if (title && !isHome) title.textContent = TAB_TITLES[tab] || 'Área del socio';

    closeMenu();

    if (options.updateHistory !== false) setHash(tab, Boolean(options.replaceHistory));

    const target = isHome
      ? document.querySelector('.member-action-summary')
      : document.getElementById('memberWorkspaceBar');

    if (target && options.position !== false) {
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 10);
      window.scrollTo({ top, behavior: options.instant ? 'auto' : 'smooth' });
    }

    if (!isHome && options.focus !== false) requestAnimationFrame(focusWorkspace);
    if (isHome && options.focus !== false && lastTrigger) requestAnimationFrame(() => lastTrigger.focus());
  }

  async function logout() {
    await MemberAuth.signOut();
    window.location.href = 'socios.html';
  }

  function activateControl(control) {
    const tab = control.dataset.openMemberTab || control.dataset.menuTab;
    if (!tab) return;
    lastTrigger = control.matches('[data-open-member-tab]') ? control : lastTrigger;
    openTab(tab);
  }

  function prepareControls() {
    document.querySelectorAll('[data-open-member-tab]').forEach(control => {
      control.setAttribute('role', 'button');
      control.setAttribute('tabindex', '0');
      control.setAttribute('aria-label', `Abrir ${TAB_TITLES[control.dataset.openMemberTab] || 'sección'}`);
    });

    document.querySelectorAll('[data-member-panel]').forEach(panel => {
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    prepareControls();
    load();

    document.getElementById('webMenuButton')?.setAttribute('aria-expanded', 'false');
    document.getElementById('webMenuDrawer')?.setAttribute('aria-hidden', 'true');

    document.addEventListener('click', event => {
      const control = event.target.closest('[data-open-member-tab], [data-menu-tab]');
      if (control) {
        event.preventDefault();
        activateControl(control);
        return;
      }

      if (event.target.closest('[data-close-web-menu]')) closeMenu({ restoreFocus: true });
    });

    document.addEventListener('keydown', event => {
      const control = event.target.closest('[data-open-member-tab]');
      if (control && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activateControl(control);
        return;
      }

      if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
        const drawer = document.getElementById('webMenuDrawer');
        const focusables = [...(drawer?.querySelectorAll('button:not([disabled]), a[href]') || [])]
          .filter(element => !element.hasAttribute('hidden'));
        if (focusables.length) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }
      }

      if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
        closeMenu({ restoreFocus: true });
      }
    });

    document.getElementById('webMenuButton')?.addEventListener('click', openMenu);
    document.getElementById('memberOpenWebMenu')?.addEventListener('click', openMenu);
    document.getElementById('memberBackHome')?.addEventListener('click', () => openTab('home'));

    ['memberLogout', 'memberLogoutMore', 'memberLogoutDrawer'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', logout);
    });

    window.addEventListener('popstate', () => {
      openTab(tabFromHash(), { updateHistory: false, instant: true, focus: false });
    });

    const initialTab = tabFromHash();
    openTab(initialTab, {
      updateHistory: false,
      instant: true,
      focus: false,
      position: initialTab !== 'home'
    });
  });
})();
