(() => {
  "use strict";

  const SESSION_KEY = "frente_admin_auth_session_v2";
  let client = null;

  function writeMirror(profile) {
    const safe = {
      id: profile.id || profile.user_id,
      nombre: profile.nombre || profile.full_name || profile.email || "Usuario",
      email: profile.email || "",
      rol: profile.rol || profile.role || "editor",
      activo: profile.activo !== false,
      provider: "supabase"
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return safe;
  }

  function clearMirror() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getAuthSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  async function ensureClient() {
    if (client) return client;
    const result = await window.FrenteSupabase.init();
    client = result.client;
    return client;
  }

  async function syncInitialAdminProfile() {
    const sb = await ensureClient();
    const { error } = await sb.rpc("sincronizar_perfil_administrador");

    // Compatibilidad temporal: permite abrir instalaciones que todavía no
    // han ejecutado el SQL del Commit 6. El README explica cómo instalarlo.
    if (error && !["42883", "PGRST202"].includes(error.code)) {
      throw error;
    }
  }

  async function getProfile(user) {
    const sb = await ensureClient();

    // Tabla histórica del proyecto.
    let response = await sb
      .from("admin_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (response.error && !["42P01", "PGRST205"].includes(response.error.code)) {
      throw response.error;
    }

    let profile = response.data;

    // Compatibilidad con una posible tabla profiles.
    if (!profile) {
      response = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!response.error) profile = response.data;
    }

    if (!profile) {
      const meta = user.user_metadata || {};
      profile = {
        user_id: user.id,
        nombre: meta.nombre || meta.full_name || user.email,
        rol: meta.rol || meta.role || null,
        activo: meta.activo !== false
      };
    }

    const rol = profile.rol || profile.role;
    if (!rol) {
      throw new Error("El usuario existe en Supabase Auth, pero no tiene un rol administrativo.");
    }
    if (profile.activo === false) {
      throw new Error("Este usuario administrativo está desactivado.");
    }

    return writeMirror({
      ...profile,
      id: user.id,
      user_id: user.id,
      email: user.email,
      rol
    });
  }

  async function loginAdmin(email, password) {
    const sb = await ensureClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase no devolvió el usuario.");

    try {
      await syncInitialAdminProfile();
      return await getProfile(data.user);
    } catch (error) {
      await sb.auth.signOut();
      clearMirror();
      throw error;
    }
  }

  async function restoreAuthSession() {
    const sb = await ensureClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    if (!data.session?.user) {
      clearMirror();
      return null;
    }

    await syncInitialAdminProfile();
    return getProfile(data.session.user);
  }

  async function logoutAdmin() {
    try {
      const sb = await ensureClient();
      await sb.auth.signOut();
    } finally {
      clearMirror();
    }
  }

  function currentRole() {
    const session = getAuthSession();
    return session ? window.FRENTE_ROLES?.[session.rol] : null;
  }

  function hasPermission(permission) {
    const role = currentRole();
    if (!role) return false;
    return role.permisos.includes("*") || role.permisos.includes(permission);
  }

  function redirectToLogin() {
    const next = encodeURIComponent(location.pathname.split("/").pop() || "admin.html");
    location.replace(`login.html?next=${next}`);
  }

  function protectAdminPage(permission = "dashboard") {
    const session = getAuthSession();
    if (!session) {
      redirectToLogin();
      return false;
    }
    if (!hasPermission(permission)) {
      location.replace("sin-permiso.html");
      return false;
    }
    return true;
  }

  function applyPermissionUI() {
    const session = getAuthSession();
    document.querySelectorAll("[data-permission]").forEach(el => {
      if (!hasPermission(el.dataset.permission)) el.remove();
    });
    document.querySelectorAll("[data-auth-name]").forEach(el => {
      el.textContent = session?.nombre || "";
    });
    document.querySelectorAll("[data-auth-role]").forEach(el => {
      el.textContent = window.FRENTE_ROLES?.[session?.rol]?.nombre || "";
    });
  }

  Object.assign(window, {
    getAuthSession,
    loginAdmin,
    restoreAuthSession,
    logoutAdmin,
    currentRole,
    hasPermission,
    redirectToLogin,
    protectAdminPage,
    applyPermissionUI,
    clearAuthSession: clearMirror
  });

  document.addEventListener("DOMContentLoaded", () => {
    applyPermissionUI();

    document.querySelectorAll("[data-auth-logout]").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await logoutAdmin();
        } finally {
          location.replace("login.html");
        }
      });
    });
  });
})();