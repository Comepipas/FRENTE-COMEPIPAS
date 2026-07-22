(() => {
  "use strict";

  const SESSION_KEY = "frente_admin_auth_session_v2";

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  function roleDefinition(role) {
    return window.FRENTE_ROLES?.[role] || null;
  }

  window.getAuthSession = readSession;

  window.currentRole = function currentRole() {
    const session = readSession();
    return session ? roleDefinition(session.rol) : null;
  };

  window.hasPermission = function hasPermission(permission) {
    const role = window.currentRole();
    if (!role) return false;
    return role.permisos.includes("*") || role.permisos.includes(permission);
  };

  window.redirectToLogin = function redirectToLogin() {
    const next = encodeURIComponent(location.pathname.split("/").pop() || "admin.html");
    location.replace(`login.html?next=${next}`);
  };

  window.protectAdminPage = function protectAdminPage(permission = "dashboard") {
    const session = readSession();
    if (!session) {
      window.redirectToLogin();
      return false;
    }
    if (!window.hasPermission(permission)) {
      location.replace("sin-permiso.html");
      return false;
    }
    return true;
  };
})();